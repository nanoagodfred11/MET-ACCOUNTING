import { useLoaderData, useFetcher, useSearchParams } from 'react-router';
import { connectDB } from '~/lib/db.server';
import { requireAuth, checkPermission } from '~/lib/auth.server';
import { recoveryService } from '~/lib/services/recoveryService.server';
import { DEFAULT_RECOVERY_TARGET } from '~/lib/config/constants';
import { StatCard } from '~/components/cards/StatCard';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { ClientOnly } from '~/components/ClientOnly';
import { PeriodSelector } from '~/components/forms/PeriodSelector';
import { ActionMessage } from '~/components/ActionMessage';
import { RecoveryAreaChart } from '~/components/charts/RecoveryAreaChart';
import { periodSchema, firstError } from '~/lib/validations.server';
import { formatPercent, toISODate, parseISODate } from '~/utils/format';
import type { Route } from './+types/_auth.recovery';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const permission = checkPermission(user.role, '/recovery');
  if (permission === 'none') throw new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || toISODate(new Date());

  const d = parseISODate(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const trend = await recoveryService.getTrend(monthStart, monthEnd, 'daily');
  const recoveryTrend = trend.map((r) => ({
    date: new Date(r.period.date).toISOString().split('T')[0],
    recovery: r.overallRecovery,
    target: r.budgetTarget ?? DEFAULT_RECOVERY_TARGET,
  }));

  const summary = await recoveryService.getMonthlySummary(year, month);

  // Today's recovery
  const todayData = recoveryTrend.find((r) => r.date === date);

  return {
    date,
    recoveryTrend,
    summary,
    todayRecovery: todayData?.recovery ?? null,
    todayVariance: todayData ? todayData.recovery - todayData.target : null,
    canWrite: permission === 'full',
  };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  const permission = checkPermission(user.role, '/recovery');
  if (permission === 'read-only' || permission === 'none') {
    return { success: false, message: 'You do not have permission to calculate recovery' };
  }

  if (intent === 'calculate') {
    const raw = Object.fromEntries(formData);
    const parsed = periodSchema.safeParse(raw);
    if (!parsed.success) return { success: false, message: firstError(parsed.error) };
    const { periodType, date, shift } = parsed.data;

    try {
      await recoveryService.calculate({
        periodType,
        date: parseISODate(date),
        ...(periodType === 'shift' && shift ? { shift } : {}),
      }, undefined, user.id);

      return { success: true, message: 'Recovery calculated' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return { success: false, message: 'Unknown intent' };
}

export default function RecoveryPage() {
  const { date, recoveryTrend, summary, todayRecovery, todayVariance, canWrite } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();

  const periodType = searchParams.get('periodType') || 'daily';
  const shift = searchParams.get('shift') || '1';
  const actionResult = fetcher.data as { success?: boolean; message?: string } | undefined;
  const isCalculating = fetcher.state !== 'idle';

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Recovery Analysis</h1>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector showShift={false} />
          {canWrite && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="calculate" />
              <input type="hidden" name="periodType" value={periodType} />
              <input type="hidden" name="date" value={date} />
              {periodType === 'shift' && <input type="hidden" name="shift" value={shift} />}
              <button
                type="submit"
                disabled={isCalculating}
                className="px-4 py-1.5 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50 transition-colors active:scale-95"
              >
                {isCalculating ? 'Calculating...' : 'Calculate'}
              </button>
            </fetcher.Form>
          )}
        </div>
      </div>

      <ActionMessage result={actionResult} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Avg Recovery (MTD)"
          value={summary.dataPoints > 0 ? formatPercent(summary.averageRecovery) + '%' : '—'}
          subtitle={summary.dataPoints > 0 ? `${summary.dataPoints} days` : 'No data'}
          accent={summary.averageRecovery >= DEFAULT_RECOVERY_TARGET ? 'green' : 'red'}
        />
        <StatCard
          title="Best Day"
          value={summary.dataPoints > 0 ? formatPercent(summary.maxRecovery) + '%' : '—'}
          subtitle={summary.dataPoints > 0 ? `+${formatPercent(summary.maxRecovery - DEFAULT_RECOVERY_TARGET)}% vs target` : ''}
          accent="green"
        />
        <StatCard
          title="Worst Day"
          value={summary.dataPoints > 0 ? formatPercent(summary.minRecovery) + '%' : '—'}
          subtitle={summary.dataPoints > 0 ? `${formatPercent(summary.minRecovery - DEFAULT_RECOVERY_TARGET)}% vs target` : ''}
          accent="red"
        />
        <StatCard
          title="Today's Recovery"
          value={todayRecovery !== null ? formatPercent(todayRecovery) + '%' : '—'}
          subtitle={todayVariance !== null ? `${todayVariance >= 0 ? '+' : ''}${formatPercent(todayVariance)}% vs target` : 'Not calculated'}
          accent={todayVariance !== null && todayVariance >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Chart */}
      <div className="bg-navy-700 rounded-lg border-t-2 border-t-teal-400 p-4">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          Recovery Trend
        </h2>
        <ClientOnly fallback={<div className="h-72 flex items-center justify-center text-gray-600">Loading chart...</div>}>
          {() => <RecoveryAreaChart data={recoveryTrend} />}
        </ClientOnly>
      </div>
    </div>
  );
}
