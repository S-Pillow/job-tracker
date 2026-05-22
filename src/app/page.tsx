import { prisma } from '@/lib/prisma';
import { JobTrackerShell } from '@/components/JobTrackerShell';
import type { TaskData } from '@/lib/types';

export default async function Home() {
  const raw = await prisma.task.findMany({
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  const tasks: TaskData[] = raw.map((t) => ({
    id: t.id,
    createdAt: t.createdAt,
    taskType: t.taskType as TaskData['taskType'],
    registrarName: t.registrarName,
    ianaId: t.ianaId,
    caseNumber: t.caseNumber,
    terminationType: t.terminationType,
    terminationEffectiveDate: t.terminationEffectiveDate,
    gainingRegistrarName: t.gainingRegistrarName,
    gainingRegistrarIanaId: t.gainingRegistrarIanaId,
    icannNoticeDate: t.icannNoticeDate,
    hasGatewayCnTw: t.hasGatewayCnTw,
    steps: t.steps.map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      description: s.description ?? null,
      status: s.status as TaskData['steps'][number]['status'],
      isConditional: Boolean(s.isConditional),
      isGate: Boolean(s.isGate),
      isStopWarning: Boolean(s.isStopWarning),
      notes: s.notes,
      blockedReason: s.blockedReason,
    })),
  }));

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
              : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} in the pipeline`}
          </p>
        </div>
        <JobTrackerShell tasks={tasks} />
      </div>
    </main>
  );
}
