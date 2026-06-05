export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETE' | 'NA';

export type StepData = {
  id: string;
  order: number;
  title: string;
  description: string | null;
  status: StepStatus;
  isConditional: boolean;
  isGate: boolean;
  isStopWarning: boolean;
  notes: string | null;
  blockedReason: string | null;
};

export type TaskType = 'TERMINATION' | 'NAME_CHANGE' | 'ASSIGNMENT';

export type TaskData = {
  id: string;
  createdAt: Date;
  completedAt: Date | null;
  taskType: TaskType;
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
  steps: StepData[];
};

export type NewTerminationFormData = {
  registrarName: string;
  ianaId: string;
  caseNumber: string;
  terminationType: string;
  terminationEffectiveDate: string;
  gainingRegistrarName: string;
  gainingRegistrarIanaId: string;
  icannNoticeDate: string;
  hasGatewayCnTw: boolean;
};

export type NewSimpleTaskFormData = {
  registrarName: string;
  ianaId: string;
  caseNumber: string;
  hasGatewayCnTw?: boolean;
  createdBy?: string;
  oldRegistrarName?: string;
  newRegistrarName?: string;
};
