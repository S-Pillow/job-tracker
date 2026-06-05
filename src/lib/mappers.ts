import type { TaskData } from './types';

type RawTask = {
  id: string;
  createdAt: Date;
  completedAt: Date | null;
  taskType: string;
  registrarName: string;
  ianaId: string;
  caseNumber: string;
  terminationType: string | null;
  terminationEffectiveDate: Date | null;
  gainingRegistrarName: string | null;
  gainingRegistrarIanaId: string | null;
  icannNoticeDate: Date | null;
  hasGatewayCnTw: boolean;
  createdBy: string | null;
  oldRegistrarName: string | null;
  newRegistrarName: string | null;
  steps: Array<{
    id: string;
    order: number;
    title: string;
    description: string | null;
    status: string;
    isConditional: boolean;
    isGate: boolean;
    isStopWarning: boolean;
    notes: string | null;
    blockedReason: string | null;
  }>;
};

export function mapTaskData(t: RawTask): TaskData {
  return {
    id: t.id,
    createdAt: t.createdAt,
    completedAt: t.completedAt ?? null,
    taskType: t.taskType as TaskData['taskType'],
    registrarName: t.registrarName,
    ianaId: t.ianaId,
    caseNumber: t.caseNumber,
    terminationType: t.terminationType,
    terminationEffectiveDate: t.terminationEffectiveDate,
    gainingRegistrarName: t.gainingRegistrarName,
    gainingRegistrarIanaId: t.gainingRegistrarIanaId,
    icannNoticeDate: t.icannNoticeDate,
    hasGatewayCnTw: t.hasGatewayCnTw,
    createdBy: t.createdBy,
    oldRegistrarName: t.oldRegistrarName,
    newRegistrarName: t.newRegistrarName,
    steps: t.steps.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      description: s.description ?? null,
      status: s.status as TaskData['steps'][number]['status'],
      isConditional: Boolean(s.isConditional),
      isGate: Boolean(s.isGate),
      isStopWarning: Boolean(s.isStopWarning),
      notes: s.notes,
      blockedReason: s.blockedReason,
    })),
  };
}

export const STEPS_INCLUDE = {
  steps: { orderBy: { order: 'asc' as const } },
};
