'use client';

import { useTransition } from 'react';
import { CheckCircle } from 'lucide-react';
import { closeTask } from '@/app/actions';

interface Props {
  taskId: string;
}

export function CloseCaseButton({ taskId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    startTransition(async () => {
      await closeTask(taskId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClose}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-50 transition-colors"
    >
      <CheckCircle size={14} />
      {isPending ? 'Closing…' : 'Mark as Complete'}
    </button>
  );
}
