'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { RegistrarRow } from './RegistrarRow';
import { NewTerminationDialog } from './NewTerminationDialog';
import type { TaskData } from '@/lib/types';

interface Props {
  tasks: TaskData[];
}

export function TerminationTracker({ tasks }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
          Registrars
        </p>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          <Plus size={14} />
          Add Termination
        </button>
      </div>

      {/* List */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-sm">No terminations yet.</p>
          <p className="text-xs mt-1">Click &ldquo;Add Termination&rdquo; to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <RegistrarRow
              key={task.id}
              task={task}
              isExpanded={expanded.has(task.id)}
              onToggle={() => toggle(task.id)}
            />
          ))}
        </div>
      )}

      <NewTerminationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
