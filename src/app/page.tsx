import { prisma } from '@/lib/prisma';
import { JobTrackerShell } from '@/components/JobTrackerShell';
import { ThemeToggle } from '@/components/ThemeToggle';
import { mapTaskData, STEPS_INCLUDE } from '@/lib/mappers';
import type { TaskData } from '@/lib/types';

export default async function Home() {
  const [rawActive, completedCount] = await Promise.all([
    prisma.task.findMany({
      where: { completedAt: null },
      include: STEPS_INCLUDE,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where: { NOT: { completedAt: null } } }),
  ]);

  const tasks: TaskData[] = rawActive.map(mapTaskData);

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Job Tracker
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
              {tasks.length === 0
                ? 'No active tasks.'
                : `${tasks.length} active task${tasks.length !== 1 ? 's' : ''} in the pipeline`}
            </p>
          </div>
          <ThemeToggle />
        </div>
        <JobTrackerShell tasks={tasks} completedCount={completedCount} />
      </div>
    </main>
  );
}
