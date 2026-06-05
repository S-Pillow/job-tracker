/**
 * Canonical termination type strings.
 * These are stored as-is in Task.terminationType.
 * Both create and edit dialogs must use this list.
 */
export const TERMINATION_TYPES = [
  'ICANN Termination',
  'Self Termination',
  'Terminated for Cause',
] as const;

export type TerminationTypeValue = (typeof TERMINATION_TYPES)[number];

/**
 * Maps legacy stored values (written by the old edit dialog) to canonical ones.
 * Safe to call on any stored value; unknown values pass through unchanged.
 */
export function normalizeTerminationType(value: string | null | undefined): string {
  if (!value) return '';
  const legacyMap: Record<string, string> = {
    'ICANN': 'ICANN Termination',
    'Termination for Cause': 'Terminated for Cause',
  };
  return legacyMap[value] ?? value;
}
