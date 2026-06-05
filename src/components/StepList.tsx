import { StepItem } from './StepItem';
import { CloseCaseButton } from './CloseCaseButton';
import type { StepData, TaskType } from '@/lib/types';

interface Props {
  steps: StepData[];
  taskId: string;
  taskType: TaskType;
  isTaskCompleted?: boolean;
}

const TEARDOWN_START_ORDER = 11;

function getLockedByTitle(step: StepData, steps: StepData[]): string | null {
  const gateStep = steps.find(
    (s) => s.isGate && s.order < step.order && s.status !== 'COMPLETE',
  );
  return gateStep?.title ?? null;
}

export function StepList({ steps, taskId, taskType, isTaskCompleted = false }: Props) {
  if (steps.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500">
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

  const isTermination = taskType === 'TERMINATION';
  const primarySteps = isTermination
    ? steps.filter((s) => s.order < TEARDOWN_START_ORDER)
    : steps;
  const teardownSteps = isTermination
    ? steps.filter((s) => s.order >= TEARDOWN_START_ORDER)
    : [];

  return (
    <div className="px-4 py-4">
      {allDone && !isTaskCompleted && (
        <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800">
          <span className="text-emerald-700 dark:text-emerald-300 text-sm font-medium">
            All steps complete — workflow finished.
          </span>
        </div>
      )}

      {isTaskCompleted && (
        <div className="mb-3 px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 text-sm">
          This case is closed. Steps are read-only. Use <strong>Reopen Case</strong> to make changes.
        </div>
      )}

      <div className="space-y-0.5">
        {primarySteps.map((step) => (
          <StepItem
            key={step.id}
            step={step}
            isCurrent={step.order === currentStep?.order}
            lockedByTitle={getLockedByTitle(step, steps)}
            isTaskCompleted={isTaskCompleted}
          />
        ))}
      </div>

      {teardownSteps.length > 0 && (
        <>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
            <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest whitespace-nowrap">
              Teardown &amp; Cleanup
            </span>
            <div className="flex-1 border-t border-zinc-200 dark:border-zinc-700" />
          </div>

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
        </>
      )}
    </div>
  );
}
