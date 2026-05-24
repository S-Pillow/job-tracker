import { StepItem } from './StepItem';
import { CloseCaseButton } from './CloseCaseButton';
import type { StepData } from '@/lib/types';

interface Props {
  steps: StepData[];
  taskId: string;
  /** When true the parent task is closed; step toggles are disabled. */
  isTaskCompleted?: boolean;
}

const TEARDOWN_START_ORDER = 11;

function getLockedByTitle(step: StepData, steps: StepData[]): string | null {
  const gateStep = steps.find(
    (s) => s.isGate && s.order < step.order && s.status !== 'COMPLETE',
  );
  return gateStep?.title ?? null;
}

export function StepList({ steps, taskId, isTaskCompleted = false }: Props) {
  if (steps.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-zinc-400">
        <p className="text-sm">Steps for this workflow haven&apos;t been defined yet.</p>
        <p className="text-xs mt-1 mb-4">Check back later or contact your team lead.</p>
        {!isTaskCompleted && <CloseCaseButton taskId={taskId} />}
      </div>
    );
  }

  const currentStep = steps.find(
    (s) => s.status !== 'COMPLETE' && s.status !== 'NA',
  );

  const completedCount = steps.filter((s) => s.status === 'COMPLETE').length;
  const activeCount = steps.filter((s) => s.status !== 'NA').length;
  const allDone = completedCount === activeCount && activeCount > 0;

  const transferSteps = steps.filter((s) => s.order < TEARDOWN_START_ORDER);
  const teardownSteps = steps.filter((s) => s.order >= TEARDOWN_START_ORDER);

  return (
    <div className="px-4 py-4">
      {allDone && !isTaskCompleted && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200">
          <span className="text-emerald-700 text-sm font-medium">
            All steps complete — termination workflow finished.
          </span>
        </div>
      )}

      {isTaskCompleted && (
        <div className="mb-3 px-3 py-2 rounded-md bg-zinc-50 border border-zinc-200 text-zinc-500 text-sm">
          This case is closed. Steps are read-only. Use <strong>Reopen Case</strong> to make changes.
        </div>
      )}

      {/* Transfer phase (steps 1–10) */}
      <div className="space-y-0.5">
        {transferSteps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            isCurrent={step.order === currentStep?.order}
            lockedByTitle={getLockedByTitle(step, steps)}
            isTaskCompleted={isTaskCompleted}
          />
        ))}
      </div>

      {/* Section divider */}
      {teardownSteps.length > 0 && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 border-t border-zinc-200" />
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
            Teardown &amp; Cleanup
          </span>
          <div className="flex-1 border-t border-zinc-200" />
        </div>
      )}

      {/* Teardown phase (steps 11–18) */}
      <div className="space-y-0.5">
        {teardownSteps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            isCurrent={step.order === currentStep?.order}
            lockedByTitle={getLockedByTitle(step, steps)}
            isTaskCompleted={isTaskCompleted}
          />
        ))}
      </div>
    </div>
  );
}
