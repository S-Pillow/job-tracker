'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronRight, Trash2, RotateCcw } from 'lucide-react';
import { StepList } from './StepList';
import { EditTaskDialog } from './EditTaskDialog';
import { deleteTask, reopenTask } from '@/app/actions';
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

  const isTaskCompleted = task.completedAt !== null;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isReopening, startReopenTransition] = useTransition();

  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(true);
  }

  function handleConfirm(e: React.MouseEvent) {
    e.stopPropagation();
    startDeleteTransition(async () => {
      await deleteTask(task.id);
    });
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation();
    setConfirmDelete(false);
  }

  function handleReopen(e: React.MouseEvent) {
    e.stopPropagation();
    startReopenTransition(async () => {
      await reopenTask(task.id);
    });
  }

  return (
    <div className="group border border-zinc-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Row header — flex siblings, no overlap */}
      <div className="flex items-stretch hover:bg-zinc-50 transition-colors">
        {/* Expand/collapse toggle — takes all remaining space */}
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 min-w-0 flex items-center gap-4 pl-5 pr-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
        >
          <span className="text-zinc-400 flex-shrink-0">
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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

          {/* Step label — active tasks only */}
          {!isTaskCompleted && (
            <span className="hidden lg:inline text-xs flex-shrink-0 whitespace-nowrap">
              {currentStep ? (
                <span className="text-zinc-500">Step {currentStep.order} of {totalCount}</span>
              ) : (
                <span className="text-zinc-400">Not started</span>
              )}
            </span>
          )}
        </button>

        {/* Right controls — always a proper flex sibling, never overlapping */}
        <div className="flex items-center gap-2 pr-3 flex-shrink-0">
          {/* Completed date + Reopen */}
          {isTaskCompleted && !confirmDelete && (
            <>
              {task.completedAt && (
                <span className="hidden lg:inline text-xs text-emerald-600 font-medium whitespace-nowrap">
                  Completed {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              <button
                type="button"
                onClick={handleReopen}
                disabled={isReopening}
                aria-label="Reopen case"
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-zinc-500 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50 transition-colors"
              >
                <RotateCcw size={11} />
                {isReopening ? 'Reopening…' : 'Reopen'}
              </button>
            </>
          )}

          {/* Delete control */}
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 bg-white rounded">
              <span className="text-xs text-zinc-500 whitespace-nowrap">Delete?</span>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="text-xs px-2 py-1 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? '…' : 'Yes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs px-2 py-1 rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleDeleteClick}
              aria-label="Delete task"
              className="p-1.5 rounded text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-zinc-100">
          {/* Expanded action bar — Edit sits here, away from the crowded row header */}
          <div className="flex items-center justify-end px-4 py-2 border-b border-zinc-100 bg-white">
            <EditTaskDialog task={task} />
          </div>

          {/* Name Change: old → new name strip */}
          {(task.oldRegistrarName || task.newRegistrarName) && (
            <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Name Change
              </span>
              <span className="text-zinc-700 font-medium">{task.oldRegistrarName ?? '—'}</span>
              <span className="text-zinc-400">→</span>
              <span className="text-zinc-700 font-semibold">{task.newRegistrarName ?? '—'}</span>
            </div>
          )}

          {/* Termination: gaining registrar strip */}
          {(task.gainingRegistrarName || task.gainingRegistrarIanaId) && (
            <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-zinc-600">
              <span className="font-semibold text-zinc-400 uppercase tracking-wider self-center">
                Gaining Registrar
              </span>
              {task.gainingRegistrarName && (
                <span>
                  <span className="text-zinc-400">Name:&nbsp;</span>
                  <span className="text-zinc-700 font-medium">{task.gainingRegistrarName}</span>
                </span>
              )}
              {task.gainingRegistrarIanaId && (
                <span>
                  <span className="text-zinc-400">IANA ID:&nbsp;</span>
                  <span className="text-zinc-700 font-mono font-medium">{task.gainingRegistrarIanaId}</span>
                </span>
              )}
            </div>
          )}
          <StepList steps={task.steps} taskId={task.id} taskType={task.taskType} isTaskCompleted={isTaskCompleted} />
        </div>
      )}
    </div>
  );
}
