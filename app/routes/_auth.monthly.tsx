import { useLoaderData, useFetcher, useSearchParams } from 'react-router';
import { useState } from 'react';
import { connectDB } from '~/lib/db.server';
import { requireAuth } from '~/lib/auth.server';
import { massBalanceService } from '~/lib/services/massBalanceService.server';
import { recoveryService } from '~/lib/services/recoveryService.server';
import { ActionMessage } from '~/components/ActionMessage';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { formatTonnes, formatGrade, formatMetal, formatMetalOz, formatPercent, toISODate } from '~/utils/format';
import type { Route } from './+types/_auth.monthly';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  await requireAuth(request);

  const url = new URL(request.url);
  const now = new Date();
  const rawYear = parseInt(url.searchParams.get('year') || String(now.getFullYear()));
  const rawMonth = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1));
  const year = isNaN(rawYear) ? now.getFullYear() : rawYear;
  const month = isNaN(rawMonth) || rawMonth < 1 || rawMonth > 12 ? now.getMonth() + 1 : rawMonth;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Run all three queries in parallel
  const [monthlySummary, dailyBalances, recoverySummary] = await Promise.all([
    massBalanceService.getByPeriod({ periodType: 'monthly', date: startDate }),
    massBalanceService.getRange(startDate, endDate, 'daily'),
    recoveryService.getMonthlySummary(year, month),
  ]);

  return {
    year,
    month,
    monthlySummary,
    dailyBalances,
    recoverySummary,
  };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'generate') {
    const year = parseInt(String(formData.get('year')));
    const month = parseInt(String(formData.get('month')));

    try {
      await massBalanceService.calculateMonthly(year, month, user.id);
      return { success: true, message: 'Monthly report generated' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return { success: false, message: 'Unknown intent' };
}

export default function MonthlyReportPage() {
  const { year, month, monthlySummary, dailyBalances, recoverySummary } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const actionResult = fetcher.data as { success?: boolean; message?: string } | undefined;
  const isGenerating = fetcher.state !== 'idle';

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  }

  function handleExportCSV() {
    if (dailyBalances.length === 0) return;

    // Dynamic import for client-only export
    import('~/utils/export').then(({ exportToCSV }) => {
      const headers = ['Date', 'Feed (t)', 'Feed Grade', 'Feed Metal (kg)', 'Product Metal (kg)', 'Tails Grade', 'Unaccounted (%)','Status'];
      const rows = dailyBalances.map((mb: any) => [
        new Date(mb.period.date).toISOString().split('T')[0],
        mb.feed.dryTonnes,
        mb.feed.weightedGrade,
        mb.feed.containedMetal,
        mb.product.containedMetal,
        mb.tailings.weightedGrade,
        mb.unaccountedPercent,
        mb.status,
      ]);
      exportToCSV(`monthly-report-${year}-${String(month).padStart(2, '0')}.csv`, headers, rows);
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Monthly Report</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-navy-700/60 rounded-lg px-2 py-1.5 border border-navy-500/30">
            <select
              value={month}
              onChange={(e) => updateParam('month', e.target.value)}
              className="bg-transparent border-none text-sm text-gray-300 focus:outline-none cursor-pointer pr-1"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={i + 1} className="bg-navy-700">{name}</option>
              ))}
            </select>
            <span className="text-navy-500">|</span>
            <select
              value={year}
              onChange={(e) => updateParam('year', e.target.value)}
              className="bg-transparent border-none text-sm text-gray-300 focus:outline-none cursor-pointer"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-navy-700">{y}</option>
              ))}
            </select>
          </div>

          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="generate" />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <button
              type="submit"
              disabled={isGenerating}
              className="px-4 py-1.5 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </fetcher.Form>

          <button
            onClick={handleExportCSV}
            disabled={dailyBalances.length === 0}
            className="px-4 py-1.5 border border-gold-400/50 text-gold-400 rounded-lg text-sm hover:bg-gold-400/10 disabled:opacity-30 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      <ActionMessage result={actionResult} />

      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Monthly Summary — {monthNames[month - 1]} {year}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="bg-teal-500/20 text-teal-400">
                  <th className="text-left px-4 py-2.5 font-medium">Stream</th>
                  <th className="text-right px-4 py-2.5 font-medium">Dry Tonnes</th>
                  <th className="text-right px-4 py-2.5 font-medium">Weighted Grade</th>
                  <th className="text-right px-4 py-2.5 font-medium">Metal (kg)</th>
                  <th className="text-right px-4 py-2.5 font-medium">Metal (oz)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Feed', data: monthlySummary.feed, bg: 'bg-teal-400/10' },
                  { label: 'Product', data: monthlySummary.product, bg: 'bg-gold-400/10' },
                  { label: 'Tailings', data: monthlySummary.tailings, bg: 'bg-blue-500/10' },
                ].map(({ label, data, bg }) => (
                  <tr key={label} className={`${bg} border-t border-navy-500/20`}>
                    <td className="px-4 py-2.5 font-medium">{label}</td>
                    <td className="text-right px-4 py-2.5">{formatTonnes(data.dryTonnes)}</td>
                    <td className="text-right px-4 py-2.5">{formatGrade(data.weightedGrade)}</td>
                    <td className="text-right px-4 py-2.5">{formatMetal(data.containedMetal)}</td>
                    <td className="text-right px-4 py-2.5">{formatMetalOz(data.containedMetal)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-navy-500/40 bg-navy-700/50">
                  <td className="px-4 py-2.5 font-medium">Unaccounted</td>
                  <td className="text-right px-4 py-2.5">—</td>
                  <td className="text-right px-4 py-2.5">—</td>
                  <td className={`text-right px-4 py-2.5 font-bold ${Math.abs(monthlySummary.unaccountedPercent) > 5 ? 'text-red-400' : 'text-gray-300'}`}>
                    {formatMetal(monthlySummary.unaccountedMetal)}
                  </td>
                  <td className={`text-right px-4 py-2.5 font-bold ${Math.abs(monthlySummary.unaccountedPercent) > 5 ? 'text-red-400' : 'text-gray-300'}`}>
                    {monthlySummary.unaccountedPercent.toFixed(2)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recovery Summary */}
      {recoverySummary.dataPoints > 0 && (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-navy-700 rounded-lg border-t-2 border-t-teal-400 p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Avg Recovery</p>
            <p className="text-xl font-bold text-gold-400">{formatPercent(recoverySummary.averageRecovery)}%</p>
          </div>
          <div className="bg-navy-700 rounded-lg border-t-2 border-t-green-500 p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Max Recovery</p>
            <p className="text-xl font-bold text-green-400">{formatPercent(recoverySummary.maxRecovery)}%</p>
          </div>
          <div className="bg-navy-700 rounded-lg border-t-2 border-t-red-500 p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Min Recovery</p>
            <p className="text-xl font-bold text-red-400">{formatPercent(recoverySummary.minRecovery)}%</p>
          </div>
          <div className="bg-navy-700 rounded-lg border-t-2 border-t-blue-500 p-4">
            <p className="text-xs text-gray-400 uppercase mb-1">Days Reported</p>
            <p className="text-xl font-bold text-blue-400">{recoverySummary.dataPoints}</p>
          </div>
        </div>
      )}

      {/* Daily Breakdown */}
      {dailyBalances.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Daily Breakdown</h2>
          <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="bg-teal-500/20 text-teal-400">
                  <th className="text-left px-3 py-2.5 font-medium">Date</th>
                  <th className="text-right px-3 py-2.5 font-medium">Feed (t)</th>
                  <th className="text-right px-3 py-2.5 font-medium">Feed Grade</th>
                  <th className="text-right px-3 py-2.5 font-medium">Feed Metal</th>
                  <th className="text-right px-3 py-2.5 font-medium">Prod Metal</th>
                  <th className="text-right px-3 py-2.5 font-medium">Tails Grade</th>
                  <th className="text-right px-3 py-2.5 font-medium">Unacc %</th>
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailyBalances.map((mb: any) => (
                  <tr key={mb._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                    <td className="px-3 py-2">{new Date(mb.period.date).toISOString().split('T')[0]}</td>
                    <td className="text-right px-3 py-2">{formatTonnes(mb.feed.dryTonnes)}</td>
                    <td className="text-right px-3 py-2">{formatGrade(mb.feed.weightedGrade)}</td>
                    <td className="text-right px-3 py-2">{formatMetal(mb.feed.containedMetal)}</td>
                    <td className="text-right px-3 py-2 text-gold-400">{formatMetal(mb.product.containedMetal)}</td>
                    <td className="text-right px-3 py-2">{formatGrade(mb.tailings.weightedGrade)}</td>
                    <td className={`text-right px-3 py-2 font-medium ${Math.abs(mb.unaccountedPercent) > 5 ? 'text-red-400' : 'text-green-400'}`}>
                      {mb.unaccountedPercent.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 capitalize text-xs">{mb.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!monthlySummary && dailyBalances.length === 0 && (
        <div className="bg-navy-700 rounded-lg p-8 text-center border border-navy-500/30">
          <p className="text-gray-500">No data for {monthNames[month - 1]} {year}.</p>
          <p className="text-xs text-gray-600 mt-1">Generate daily mass balances first, then click "Generate Report".</p>
        </div>
      )}
    </div>
  );
}
