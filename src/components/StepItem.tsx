'use client';

import { useState, useOptimistic, useTransition } from 'react';
import { Check, Lock, ShieldAlert, AlertCircle } from 'lucide-react';
import { updateStepStatus } from '@/app/actions';
import type { StepData, StepStatus } from '@/lib/types';

interface Props {
  step: StepData;
  isCurrent: boolean;
  lockedByTitle?: string | null;
  isTaskCompleted?: boolean;
}

export function StepItem({ step, isCurrent, lockedByTitle = null, isTaskCompleted = false }: Props) {
  const isLocked = lockedByTitle !== null;

  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useOptimistic<StepStatus>(step.status);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isComplete = optimisticStatus === 'COMPLETE';
  const isNA = optimisticStatus === 'NA';

  const isDisabled = isPending || isNA || isTaskCompleted || (isLocked && !isComplete);

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

  const ariaLabel = isTaskCompleted
    ? 'Case is closed — reopen to make changes'
    : isLocked && !isComplete
    ? `Locked — complete "${lockedByTitle}" first`
    : isComplete
    ? 'Mark incomplete'
    : 'Mark complete';

  return (
    <div className="group">
      {/* STOP warning banner */}
      {step.isStopWarning && (
        <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5 rounded-t-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
          <ShieldAlert size={13} className="flex-shrink-0" />
          <span>STOP — Do not proceed until the bulk transfer is fully complete</span>
        </div>
      )}

      <div
        className={[
          'flex items-start gap-3 px-3 py-2.5 rounded-md transition-colors',
          step.isStopWarning ? 'rounded-t-none border border-t-0 border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/30' : '',
          step.isGate && !isComplete ? 'border border-amber-300 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/40' : '',
          isCurrent && !isComplete && !step.isGate && !step.isStopWarning && !(isLocked && !isComplete)
            ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800'
            : '',
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
              ? 'border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-700 cursor-not-allowed'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-blue-400 bg-white dark:bg-zinc-800',
            isPending ? 'opacity-50 cursor-wait' : '',
            isNA ? 'cursor-default' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isComplete && <Check size={11} strokeWidth={3} />}
          {isLocked && !isComplete && <Lock size={9} className="text-zinc-400 dark:text-zinc-500" />}
        </button>

        {/* Step number */}
        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex-shrink-0 w-6 text-right tabular-nums mt-0.5">
          {step.order}.
        </span>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <span
              className={[
                'text-sm leading-snug',
                isComplete ? 'line-through text-zinc-400 dark:text-zinc-500' : '',
                isCurrent && !isComplete && !(isLocked && !isComplete) ? 'text-zinc-900 dark:text-zinc-50 font-medium' : '',
                !isComplete && !isCurrent ? 'text-zinc-700 dark:text-zinc-300' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {step.title}
            </span>
            {/* Inline badges */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {step.isGate && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-600 uppercase tracking-wide">
                  Gate
                </span>
              )}
              {isLocked && !isComplete && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  Locked
                </span>
              )}
              {isCurrent && !isComplete && !(isLocked && !isComplete) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                  Current
                </span>
              )}
              {step.isConditional && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 uppercase tracking-wide">
                  Cond.
                </span>
              )}
              {isNA && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  N/A
                </span>
              )}
            </div>
          </div>

          {step.description && !isComplete && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
              {step.description}
            </p>
          )}

          {saveError && (
            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
              <AlertCircle size={11} className="flex-shrink-0" />
              {saveError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
