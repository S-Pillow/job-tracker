'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { terminationTaskSchema, simpleTaskSchema } from '@/lib/validation';
import { mapTaskData, STEPS_INCLUDE } from '@/lib/mappers';
import type { NewTerminationFormData, NewSimpleTaskFormData, TaskData, TaskType } from '@/lib/types';

const COMPLETED_PAGE_SIZE = 50;

// ─── Status derivation ───────────────────────────────────────────────────────

type StepForStatus = { status: string; isGate: boolean; order: number };

function deriveTaskStatus(
  steps: StepForStatus[],
): 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING_FOR_CONFIRMATION' | 'COMPLETED' {
  const activeSteps = steps.filter((s) => s.status !== 'NA');
  if (activeSteps.length === 0) return 'NOT_STARTED';
  if (activeSteps.every((s) => s.status === 'COMPLETE')) return 'COMPLETED';

  const firstIncomplete = [...activeSteps]
    .sort((a, b) => a.order - b.order)
    .find((s) => s.status !== 'COMPLETE');

  if (firstIncomplete?.isGate) return 'WAITING_FOR_CONFIRMATION';
  if (activeSteps.some((s) => s.status === 'COMPLETE')) return 'IN_PROGRESS';

  return 'NOT_STARTED';
}

// ─── Unique constraint helper ────────────────────────────────────────────────

function isDuplicateCaseNumber(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('unique constraint') ||
      msg.includes('unique violation') ||
      (err as { code?: string }).code === 'P2002'
    );
  }
  return false;
}

// ─── A3: Audit log helper ────────────────────────────────────────────────────

async function writeAuditLog(entry: {
  action: string;
  taskId?: string | null;
  stepId?: string | null;
  caseNumber?: string | null;
  registrarName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
}) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await prisma.$executeRaw`
      INSERT INTO "AuditLog" ("id","createdAt","action","taskId","stepId","caseNumber","registrarName","oldValue","newValue","note")
      VALUES (
        ${id}, ${now}, ${entry.action},
        ${entry.taskId ?? null}, ${entry.stepId ?? null},
        ${entry.caseNumber ?? null}, ${entry.registrarName ?? null},
        ${entry.oldValue ?? null}, ${entry.newValue ?? null},
        ${entry.note ?? null}
      )
    `;
  } catch {
    // Audit log failures are non-fatal — log to stderr but never block the user action
    console.error('[AuditLog] write failed for action:', entry.action);
  }
}

// ─── Step status update (A1 guard + A3 audit + P5 transaction) ───────────────

export async function updateStepStatus(
  stepId: string,
  status: 'COMPLETE' | 'NOT_STARTED',
) {
  let auditTaskId = '';
  let auditCaseNumber = '';
  let auditRegistrarName = '';
  let auditOldStatus = '';

  await prisma.$transaction(async (tx) => {
    // Fetch step and parent task together so we can check completedAt (A1 guard)
    const stepWithTask = await tx.step.findUnique({
      where: { id: stepId },
      select: {
        taskId: true,
        status: true,
        task: { select: { completedAt: true, caseNumber: true, registrarName: true } },
      },
    });

    if (!stepWithTask) throw new Error('Step not found.');

    // A1: Block step changes on completed tasks
    if (stepWithTask.task.completedAt) {
      throw new Error(
        'This case is already complete. Use "Reopen Case" to make changes.',
      );
    }

    auditTaskId = stepWithTask.taskId;
    auditCaseNumber = stepWithTask.task.caseNumber;
    auditRegistrarName = stepWithTask.task.registrarName;
    auditOldStatus = stepWithTask.status;

    // Update step + its completedAt timestamp
    await tx.step.update({
      where: { id: stepId },
      data: {
        status,
        completedAt: status === 'COMPLETE' ? new Date() : null,
      },
    });

    // Re-read all siblings to derive task-level status
    const allSteps = await tx.step.findMany({
      where: { taskId: stepWithTask.taskId },
      select: { status: true, isGate: true, order: true },
    });

    const activeSteps = allSteps.filter((s) => s.status !== 'NA');
    const isNowComplete =
      activeSteps.length > 0 && activeSteps.every((s) => s.status === 'COMPLETE');

    const taskStatus = deriveTaskStatus(allSteps);

    await tx.task.update({
      where: { id: stepWithTask.taskId },
      data: {
        status: taskStatus,
        completedAt: isNowComplete ? new Date() : null,
      },
    });
  });

  // A3: Write audit log after transaction commits
  if (auditTaskId) {
    const action = status === 'COMPLETE' ? 'STEP_COMPLETED' : 'STEP_REVERTED';
    await writeAuditLog({
      action,
      taskId: auditTaskId,
      stepId,
      caseNumber: auditCaseNumber,
      registrarName: auditRegistrarName,
      oldValue: auditOldStatus,
      newValue: status,
    });
  }

  revalidatePath('/');
}

// ─── Fetch completed tasks (P7/P8: lazy-loaded with pagination) ──────────────

export async function getCompletedTasks(
  offset: number = 0,
): Promise<{ tasks: TaskData[]; hasMore: boolean; total: number }> {
  const [raw, total] = await Promise.all([
    prisma.task.findMany({
      where: { NOT: { completedAt: null } },
      include: STEPS_INCLUDE,
      orderBy: { completedAt: 'desc' },
      take: COMPLETED_PAGE_SIZE + 1,
      skip: offset,
    }),
    prisma.task.count({ where: { NOT: { completedAt: null } } }),
  ]);

  const hasMore = raw.length > COMPLETED_PAGE_SIZE;
  const tasks = raw.slice(0, COMPLETED_PAGE_SIZE).map(mapTaskData);

  return { tasks, hasMore, total };
}

// ─── Create termination task ─────────────────────────────────────────────────

export async function createTerminationTask(data: NewTerminationFormData) {
  terminationTaskSchema.parse(data);

  const template = await prisma.template.findFirst({
    where: { taskType: 'TERMINATION', isDefault: true },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    throw new Error('No default TERMINATION template found. Run db:seed first.');
  }

  let newTaskId: string | null = null;

  try {
    const newTask = await prisma.task.create({
      data: {
        taskType: 'TERMINATION',
        status: 'NOT_STARTED',
        registrarName: data.registrarName,
        ianaId: data.ianaId,
        caseNumber: data.caseNumber,
        createdBy: (data as any).createdBy || null,
        terminationType: data.terminationType || null,
        terminationEffectiveDate: data.terminationEffectiveDate
          ? new Date(data.terminationEffectiveDate)
          : null,
        gainingRegistrarName: data.gainingRegistrarName || null,
        gainingRegistrarIanaId: data.gainingRegistrarIanaId || null,
        icannNoticeDate: data.icannNoticeDate
          ? new Date(data.icannNoticeDate)
          : null,
        hasGatewayCnTw: data.hasGatewayCnTw,
        templateId: template.id,
        steps: {
          create: template.steps.map((s) => ({
            order: s.order,
            title: s.title,
            description: s.description ?? null,
            isConditional: s.isConditional,
            isGate: s.isGate,
            isStopWarning: s.isStopWarning,
            status: 'NOT_STARTED' as const,
          })),
        },
      },
      select: { id: true },
    });
    newTaskId = newTask.id;
  } catch (err) {
    if (isDuplicateCaseNumber(err)) {
      throw new Error('A case with this case number already exists.');
    }
    throw err;
  }

  // A3: Audit log
  await writeAuditLog({
    action: 'TASK_CREATED',
    taskId: newTaskId,
    caseNumber: data.caseNumber,
    registrarName: data.registrarName,
    note: (data as any).createdBy ? `Created by ${(data as any).createdBy}` : null,
  });

  revalidatePath('/');
}

// ─── Create simple task (Name Change / Assignment) ───────────────────────────

export async function createSimpleTask(
  taskType: TaskType,
  data: NewSimpleTaskFormData,
) {
  simpleTaskSchema.parse(data);

  let newTaskId: string | null = null;

  try {
    const newTask = await prisma.task.create({
      data: {
        taskType,
        status: 'NOT_STARTED',
        registrarName: data.registrarName,
        ianaId: data.ianaId,
        caseNumber: data.caseNumber,
        createdBy: (data as any).createdBy || null,
        hasGatewayCnTw: false,
      },
      select: { id: true },
    });
    newTaskId = newTask.id;
  } catch (err) {
    if (isDuplicateCaseNumber(err)) {
      throw new Error('A case with this case number already exists.');
    }
    throw err;
  }

  await writeAuditLog({
    action: 'TASK_CREATED',
    taskId: newTaskId,
    caseNumber: data.caseNumber,
    registrarName: data.registrarName,
    note: (data as any).createdBy ? `Created by ${(data as any).createdBy}` : null,
  });

  revalidatePath('/');
}

// ─── Close step-less task ────────────────────────────────────────────────────

export async function closeTask(taskId: string) {
  const stepCount = await prisma.step.count({ where: { taskId } });
  if (stepCount > 0) {
    throw new Error(
      'closeTask can only be used on tasks with no steps. Use step completion to close tasks with steps.',
    );
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    select: { caseNumber: true, registrarName: true },
  });

  await writeAuditLog({
    action: 'TASK_CLOSED',
    taskId,
    caseNumber: task.caseNumber,
    registrarName: task.registrarName,
  });

  revalidatePath('/');
}

// ─── A4: Reopen a completed task ─────────────────────────────────────────────

export async function reopenTask(taskId: string) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { completedAt: true, caseNumber: true, registrarName: true },
  });

  if (!existing) throw new Error('Task not found.');
  if (!existing.completedAt) throw new Error('This case is not marked as complete.');

  await prisma.task.update({
    where: { id: taskId },
    data: {
      completedAt: null,
      status: 'IN_PROGRESS', // Explicitly set — avoid re-deriving to COMPLETED
    },
  });

  await writeAuditLog({
    action: 'TASK_REOPENED',
    taskId,
    caseNumber: existing.caseNumber,
    registrarName: existing.registrarName,
  });

  revalidatePath('/');
}

// ─── A2: Delete task (guards against completed case deletion) ─────────────────

export async function deleteTask(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { completedAt: true, caseNumber: true, registrarName: true, taskType: true },
  });

  if (!task) return; // Already deleted

  // A2: Block deletion of completed cases
  if (task.completedAt) {
    throw new Error(
      'Completed cases cannot be deleted. Reopen the case first if you need to remove it.',
    );
  }

  // A3: Write audit log before deletion (so we preserve the identifiers)
  await writeAuditLog({
    action: 'TASK_DELETED',
    taskId,
    caseNumber: task.caseNumber,
    registrarName: task.registrarName,
    note: `taskType=${task.taskType}`,
  });

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/');
}
