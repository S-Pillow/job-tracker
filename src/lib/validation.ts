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
});

export type TerminationTaskInput = z.infer<typeof terminationTaskSchema>;
export type SimpleTaskInput = z.infer<typeof simpleTaskSchema>;
