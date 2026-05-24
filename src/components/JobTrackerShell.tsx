'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { RegistrarRow } from './RegistrarRow';
import { NewTerminationDialog } from './NewTerminationDialog';
import { NewNameChangeDialog } from './NewNameChangeDialog';
import { NewAssignmentDialog } from './NewAssignmentDialog';
import type { TaskData } from '@/lib/types';

type Tab = 'all' | 'terminations' | 'name-changes' | 'assignments' | 'completed';

interface Props {
  tasks: TaskData[];
}

function isTaskComplete(task: TaskData): boolean {
  // A task closed manually (no steps) is complete when completedAt is set.
  if (task.completedAt !== null) return true;
  const activeSteps = task.steps.filter((s) => s.status !== 'NA');
  return activeSteps.length > 0 && activeSteps.every((s) => s.status === 'COMPLETE');
}

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Active' },
  { id: 'terminations', label: 'Terminations' },
  { id: 'name-changes', label: 'Name Changes' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'completed', label: 'Completed' },
];

export function JobTrackerShell({ tasks }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const counts = useMemo(
    () => ({
      all: tasks.filter((t) => !isTaskComplete(t)).length,
      terminations: tasks.filter(
        (t) => t.taskType === 'TERMINATION' && !isTaskComplete(t),
      ).length,
      'name-changes': tasks.filter(
        (t) => t.taskType === 'NAME_CHANGE' && !isTaskComplete(t),
      ).length,
      assignments: tasks.filter(
        (t) => t.taskType === 'ASSIGNMENT' && !isTaskComplete(t),
      ).length,
      completed: tasks.filter(isTaskComplete).length,
    }),
    [tasks],
  );

  const visibleTasks = useMemo(() => {
    switch (activeTab) {
      case 'terminations':
        return tasks.filter(
          (t) => t.taskType === 'TERMINATION' && !isTaskComplete(t),
        );
      case 'name-changes':
        return tasks.filter(
          (t) => t.taskType === 'NAME_CHANGE' && !isTaskComplete(t),
        );
      case 'assignments':
        return tasks.filter(
          (t) => t.taskType === 'ASSIGNMENT' && !isTaskComplete(t),
        );
      case 'completed':
        return tasks.filter(isTaskComplete);
      default:
        // "Active" tab: all open tasks across all types
        return tasks.filter((t) => !isTaskComplete(t));
    }
  }, [tasks, activeTab]);

  const emptyMessages: Record<Tab, { title: string; subtitle: string }> = {
    all: { title: 'No active tasks.', subtitle: 'Add a termination, name change, or assignment to get started.' },
    terminations: { title: 'No active terminations.', subtitle: 'Click "Add Termination" to get started.' },
    'name-changes': { title: 'No active name changes.', subtitle: 'Click "Add Name Change" to get started.' },
    assignments: { title: 'No active assignments.', subtitle: 'Click "Add Assignment" to get started.' },
    completed: { title: 'No completed tasks yet.', subtitle: 'Tasks move here automatically once all steps are done.' },
  };

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-zinc-200 mb-6 overflow-x-auto">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300',
            ].join(' ')}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={[
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums',
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-500',
                ].join(' ')}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
          Registrars
        </p>
        {activeTab !== 'completed' && (
          <div className="flex items-center gap-2">
            {(activeTab === 'all' || activeTab === 'terminations') && (
              <button
                type="button"
                onClick={() => setTermDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                <Plus size={14} />
                Add Termination
              </button>
            )}
            {(activeTab === 'all' || activeTab === 'name-changes') && (
              <button
                type="button"
                onClick={() => setNcDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                <Plus size={14} />
                Add Name Change
              </button>
            )}
            {(activeTab === 'all' || activeTab === 'assignments') && (
              <button
                type="button"
                onClick={() => setAssignDialogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
              >
                <Plus size={14} />
                Add Assignment
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      {visibleTasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-sm">{emptyMessages[activeTab].title}</p>
          <p className="text-xs mt-1">{emptyMessages[activeTab].subtitle}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTasks.map((task) => (
            <RegistrarRow
              key={task.id}
              task={task}
              isExpanded={expanded.has(task.id)}
              onToggle={() => toggle(task.id)}
            />
          ))}
        </div>
      )}

      <NewTerminationDialog open={termDialogOpen} onOpenChange={setTermDialogOpen} />
      <NewNameChangeDialog open={ncDialogOpen} onOpenChange={setNcDialogOpen} />
      <NewAssignmentDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} />
    </div>
  );
}
