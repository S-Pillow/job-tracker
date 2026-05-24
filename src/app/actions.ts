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

// ─── Unique constraint error helper ─────────────────────────────────────────

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

// ─── Step status update (P5: wrapped in transaction) ─────────────────────────

export async function updateStepStatus(
  stepId: string,
  status: 'COMPLETE' | 'NOT_STARTED',
) {
  await prisma.$transaction(async (tx) => {
    // Update step + its own completedAt in one write
    const step = await tx.step.update({
      where: { id: stepId },
      data: {
        status,
        completedAt: status === 'COMPLETE' ? new Date() : null,
      },
      select: { taskId: true },
    });

    // Read all sibling steps to derive the task-level status
    const allSteps = await tx.step.findMany({
      where: { taskId: step.taskId },
      select: { status: true, isGate: true, order: true },
    });

    const activeSteps = allSteps.filter((s) => s.status !== 'NA');
    const isNowComplete =
      activeSteps.length > 0 && activeSteps.every((s) => s.status === 'COMPLETE');

    const taskStatus = deriveTaskStatus(allSteps);

    await tx.task.update({
      where: { id: step.taskId },
      data: {
        status: taskStatus,
        completedAt: isNowComplete ? new Date() : null,
      },
    });
  });

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

  try {
    await prisma.task.create({
      data: {
        taskType: 'TERMINATION',
        status: 'NOT_STARTED',
        registrarName: data.registrarName,
        ianaId: data.ianaId,
        caseNumber: data.caseNumber,
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
    });
  } catch (err) {
    if (isDuplicateCaseNumber(err)) {
      throw new Error('A case with this case number already exists.');
    }
    throw err;
  }

  revalidatePath('/');
}

// ─── Create simple task (Name Change / Assignment) ───────────────────────────

export async function createSimpleTask(
  taskType: TaskType,
  data: NewSimpleTaskFormData,
) {
  simpleTaskSchema.parse(data);

  try {
    await prisma.task.create({
      data: {
        taskType,
        status: 'NOT_STARTED',
        registrarName: data.registrarName,
        ianaId: data.ianaId,
        caseNumber: data.caseNumber,
        hasGatewayCnTw: false,
      },
    });
  } catch (err) {
    if (isDuplicateCaseNumber(err)) {
      throw new Error('A case with this case number already exists.');
    }
    throw err;
  }

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

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  revalidatePath('/');
}

// ─── Delete task ─────────────────────────────────────────────────────────────

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/');
}
