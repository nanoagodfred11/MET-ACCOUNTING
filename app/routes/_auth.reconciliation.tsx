import { useLoaderData, useFetcher } from 'react-router';
import { useState } from 'react';
import { connectDB } from '~/lib/db.server';
import { requireAuth, checkPermission } from '~/lib/auth.server';
import { reconciliationService } from '~/lib/services/reconciliationService.server';
import { massBalanceService } from '~/lib/services/massBalanceService.server';
import { PeriodSelector } from '~/components/forms/PeriodSelector';
import { ActionMessage } from '~/components/ActionMessage';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { formatMetal, formatPercent, toISODate, parseISODate } from '~/utils/format';
import type { Route } from './+types/_auth.reconciliation';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const permission = checkPermission(user.role, '/reconciliation');
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

  const [reconciliations, massBalance, flagged] = await Promise.all([
    reconciliationService.getByPeriod(period),
    massBalanceService.getByPeriod(period),
    reconciliationService.getFlagged(),
  ]);

  return {
    date,
    periodType,
    shift: shift || '1',
    reconciliations: JSON.parse(JSON.stringify(reconciliations)),
    massBalance,
    flagged: JSON.parse(JSON.stringify(flagged)),
    canWrite: permission === 'full',
    productMetal: massBalance?.product?.containedMetal ?? null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const permission = checkPermission(user.role, '/reconciliation');
  if (permission !== 'full') {
    return { success: false, message: 'You do not have permission to perform this action' };
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'auto-reconcile') {
      const periodType = String(formData.get('periodType'));
      const date = String(formData.get('date'));
      const shift = formData.get('shift');
      const refineryMetal = parseFloat(String(formData.get('refineryMetal')));

      if (isNaN(refineryMetal) || refineryMetal < 0) {
        return { success: false, message: 'Please enter a valid refinery metal value (kg)' };
      }

      const period = {
        periodType,
        date: parseISODate(date),
        ...(periodType === 'shift' && shift ? { shift: parseInt(String(shift)) } : {}),
      };

      const recon = await reconciliationService.autoPlantVsRefinery(period, refineryMetal, user.id);
      const status = recon.isFlagged
        ? `Discrepancy ${recon.discrepancyPercent.toFixed(2)}% — FLAGGED (exceeds ${recon.threshold}% threshold)`
        : `Discrepancy ${recon.discrepancyPercent.toFixed(2)}% — within threshold`;

      return { success: true, message: status };
    }

    if (intent === 'custom-reconcile') {
      const periodType = String(formData.get('periodType'));
      const date = String(formData.get('date'));
      const shift = formData.get('shift');
      const sourceAName = String(formData.get('sourceAName')).trim();
      const sourceBName = String(formData.get('sourceBName')).trim();
      const sourceAMetal = parseFloat(String(formData.get('sourceAMetal')));
      const sourceBMetal = parseFloat(String(formData.get('sourceBMetal')));
      const threshold = parseFloat(String(formData.get('threshold') || '2'));

      if (!sourceAName || !sourceBName) {
        return { success: false, message: 'Source names are required' };
      }
      if (isNaN(sourceAMetal) || isNaN(sourceBMetal)) {
        return { success: false, message: 'Valid metal values are required' };
      }

      const period = {
        periodType,
        date: parseISODate(date),
        ...(periodType === 'shift' && shift ? { shift: parseInt(String(shift)) } : {}),
      };

      const recon = await reconciliationService.create({
        period,
        sourceAName,
        sourceBName,
        sourceAMetal,
        sourceBMetal,
        threshold,
      }, user.id);

      const status = recon.isFlagged
        ? `Discrepancy ${recon.discrepancyPercent.toFixed(2)}% — FLAGGED`
        : `Discrepancy ${recon.discrepancyPercent.toFixed(2)}% — OK`;

      return { success: true, message: status };
    }

    if (intent === 'resolve') {
      const id = String(formData.get('id'));
      const resolutionNotes = String(formData.get('resolutionNotes') || '').trim();
      if (!id) return { success: false, message: 'Reconciliation ID is required' };
      if (!resolutionNotes) return { success: false, message: 'Resolution notes are required' };

      await reconciliationService.resolve(id, resolutionNotes, user.id);
      return { success: true, message: 'Discrepancy resolved' };
    }

    return { success: false, message: 'Unknown intent' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Operation failed' };
  }
}

export default function ReconciliationPage() {
  const { date, periodType, shift, reconciliations, canWrite, productMetal, flagged } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showCustom, setShowCustom] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const actionResult = fetcher.data as { success?: boolean; message?: string } | undefined;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Reconciliation</h1>
        <PeriodSelector />
      </div>

      <ActionMessage result={actionResult} />

      {/* Plant vs Refinery — quick form */}
      {canWrite && (
        <div className="bg-navy-700 rounded-lg p-4 mb-6 border border-navy-500/30">
          <h3 className="text-sm font-medium text-gray-300 mb-1">Plant vs Refinery</h3>
          <p className="text-xs text-gray-500 mb-3">
            Compare plant product metal from mass balance against refinery return.
            {productMetal !== null && (
              <span className="text-teal-400"> Plant product: {formatMetal(productMetal)} kg Au</span>
            )}
          </p>

          {productMetal === null ? (
            <p className="text-sm text-gray-500">No mass balance for this period. Calculate mass balance first.</p>
          ) : (
            <fetcher.Form method="post" className="flex flex-wrap gap-3 items-end">
              <input type="hidden" name="intent" value="auto-reconcile" />
              <input type="hidden" name="periodType" value={periodType} />
              <input type="hidden" name="date" value={date} />
              {periodType === 'shift' && <input type="hidden" name="shift" value={shift} />}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Refinery Return (kg Au)</label>
                <input
                  name="refineryMetal"
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  className="w-40 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400"
                  placeholder="e.g. 62.5"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 transition-colors"
              >
                Reconcile
              </button>

              <button
                type="button"
                onClick={() => setShowCustom(!showCustom)}
                className="px-4 py-1.5 border border-gray-600 text-gray-400 rounded text-sm hover:border-gray-500 transition-colors"
              >
                {showCustom ? 'Hide Custom' : 'Custom Compare'}
              </button>
            </fetcher.Form>
          )}
        </div>
      )}

      {/* Custom reconciliation form */}
      {canWrite && showCustom && (
        <div className="bg-navy-700 rounded-lg p-4 mb-6 border border-gold-400/30">
          <h3 className="text-sm font-medium text-gold-400 mb-3">Custom Reconciliation</h3>
          <fetcher.Form method="post" className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 items-end" onSubmit={() => setShowCustom(false)}>
            <input type="hidden" name="intent" value="custom-reconcile" />
            <input type="hidden" name="periodType" value={periodType} />
            <input type="hidden" name="date" value={date} />
            {periodType === 'shift' && <input type="hidden" name="shift" value={shift} />}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Source A Name</label>
              <input name="sourceAName" type="text" required className="w-full lg:w-36 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" placeholder="e.g. Plant Product" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source A Metal (kg)</label>
              <input name="sourceAMetal" type="number" step="0.001" min="0" required className="w-full lg:w-32 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source B Name</label>
              <input name="sourceBName" type="text" required className="w-full lg:w-36 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" placeholder="e.g. Refinery Return" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Source B Metal (kg)</label>
              <input name="sourceBMetal" type="number" step="0.001" min="0" required className="w-full lg:w-32 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Threshold %</label>
              <input name="threshold" type="number" step="0.1" min="0" defaultValue="2" className="w-full lg:w-20 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>

            <button type="submit" className="px-4 py-1.5 bg-gold-400 text-navy-950 rounded text-sm font-medium hover:bg-gold-500 transition-colors">
              Compare
            </button>
          </fetcher.Form>
        </div>
      )}

      {/* Period reconciliations */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
          Reconciliations for {date}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-teal-500/20 text-teal-400">
                <th className="text-left px-4 py-2.5 font-medium">Source A</th>
                <th className="text-right px-4 py-2.5 font-medium">Metal (kg)</th>
                <th className="text-left px-4 py-2.5 font-medium">Source B</th>
                <th className="text-right px-4 py-2.5 font-medium">Metal (kg)</th>
                <th className="text-right px-4 py-2.5 font-medium">Discrepancy</th>
                <th className="text-center px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reconciliations.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600">No reconciliations for this period</td></tr>
              ) : reconciliations.map((r: any) => (
                <tr key={r._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                  <td className="px-4 py-2.5 text-gray-300">{r.sourceAName}</td>
                  <td className="text-right px-4 py-2.5">{formatMetal(r.sourceAMetal)}</td>
                  <td className="px-4 py-2.5 text-gray-300">{r.sourceBName}</td>
                  <td className="text-right px-4 py-2.5">{formatMetal(r.sourceBMetal)}</td>
                  <td className={`text-right px-4 py-2.5 font-medium ${r.isFlagged ? 'text-red-400' : 'text-green-400'}`}>
                    {formatPercent(r.discrepancyPercent)}%
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <StatusBadge flagged={r.isFlagged} resolved={r.isResolved} />
                  </td>
                  <td className="text-right px-4 py-2.5">
                    {r.isFlagged && !r.isResolved && canWrite && (
                      <button
                        onClick={() => setResolvingId(resolvingId === r._id ? null : r._id)}
                        className="text-xs text-teal-400 hover:text-teal-300"
                      >
                        Resolve
                      </button>
                    )}
                    {r.isResolved && (
                      <span className="text-xs text-gray-500" title={r.resolutionNotes}>Resolved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolve form */}
      {resolvingId && (
        <div className="bg-navy-700 rounded-lg p-4 mb-6 border border-teal-400/30">
          <h3 className="text-sm font-medium text-teal-400 mb-3">Resolve Discrepancy</h3>
          <fetcher.Form method="post" className="flex flex-wrap gap-3 items-end" onSubmit={() => setResolvingId(null)}>
            <input type="hidden" name="intent" value="resolve" />
            <input type="hidden" name="id" value={resolvingId} />
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-400 mb-1">Resolution Notes</label>
              <input
                name="resolutionNotes"
                type="text"
                required
                className="w-full bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400"
                placeholder="Explain the resolution..."
              />
            </div>
            <button type="submit" className="px-4 py-1.5 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 transition-colors">
              Submit
            </button>
            <button type="button" onClick={() => setResolvingId(null)} className="px-4 py-1.5 border border-gray-600 text-gray-400 rounded text-sm hover:border-gray-500 transition-colors">
              Cancel
            </button>
          </fetcher.Form>
        </div>
      )}

      {/* All flagged discrepancies */}
      {flagged.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-red-400 uppercase tracking-wider mb-3">
            Open Flagged Discrepancies
          </h2>
          <div className="overflow-x-auto rounded-lg border border-red-500/30 -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-red-500/10 text-red-400">
                  <th className="text-left px-4 py-2.5 font-medium">Period</th>
                  <th className="text-left px-4 py-2.5 font-medium">Sources</th>
                  <th className="text-right px-4 py-2.5 font-medium">Discrepancy</th>
                  <th className="text-right px-4 py-2.5 font-medium">Threshold</th>
                  <th className="text-left px-4 py-2.5 font-medium">Created</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((r: any) => (
                  <tr key={r._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {r.period?.date ? new Date(r.period.date).toISOString().split('T')[0] : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className="text-gray-300">{r.sourceAName}</span>
                      <span className="text-gray-600"> vs </span>
                      <span className="text-gray-300">{r.sourceBName}</span>
                    </td>
                    <td className="text-right px-4 py-2.5 text-red-400 font-medium">
                      {formatPercent(r.discrepancyPercent)}%
                    </td>
                    <td className="text-right px-4 py-2.5 text-gray-500">
                      {r.threshold}%
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-right px-4 py-2.5">
                      {canWrite && (
                        <button
                          onClick={() => setResolvingId(r._id)}
                          className="text-xs text-teal-400 hover:text-teal-300"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ flagged, resolved }: { flagged: boolean; resolved: boolean }) {
  if (!flagged) {
    return <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">OK</span>;
  }
  if (resolved) {
    return <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">Resolved</span>;
  }
  return <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">Flagged</span>;
}
