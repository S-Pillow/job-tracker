import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(...values: (string | number | boolean | null | undefined)[]): string {
  return values.map(escapeCsv).join(',');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') ?? 'csv';

  const tasks = await prisma.task.findMany({
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'json') {
    return NextResponse.json(tasks, {
      headers: {
        'Content-Disposition': 'attachment; filename="job-tracker-export.json"',
      },
    });
  }

  // CSV export — one row per case, summary columns + step completion count
  const headers = [
    'Case Number',
    'Registrar Name',
    'IANA ID',
    'Task Type',
    'Status',
    'Termination Type',
    'Termination Effective Date',
    'Gaining Registrar',
    'Gaining Registrar IANA ID',
    'ICANN Notice Date',
    'Has Gateway CN/TW',
    'Steps Total',
    'Steps Completed',
    'Created At',
    'Completed At',
  ];

  const csvRows = [headers.join(',')];

  for (const t of tasks) {
    const activeSteps = t.steps.filter((s) => s.status !== 'NA');
    const completedSteps = activeSteps.filter((s) => s.status === 'COMPLETE');

    csvRows.push(
      row(
        t.caseNumber,
        t.registrarName,
        t.ianaId,
        t.taskType,
        t.status,
        t.terminationType,
        t.terminationEffectiveDate?.toISOString() ?? null,
        t.gainingRegistrarName,
        t.gainingRegistrarIanaId,
        t.icannNoticeDate?.toISOString() ?? null,
        t.hasGatewayCnTw ? 'Yes' : 'No',
        activeSteps.length,
        completedSteps.length,
        t.createdAt.toISOString(),
        t.completedAt?.toISOString() ?? null,
      ),
    );
  }

  const csv = csvRows.join('\n');
  const timestamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="job-tracker-export-${timestamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
