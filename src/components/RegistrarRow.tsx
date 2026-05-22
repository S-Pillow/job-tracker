'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { StepList } from './StepList';
import type { TaskData } from '@/lib/types';

interface Props {
  task: TaskData;
  isExpanded: boolean;
  onToggle: () => void;
}

export function RegistrarRow({ task, isExpanded, onToggle }: Props) {
  const activeSteps = task.steps.filter((s) => s.status !== 'NA');
  const completedCount = activeSteps.filter((s) => s.status === 'COMPLETE').length;
  const totalCount = activeSteps.length;
  const currentStep = task.steps.find(
    (s) => s.status !== 'COMPLETE' && s.status !== 'NA',
  );
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      >
        {/* Expand/collapse chevron */}
        <span className="text-zinc-400 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}
        </span>

        {/* Registrar name */}
        <span className="font-semibold text-zinc-900 flex-1 min-w-0 truncate">
          {task.registrarName}
        </span>

        {/* IANA ID chip */}
        <span className="hidden sm:inline text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-mono flex-shrink-0">
          IANA {task.ianaId}
        </span>

        {/* Case number */}
        <span className="hidden md:inline text-sm text-zinc-500 flex-shrink-0">
          {task.caseNumber}
        </span>

        {/* Progress bar + fraction */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isAllDone ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 tabular-nums whitespace-nowrap">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Current step label — shows step number only, no title (avoids truncation) */}
        <span className="hidden lg:inline text-xs flex-shrink-0 whitespace-nowrap">
          {isAllDone ? (
            <span className="text-emerald-600 font-medium">Complete</span>
          ) : currentStep ? (
            <span className="text-zinc-500">Step {currentStep.order} of {totalCount}</span>
          ) : (
            <span className="text-zinc-400">Not started</span>
          )}
        </span>
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-100">
          <StepList steps={task.steps} />
        </div>
      )}
    </div>
  );
}
