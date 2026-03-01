import { useLoaderData, useFetcher } from 'react-router';
import { connectDB } from '~/lib/db.server';
import { requireAuth, checkPermission } from '~/lib/auth.server';
import { massBalanceService } from '~/lib/services/massBalanceService.server';
import { PeriodSelector } from '~/components/forms/PeriodSelector';
import { ActionMessage } from '~/components/ActionMessage';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { StreamTable } from '~/components/cards/StreamTable';
import { periodSchema, firstError } from '~/lib/validations.server';
import { toISODate, parseISODate } from '~/utils/format';
import type { Route } from './+types/_auth.mass-balance';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const permission = checkPermission(user.role, '/mass-balance');
  if (permission === 'none') throw new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || toISODate(new Date());
  const periodType = url.searchParams.get('periodType') || 'daily';
  const shift = url.searchParams.get('shift');

  const period = {
    periodType,
    date: parseISODate(date),
    ...(periodType === 'shift' && shift ? { shift: parseInt(shift) } : {}),
  };

  let massBalance = null;
  try {
    massBalance = await massBalanceService.getByPeriod(period);
  } catch { /* no data */ }

  return {
    date,
    periodType,
    shift: shift || '1',
    massBalance,
    canWrite: permission === 'full',
  };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  const permission = checkPermission(user.role, '/mass-balance');
  if (permission === 'read-only' || permission === 'none') {
    return { success: false, message: 'You do not have permission to calculate mass balance' };
  }

  if (intent === 'calculate') {
    const raw = Object.fromEntries(formData);
    const parsed = periodSchema.safeParse(raw);
    if (!parsed.success) return { success: false, message: firstError(parsed.error) };
    const { periodType, date, shift } = parsed.data;

    try {
      await massBalanceService.calculate({
        periodType,
        date: parseISODate(date),
        ...(periodType === 'shift' && shift ? { shift } : {}),
      }, user.id);

      return { success: true, message: 'Mass balance calculated' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return { success: false, message: 'Unknown intent' };
}

export default function MassBalancePage() {
  const { date, periodType, shift, massBalance, canWrite } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const actionResult = fetcher.data as { success?: boolean; message?: string } | undefined;
  const isCalculating = fetcher.state !== 'idle';

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Mass Balance</h1>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector />
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

      {massBalance ? (
        <StreamTable
          feed={massBalance.feed}
          product={massBalance.product}
          tailings={massBalance.tailings}
          unaccountedMetal={massBalance.unaccountedMetal}
          unaccountedPercent={massBalance.unaccountedPercent}
          status={massBalance.status}
        />
      ) : (
        <div className="bg-navy-700 rounded-lg p-8 text-center border border-navy-500/30">
          <p className="text-gray-500">No mass balance data for this period.</p>
          <p className="text-xs text-gray-600 mt-1">Click "Calculate" to generate from processing data & assays.</p>
        </div>
      )}
    </div>
  );
}
