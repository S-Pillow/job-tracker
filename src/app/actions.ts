'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { terminationTaskSchema, simpleTaskSchema } from '@/lib/validation';
import type { NewTerminationFormData, NewSimpleTaskFormData, TaskType } from '@/lib/types';

// ─── Status derivation ───────────────────────────────────────────────────────

type StepForStatus = { status: string; isGate: boolean; order: number };

function deriveTaskStatus(
  steps: StepForStatus[],
): 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING_FOR_CONFIRMATION' | 'COMPLETED' {
  const activeSteps = steps.filter((s) => s.status !== 'NA');
  if (activeSteps.length === 0) return 'NOT_STARTED';
  if (activeSteps.every((s) => s.status === 'COMPLETE')) return 'COMPLETED';

  // The first incomplete step by order determines the status
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

// ─── Step status update ──────────────────────────────────────────────────────

export async function updateStepStatus(
  stepId: string,
  status: 'COMPLETE' | 'NOT_STARTED',
) {
  // Update step status and its own completedAt timestamp (T4)
  const step = await prisma.step.update({
    where: { id: stepId },
    data: {
      status,
      completedAt: status === 'COMPLETE' ? new Date() : null,
    },
    select: { taskId: true },
  });

  // Fetch all steps for this task to derive task-level state (T2)
  const allSteps = await prisma.step.findMany({
    where: { taskId: step.taskId },
    select: { status: true, isGate: true, order: true },
  });

  const activeSteps = allSteps.filter((s) => s.status !== 'NA');
  const isNowComplete =
    activeSteps.length > 0 && activeSteps.every((s) => s.status === 'COMPLETE');

  const taskStatus = deriveTaskStatus(allSteps);

  await prisma.task.update({
    where: { id: step.taskId },
    data: {
      status: taskStatus,
      completedAt: isNowComplete ? new Date() : null,
    },
  });

  revalidatePath('/');
}

// ─── Create termination task ─────────────────────────────────────────────────

export async function createTerminationTask(data: NewTerminationFormData) {
  // T5: Server-side validation using shared schema
  terminationTaskSchema.parse(data);

  const template = await prisma.template.findFirst({
    where: { taskType: 'TERMINATION', isDefault: true },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    throw new Error('No default TERMINATION template found. Run db:seed first.');
  }

  // T1: Catch unique constraint violation on caseNumber
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
  // T5: Server-side validation
  simpleTaskSchema.parse(data);

  // T1: Catch unique constraint violation on caseNumber
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
  // T3: Guard — only close tasks that have no steps
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
