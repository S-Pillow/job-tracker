'use client';

import { useState, useMemo, useEffect, useTransition, useRef } from 'react';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import { RegistrarRow } from './RegistrarRow';
import { NewTerminationDialog } from './NewTerminationDialog';
import { NewNameChangeDialog } from './NewNameChangeDialog';
import { NewAssignmentDialog } from './NewAssignmentDialog';
import { getCompletedTasks } from '@/app/actions';
import type { TaskData } from '@/lib/types';

type Tab = 'all' | 'terminations' | 'name-changes' | 'assignments' | 'completed';

interface Props {
  tasks: TaskData[];        // active (non-completed) tasks from server
  completedCount: number;   // total completed count from server (for badge)
}

// A task is active iff the backend cleared completedAt (reopen sets it to null).
// Step completion state alone must never hide a task — a reopened task keeps its
// checked steps but has completedAt = null and must appear as active.
function isTaskComplete(task: TaskData): boolean {
  return task.completedAt !== null;
}

const TAB_CONFIG: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Active' },
  { id: 'terminations', label: 'Terminations' },
  { id: 'name-changes', label: 'Name Changes' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'completed', label: 'Completed' },
];

export function JobTrackerShell({ tasks, completedCount }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [ncDialogOpen, setNcDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // P4: Search state
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // P7/P8: Completed tasks lazy-loaded state
  const [completedTasks, setCompletedTasks] = useState<TaskData[]>([]);
  const [completedTotal, setCompletedTotal] = useState(completedCount);
  const [completedOffset, setCompletedOffset] = useState(0);
  const [hasMoreCompleted, setHasMoreCompleted] = useState(completedCount > 0);
  const [completedLoaded, setCompletedLoaded] = useState(false);
  const [isPendingCompleted, startCompletedTransition] = useTransition();

  // When active tasks change (server re-render after a step is checked), invalidate
  // the cached completed list so the next Completed tab open gets fresh data.
  useEffect(() => {
    setCompletedTasks([]);
    setCompletedOffset(0);
    setCompletedLoaded(false);
    setCompletedTotal(completedCount);
    setHasMoreCompleted(completedCount > 0);
  }, [tasks, completedCount]);

  function loadCompletedPage(offset: number, append: boolean) {
    startCompletedTransition(async () => {
      const result = await getCompletedTasks(offset);
      setCompletedTasks((prev) => (append ? [...prev, ...result.tasks] : result.tasks));
      setCompletedTotal(result.total);
      setCompletedOffset(offset + result.tasks.length);
      setHasMoreCompleted(result.hasMore);
      setCompletedLoaded(true);
    });
  }

  // Load first page of completed tasks when the Completed tab is first activated
  useEffect(() => {
    if (activeTab === 'completed' && !completedLoaded) {
      loadCompletedPage(0, false);
    }
    // Reset search when switching tabs
    setSearchQuery('');
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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
      terminations: tasks.filter((t) => t.taskType === 'TERMINATION' && !isTaskComplete(t)).length,
      'name-changes': tasks.filter((t) => t.taskType === 'NAME_CHANGE' && !isTaskComplete(t)).length,
      assignments: tasks.filter((t) => t.taskType === 'ASSIGNMENT' && !isTaskComplete(t)).length,
      completed: completedTotal,
    }),
    [tasks, completedTotal],
  );

  // Base task list before search filtering
  const baseVisibleTasks = useMemo(() => {
    switch (activeTab) {
      case 'terminations':
        return tasks.filter((t) => t.taskType === 'TERMINATION' && !isTaskComplete(t));
      case 'name-changes':
        return tasks.filter((t) => t.taskType === 'NAME_CHANGE' && !isTaskComplete(t));
      case 'assignments':
        return tasks.filter((t) => t.taskType === 'ASSIGNMENT' && !isTaskComplete(t));
      case 'completed':
        return completedTasks;
      default:
        return tasks.filter((t) => !isTaskComplete(t));
    }
  }, [tasks, completedTasks, activeTab]);

  // P4: Apply search filter
  const visibleTasks = useMemo(() => {
    if (!searchQuery.trim()) return baseVisibleTasks;
    const q = searchQuery.toLowerCase().trim();
    return baseVisibleTasks.filter(
      (t) =>
        t.registrarName.toLowerCase().includes(q) ||
        t.ianaId.toLowerCase().includes(q) ||
        t.caseNumber.toLowerCase().includes(q),
    );
  }, [baseVisibleTasks, searchQuery]);

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
      <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700 mb-4 overflow-x-auto scrollbar-hide">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === tab.id
                ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600',
            ].join(' ')}
          >
            {tab.label}
            {counts[tab.id] > 0 && (
              <span
                className={[
                  'text-[10px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums',
                  activeTab === tab.id
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300',
                ].join(' ')}
              >
                {counts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar: search + add buttons */}
      <div className="flex items-center gap-3 mb-4">
        {/* P4: Search bar */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search by name, IANA ID, or case #"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 rounded-md placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 focus:border-transparent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mr-1 hidden sm:block">
            Registrars
          </p>
          {activeTab !== 'completed' && (
            <>
              {(activeTab === 'all' || activeTab === 'terminations') && (
                <button
                  type="button"
                  onClick={() => setTermDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors"
                >
                  <Plus size={14} />
                  Add Termination
                </button>
              )}
              {(activeTab === 'all' || activeTab === 'name-changes') && (
                <button
                  type="button"
                  onClick={() => setNcDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Plus size={14} />
                  Add Name Change
                </button>
              )}
              {(activeTab === 'all' || activeTab === 'assignments') && (
                <button
                  type="button"
                  onClick={() => setAssignDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Plus size={14} />
                  Add Assignment
                </button>
              )}
            </>
          )}

          {/* P9: Export link */}
          <a
            href="/tools/job-tracker/api/export?format=csv"
            download="job-tracker-export.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            title="Download all cases as CSV"
          >
            Export CSV
          </a>
        </div>
      </div>

      {/* Search result count */}
      {searchQuery.trim() && (
        <p className="text-xs text-zinc-400 mb-3">
          {visibleTasks.length === 0
            ? 'No results'
            : `${visibleTasks.length} result${visibleTasks.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Completed tab: loading spinner */}
      {activeTab === 'completed' && isPendingCompleted && completedTasks.length === 0 && (
        <div className="flex items-center justify-center py-16 text-zinc-400 dark:text-zinc-500 gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading completed cases…</span>
        </div>
      )}

      {/* Task list */}
      {!(activeTab === 'completed' && isPendingCompleted && completedTasks.length === 0) && (
        <>
          {visibleTasks.length === 0 && !searchQuery.trim() ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
              <p className="text-sm">{emptyMessages[activeTab].title}</p>
              <p className="text-xs mt-1">{emptyMessages[activeTab].subtitle}</p>
            </div>
          ) : visibleTasks.length === 0 && searchQuery.trim() ? (
            <div className="text-center py-16 text-zinc-400 dark:text-zinc-500">
              <p className="text-sm">No cases match &ldquo;{searchQuery}&rdquo;</p>
              <p className="text-xs mt-1">Try searching by registrar name, IANA ID, or case number</p>
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

          {/* P7: Load More button for Completed tab */}
          {activeTab === 'completed' && hasMoreCompleted && !searchQuery.trim() && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => loadCompletedPage(completedOffset, true)}
                disabled={isPendingCompleted}
                className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {isPendingCompleted ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={13} className="animate-spin" /> Loading…
                  </span>
                ) : (
                  `Load more (${completedTotal - completedOffset} remaining)`
                )}
              </button>
            </div>
          )}
        </>
      )}

      <NewTerminationDialog open={termDialogOpen} onOpenChange={setTermDialogOpen} />
      <NewNameChangeDialog open={ncDialogOpen} onOpenChange={setNcDialogOpen} />
      <NewAssignmentDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} />
    </div>
  );
}
