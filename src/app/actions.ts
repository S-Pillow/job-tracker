'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import type { NewTerminationFormData, NewSimpleTaskFormData, TaskType } from '@/lib/types';

export async function updateStepStatus(
  stepId: string,
  status: 'COMPLETE' | 'NOT_STARTED',
) {
  await prisma.step.update({
    where: { id: stepId },
    data: { status },
  });
  revalidatePath('/');
}

export async function createTerminationTask(data: NewTerminationFormData) {
  const template = await prisma.template.findFirst({
    where: { taskType: 'TERMINATION', isDefault: true },
    include: { steps: { orderBy: { order: 'asc' } } },
  });

  if (!template) {
    throw new Error('No default TERMINATION template found. Run db:seed first.');
  }

  await prisma.task.create({
    data: {
      taskType: 'TERMINATION',
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

  revalidatePath('/');
}

export async function createSimpleTask(
  taskType: TaskType,
  data: NewSimpleTaskFormData,
) {
  await prisma.task.create({
    data: {
      taskType,
      registrarName: data.registrarName,
      ianaId: data.ianaId,
      caseNumber: data.caseNumber,
      hasGatewayCnTw: false,
    },
  });

  revalidatePath('/');
}

export async function deleteTask(taskId: string) {
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath('/');
}
