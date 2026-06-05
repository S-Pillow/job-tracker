import { z } from 'zod';

export const terminationTaskSchema = z.object({
  registrarName: z.string().min(1, 'Registrar name is required'),
  ianaId: z.string().min(1, 'IANA ID is required'),
  caseNumber: z.string().min(1, 'Case number is required'),
  createdBy: z.string().optional().default(''),
  terminationType: z.string().optional().default(''),
  terminationEffectiveDate: z.string().optional().default(''),
  gainingRegistrarName: z.string().optional().default(''),
  gainingRegistrarIanaId: z.string().optional().default(''),
  icannNoticeDate: z.string().optional().default(''),
  hasGatewayCnTw: z.boolean().default(false),
});

export const simpleTaskSchema = z.object({
  registrarName: z.string().min(1, 'Registrar name is required'),
  ianaId: z.string().min(1, 'IANA ID is required'),
  caseNumber: z.string().min(1, 'Case number is required'),
  createdBy: z.string().optional().default(''),
  hasGatewayCnTw: z.boolean().optional().default(false),
  oldRegistrarName: z.string().optional().default(''),
  newRegistrarName: z.string().optional().default(''),
});

export type TerminationTaskInput = z.infer<typeof terminationTaskSchema>;
export type SimpleTaskInput = z.infer<typeof simpleTaskSchema>;

/** Schema for editing existing case metadata (no createdBy — attribution is set at creation). */
export const editTaskSchema = z.object({
  registrarName: z.string().min(1, 'Registrar name is required'),
  ianaId: z.string().min(1, 'IANA ID is required'),
  caseNumber: z.string().min(1, 'Case number is required'),
  // Termination-specific — optional, only present in the form for TERMINATION tasks
  terminationType: z.string().optional().default(''),
  terminationEffectiveDate: z.string().optional().default(''),
  gainingRegistrarName: z.string().optional().default(''),
  gainingRegistrarIanaId: z.string().optional().default(''),
  icannNoticeDate: z.string().optional().default(''),
  hasGatewayCnTw: z.boolean().optional().default(false),
  oldRegistrarName: z.string().optional().default(''),
  newRegistrarName: z.string().optional().default(''),
});

export type EditTaskInput = z.infer<typeof editTaskSchema>;
