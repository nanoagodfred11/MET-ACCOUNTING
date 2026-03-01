import { useLoaderData, useFetcher, useSearchParams } from 'react-router';
import { connectDB } from '~/lib/db.server';
import { requireAuth } from '~/lib/auth.server';
import { massBalanceService } from '~/lib/services/massBalanceService.server';
import { recoveryService } from '~/lib/services/recoveryService.server';
import { SamplingPoint } from '~/lib/models/SamplingPoint.server';
import { ProcessingData } from '~/lib/models/ProcessingData.server';
import { Assay } from '~/lib/models/Assay.server';
import { Recovery } from '~/lib/models/Recovery.server';
import { Reconciliation } from '~/lib/models/Reconciliation.server';
import { DEFAULT_SAMPLING_POINTS, DEFAULT_RECOVERY_TARGET } from '~/lib/config/constants';
import { StatCard } from '~/components/cards/StatCard';
import { ProcessTracker, type StageStatus } from '~/components/ProcessTracker';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { ClientOnly } from '~/components/ClientOnly';
import { PeriodSelector } from '~/components/forms/PeriodSelector';
import { RecoveryLineChart } from '~/components/charts/RecoveryLineChart';
import { formatTonnes, formatMetal, formatGrade, formatPercent, toISODate, parseISODate } from '~/utils/format';
import type { Route } from './+types/_auth.dashboard';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  await requireAuth(request);

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || toISODate(new Date());

  const spCount = await SamplingPoint.countDocuments();

  const massBalance = await massBalanceService.getByPeriod({
    periodType: 'daily',
    date: parseISODate(date),
  });

  // Recovery trend for the month
  const d = parseISODate(date);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const trend = await recoveryService.getTrend(monthStart, monthEnd, 'daily');
  const recoveryTrend = trend.map((r) => ({
    date: new Date(r.period.date).toISOString().split('T')[0],
    recovery: r.overallRecovery,
    target: r.budgetTarget ?? DEFAULT_RECOVERY_TARGET,
  }));

  // Pipeline stage computation for the selected date
  const periodQuery = { 'period.periodType': 'daily', 'period.date': parseISODate(date) };
  const [pdCount, assayCount, verifiedCount, recoveryDoc, reconCount] = await Promise.all([
    ProcessingData.countDocuments(periodQuery),
    Assay.countDocuments(periodQuery),
    Assay.countDocuments({ ...periodQuery, isVerified: true }),
    Recovery.findOne(periodQuery).lean().exec(),
    Reconciliation.countDocuments(periodQuery),
  ]);

  const stages: StageStatus[] = [
    {
      name: 'Data Entry',
      status: pdCount > 0 ? 'complete' : 'pending',
      detail: pdCount > 0 ? `${pdCount} records` : undefined,
    },
    {
      name: 'Assay Verification',
      status: assayCount > 0 && verifiedCount === assayCount ? 'complete' :
              assayCount > 0 ? 'in-progress' : 'pending',
      detail: assayCount > 0 ? `${verifiedCount}/${assayCount} verified` : undefined,
    },
    {
      name: 'Mass Balance',
      status: massBalance ? 'complete' : 'pending',
      detail: massBalance ? massBalance.status : undefined,
    },
    {
      name: 'Recovery',
      status: recoveryDoc ? 'complete' : 'pending',
      detail: recoveryDoc ? `${recoveryDoc.overallRecovery.toFixed(1)}%` : undefined,
    },
    {
      name: 'Reconciliation',
      status: reconCount > 0 ? 'complete' : 'pending',
      detail: reconCount > 0 ? `${reconCount} checks` : undefined,
    },
  ];

  return {
    date,
    spCount,
    massBalance,
    recoveryTrend,
    stages,
  };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  await requireAuth(request);

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'seed') {
    const existing = await SamplingPoint.countDocuments();
    if (existing === 0) {
      await SamplingPoint.insertMany(DEFAULT_SAMPLING_POINTS.map((sp) => ({ ...sp, isActive: true })));
      return { success: true, message: 'Sampling points seeded' };
    }
    return { success: false, message: 'Sampling points already exist' };
  }

  return { success: false, message: 'Unknown intent' };
}

export default function DashboardPage() {
  const { date, spCount, massBalance, recoveryTrend, stages } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const mb = massBalance;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Dashboard</h1>
        <PeriodSelector showShift={false} />
      </div>

      {/* Seed button */}
      {spCount === 0 && (
        <div className="mb-6 bg-gold-400/10 border border-gold-400/30 rounded-lg p-4">
          <p className="text-sm text-gold-400 mb-2">No sampling points found. Seed the default CIL plant configuration?</p>
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="seed" />
            <button
              type="submit"
              className="px-4 py-2 bg-gold-400 text-navy-950 rounded text-sm font-medium hover:bg-gold-500 transition-colors"
            >
              Seed Sampling Points
            </button>
          </fetcher.Form>
        </div>
      )}

      {/* Process Tracker */}
      <div className="mb-6">
        <ProcessTracker stages={stages} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Feed"
          value={mb ? formatTonnes(mb.feed.dryTonnes) + 't' : '—'}
          subtitle="Dry tonnes"
          accent="teal"
        />
        <StatCard
          title="Product Metal"
          value={mb ? formatMetal(mb.product.containedMetal) + ' kg' : '—'}
          subtitle="Au contained"
          accent="gold"
        />
        <StatCard
          title="Tailings Grade"
          value={mb ? formatGrade(mb.tailings.weightedGrade) + ' g/t' : '—'}
          subtitle="CIL Tails"
          accent="blue"
        />
        <StatCard
          title="Unaccounted"
          value={mb ? formatPercent(mb.unaccountedPercent) + '%' : '—'}
          subtitle="Metal loss"
          accent={mb && Math.abs(mb.unaccountedPercent) > 5 ? 'red' : 'green'}
        />
        <StatCard
          title="Status"
          value={mb ? mb.status : '—'}
          subtitle={`Date: ${date}`}
          accent="teal"
        />
      </div>

      {/* Recovery Trend Chart */}
      <div className="bg-navy-700 rounded-lg border-t-2 border-t-gold-400 p-4">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Recovery Trend (Month)
        </h2>
        <ClientOnly fallback={<div className="h-64 flex items-center justify-center text-gray-600">Loading chart...</div>}>
          {() => <RecoveryLineChart data={recoveryTrend} />}
        </ClientOnly>
      </div>
    </div>
  );
}
