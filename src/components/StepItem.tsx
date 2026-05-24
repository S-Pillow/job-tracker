'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Check, Lock, ShieldAlert, AlertCircle } from 'lucide-react';
import { updateStepStatus } from '@/app/actions';
import type { StepData, StepStatus } from '@/lib/types';

interface Props {
  step: StepData;
  isCurrent: boolean;
  /** Title of the gate step that is blocking this step, or null if not locked. */
  lockedByTitle?: string | null;
}

export function StepItem({ step, isCurrent, lockedByTitle = null }: Props) {
  const isLocked = lockedByTitle !== null;

  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<StepStatus>(step.status);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isComplete = optimisticStatus === 'COMPLETE';
  const isNA = optimisticStatus === 'NA';

  // A completed step is always interactable — the lock only prevents checking
  // an incomplete step. This avoids the checked+locked visual contradiction.
  const isDisabled = isPending || isNA || (isLocked && !isComplete);

  function handleToggle() {
    if (isDisabled) return;
    const nextStatus: StepStatus = isComplete ? 'NOT_STARTED' : 'COMPLETE';
    setSaveError(null);
    startTransition(async () => {
      setOptimisticStatus(nextStatus);
      try {
        await updateStepStatus(step.id, nextStatus);
      } catch {
        setSaveError('Save failed — try again');
      }
    });
  }

  // Aria label uses the actual gate step title, not a hardcoded step number.
  const ariaLabel = isLocked && !isComplete
    ? `Locked — complete "${lockedByTitle}" first`
    : isComplete
    ? 'Mark incomplete'
    : 'Mark complete';

  return (
    <div className="group">
      {/* STOP warning banner */}
      {step.isStopWarning && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5 rounded-t-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
          <ShieldAlert size={13} className="flex-shrink-0" />
          <span>STOP — Do not proceed until the bulk transfer is fully complete</span>
        </div>
      )}

      <div
        className={[
          'flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors',
          step.isStopWarning ? 'rounded-t-none border border-t-0 border-red-200 bg-red-50/30' : '',
          step.isGate && !isComplete ? 'border border-amber-300 bg-amber-50/60' : '',
          isCurrent && !isComplete && !step.isGate && !step.isStopWarning && !(isLocked && !isComplete)
            ? 'bg-blue-50 border border-blue-100'
            : '',
          // Only dim when locked AND not already complete
          isLocked && !isComplete ? 'opacity-50' : '',
          isNA ? 'opacity-40' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Checkbox / lock icon */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isDisabled}
          aria-label={ariaLabel}
          className={[
            'flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            isComplete
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : isLocked && !isComplete
              ? 'border-zinc-300 bg-zinc-100 cursor-not-allowed'
              : 'border-zinc-300 hover:border-blue-400 bg-white',
            isPending ? 'opacity-50 cursor-wait' : '',
            isNA ? 'cursor-default' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isComplete && <Check size={11} strokeWidth={3} />}
          {/* Lock icon only shown when the step is incomplete and locked */}
          {isLocked && !isComplete && <Lock size={9} className="text-zinc-400" />}
        </button>

        {/* Step number */}
        <span className="text-xs text-zinc-400 flex-shrink-0 w-6 text-right tabular-nums mt-0.5">
          {step.order}.
        </span>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span
              className={[
                'text-sm leading-snug',
                isComplete ? 'line-through text-zinc-400' : '',
                isCurrent && !isComplete && !(isLocked && !isComplete) ? 'text-zinc-900 font-medium' : '',
                !isComplete && !isCurrent ? 'text-zinc-700' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {step.title}
            </span>
            {/* Inline badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {step.isGate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 text-amber-700 border border-amber-300 uppercase tracking-wide">
                  Gate
                </span>
              )}
              {isLocked && !isComplete && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 text-zinc-500 uppercase tracking-wide">
                  Locked
                </span>
              )}
              {isCurrent && !isComplete && !(isLocked && !isComplete) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Current
                </span>
              )}
              {step.isConditional && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 text-purple-600 border border-purple-200 uppercase tracking-wide">
                  Cond.
                </span>
              )}
              {isNA && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 text-zinc-500 uppercase tracking-wide">
                  N/A
                </span>
              )}
            </div>
          </div>

          {/* Description sub-text */}
          {step.description && !isComplete && (
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              {step.description}
            </p>
          )}

          {/* Inline save error — shown below the step title */}
          {saveError && (
            <p className="flex items-center gap-1 text-xs text-red-600 mt-1 font-medium">
              <AlertCircle size={11} className="flex-shrink-0" />
              {saveError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
