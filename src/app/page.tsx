import { prisma } from '@/lib/prisma';
import { JobTrackerShell } from '@/components/JobTrackerShell';
import { mapTaskData, STEPS_INCLUDE } from '@/lib/mappers';
import type { TaskData } from '@/lib/types';

export default async function Home() {
  // P8: Only load active (non-completed) tasks on initial render.
  // Completed tasks are fetched lazily by JobTrackerShell when the tab is opened.
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
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">
            Job Tracker
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {tasks.length === 0
              ? 'No active tasks.'
              : `${tasks.length} active task${tasks.length !== 1 ? 's' : ''} in the pipeline`}
          </p>
        </div>
        <JobTrackerShell tasks={tasks} completedCount={completedCount} />
      </div>
    </main>
  );
}
