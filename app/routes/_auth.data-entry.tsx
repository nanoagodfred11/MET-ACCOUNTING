import { useLoaderData, useFetcher, useSearchParams } from 'react-router';
import { useState } from 'react';
import { connectDB } from '~/lib/db.server';
import { requireAuth, checkPermission } from '~/lib/auth.server';
import { SamplingPoint } from '~/lib/models/SamplingPoint.server';
import { processingDataService } from '~/lib/services/processingDataService.server';
import { assayService } from '~/lib/services/assayService.server';
import { PeriodSelector } from '~/components/forms/PeriodSelector';
import { ActionMessage } from '~/components/ActionMessage';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { createProcessingDataSchema, updateProcessingDataSchema, createAssaySchema, firstError } from '~/lib/validations.server';
import { formatTonnes, formatGrade, toISODate, parseISODate } from '~/utils/format';
import type { Route } from './+types/_auth.data-entry';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await requireAuth(request);

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || toISODate(new Date());
  const periodType = url.searchParams.get('periodType') || 'daily';
  const shift = url.searchParams.get('shift');

  const period = {
    periodType,
    date: parseISODate(date),
    ...(periodType === 'shift' && shift ? { shift: parseInt(shift) } : {}),
  };

  const [samplingPoints, processingData, periodAssays, pendingAssays, verifiedAssays] = await Promise.all([
    SamplingPoint.find({ isActive: true }).sort({ sortOrder: 1 }).lean(),
    processingDataService.getByPeriod(period),
    assayService.getByPeriod(period),
    assayService.getPending(),
    assayService.getVerified(),
  ]);

  const permission = checkPermission(user.role, '/data-entry');

  const serialize = (v: any) => JSON.parse(JSON.stringify(v));

  return {
    user,
    permission,
    date,
    periodType,
    shift: shift || '1',
    samplingPoints: serialize(samplingPoints),
    processingData: serialize(processingData),
    periodAssays: serialize(periodAssays),
    pendingAssays: serialize(pendingAssays),
    verifiedAssays: serialize(verifiedAssays),
  };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get('intent');

  const permission = checkPermission(user.role, '/data-entry');

  try {
    if (intent === 'create-processing-data') {
      if (permission === 'read-only' || permission === 'assay-only') {
        return { success: false, message: 'You do not have permission to create tonnage data' };
      }
      const raw = Object.fromEntries(formData);
      const parsed = createProcessingDataSchema.safeParse(raw);
      if (!parsed.success) return { success: false, message: firstError(parsed.error) };
      const { samplingPointId, periodType, date, shift, wetTonnes, moisturePercent, notes } = parsed.data;

      await processingDataService.create({
        samplingPointId,
        period: {
          periodType,
          date: parseISODate(date),
          ...(periodType === 'shift' && shift ? { shift } : {}),
        },
        wetTonnes,
        moisturePercent,
        notes: notes || '',
      }, undefined, user.id);

      return { success: true, message: 'Tonnage data created' };
    }

    if (intent === 'update-processing-data') {
      if (permission === 'read-only' || permission === 'assay-only') {
        return { success: false, message: 'You do not have permission to update tonnage data' };
      }
      const raw = Object.fromEntries(formData);
      const parsed = updateProcessingDataSchema.safeParse(raw);
      if (!parsed.success) return { success: false, message: firstError(parsed.error) };
      const { id, wetTonnes, moisturePercent, notes } = parsed.data;

      await processingDataService.update(id, { wetTonnes, moisturePercent, notes: notes || '' }, undefined, user.id);
      return { success: true, message: 'Tonnage data updated' };
    }

    if (intent === 'delete-processing-data') {
      if (permission === 'read-only' || permission === 'assay-only') {
        return { success: false, message: 'You do not have permission to delete tonnage data' };
      }
      const id = String(formData.get('id'));
      if (!id) return { success: false, message: 'Record ID is required' };
      await processingDataService.delete(id, undefined, user.id);
      return { success: true, message: 'Tonnage data deleted' };
    }

    if (intent === 'create-assay') {
      const raw = Object.fromEntries(formData);
      const parsed = createAssaySchema.safeParse(raw);
      if (!parsed.success) return { success: false, message: firstError(parsed.error) };
      const { processingDataId, samplingPointId, periodType, date, shift, grade, labSampleId, notes } = parsed.data;

      await assayService.create({
        processingDataId,
        samplingPointId,
        period: {
          periodType,
          date: parseISODate(date),
          ...(periodType === 'shift' && shift ? { shift } : {}),
        },
        grade,
        labSampleId: labSampleId || '',
        notes: notes || '',
      }, user.id);

      return { success: true, message: 'Assay created' };
    }

    if (intent === 'verify-assay') {
      if (permission === 'read-only') {
        return { success: false, message: 'You do not have permission to verify assays' };
      }
      const id = String(formData.get('id'));
      if (!id) return { success: false, message: 'Assay ID is required' };
      await assayService.verify(id, user.id);
      return { success: true, message: 'Assay verified' };
    }

    if (intent === 'unverify-assay') {
      if (permission === 'read-only') {
        return { success: false, message: 'You do not have permission to unverify assays' };
      }
      const id = String(formData.get('id'));
      if (!id) return { success: false, message: 'Assay ID is required' };
      await assayService.unverify(id, user.id);
      return { success: true, message: 'Assay unverified' };
    }

    return { success: false, message: 'Unknown intent' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Operation failed' };
  }
}

export default function DataEntryPage() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'tonnage' | 'assays'>('tonnage');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAssayForm, setShowAssayForm] = useState<string | null>(null);

  const date = searchParams.get('date') || data.date;
  const periodType = searchParams.get('periodType') || data.periodType;
  const shift = searchParams.get('shift') || data.shift;
  const permission = data.permission;
  const canWriteTonnage = permission === 'full';
  const canWriteAssay = permission === 'full' || permission === 'assay-only';

  const actionResult = fetcher.data as { success?: boolean; message?: string } | undefined;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Data Entry</h1>
        <PeriodSelector />
      </div>

      {permission === 'read-only' && (
        <div className="mb-4 bg-gold-400/10 border border-gold-400/30 rounded-lg px-4 py-2 text-sm text-gold-400">
          Read-only access — you cannot modify data on this page.
        </div>
      )}
      {permission === 'assay-only' && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-400">
          You can create and manage assays only. Tonnage data is read-only.
        </div>
      )}

      <ActionMessage result={actionResult} />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-navy-500/30">
        <button
          onClick={() => setActiveTab('tonnage')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tonnage' ? 'border-teal-400 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
        >
          Tonnage Data
        </button>
        <button
          onClick={() => setActiveTab('assays')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assays' ? 'border-teal-400 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-200'}`}
        >
          Assay Results
        </button>
      </div>

      {activeTab === 'tonnage' && (
        <TonnageTab
          samplingPoints={data.samplingPoints}
          processingData={data.processingData}
          date={date}
          periodType={periodType}
          shift={shift}
          fetcher={fetcher}
          editingId={editingId}
          setEditingId={setEditingId}
          showAssayForm={showAssayForm}
          setShowAssayForm={setShowAssayForm}
          canWriteTonnage={canWriteTonnage}
          canWriteAssay={canWriteAssay}
        />
      )}

      {activeTab === 'assays' && (
        <AssaysTab
          pendingAssays={data.pendingAssays}
          verifiedAssays={data.verifiedAssays}
          fetcher={fetcher}
          canVerify={canWriteAssay}
        />
      )}
    </div>
  );
}

function TonnageTab({
  samplingPoints,
  processingData,
  date,
  periodType,
  shift,
  fetcher,
  editingId,
  setEditingId,
  showAssayForm,
  setShowAssayForm,
  canWriteTonnage = true,
  canWriteAssay = true,
}: any) {
  return (
    <div>
      {/* Create form */}
      {canWriteTonnage && <div className="bg-navy-700 rounded-lg p-4 mb-6 border border-navy-500/30">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Add Tonnage Record</h3>
        <fetcher.Form method="post" className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 items-end">
          <input type="hidden" name="intent" value="create-processing-data" />
          <input type="hidden" name="periodType" value={periodType} />
          <input type="hidden" name="date" value={date} />
          {periodType === 'shift' && <input type="hidden" name="shift" value={shift} />}

          <div className="sm:col-span-2 lg:w-auto">
            <label className="block text-xs text-gray-400 mb-1">Sampling Point</label>
            <select name="samplingPointId" required className="w-full lg:w-auto bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400">
              <option value="">Select...</option>
              {samplingPoints.map((sp: any) => (
                <option key={sp._id} value={sp._id}>{sp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Wet Tonnes</label>
            <input name="wetTonnes" type="number" step="0.001" min="0" required className="w-full lg:w-28 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Moisture %</label>
            <input name="moisturePercent" type="number" step="0.01" min="0" max="100" required className="w-full lg:w-28 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
          </div>

          <div className="sm:col-span-2 lg:col-span-1 lg:w-auto">
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <input name="notes" type="text" className="w-full lg:w-40 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" placeholder="Optional" />
          </div>

          <button type="submit" className="px-4 py-1.5 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 transition-colors sm:col-span-2 lg:col-span-1 lg:w-auto">
            Add
          </button>
        </fetcher.Form>
      </div>}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-teal-500/20 text-teal-400">
              <th className="text-left px-3 sm:px-4 py-2.5 font-medium">Sampling Point</th>
              <th className="text-right px-3 sm:px-4 py-2.5 font-medium">Wet Tonnes</th>
              <th className="text-right px-3 sm:px-4 py-2.5 font-medium">Moisture %</th>
              <th className="text-right px-3 sm:px-4 py-2.5 font-medium">Dry Tonnes</th>
              <th className="text-left px-3 sm:px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-3 sm:px-4 py-2.5 font-medium">Notes</th>
              <th className="text-right px-3 sm:px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {processingData.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-600">No data for this period</td></tr>
            ) : processingData.map((pd: any) => {
              const sp = pd.samplingPoint;
              const isEditing = editingId === pd._id;

              if (isEditing) {
                return (
                  <tr key={pd._id} className="border-t border-navy-500/20 bg-navy-600/50">
                    <td className="px-4 py-2.5">{sp?.name || 'Unknown'}</td>
                    <td className="px-4 py-1">
                      <fetcher.Form method="post" id={`edit-${pd._id}`} className="flex gap-2 items-center justify-end">
                        <input type="hidden" name="intent" value="update-processing-data" />
                        <input type="hidden" name="id" value={pd._id} />
                        <input name="wetTonnes" type="number" step="0.001" defaultValue={pd.wetTonnes} className="w-24 bg-navy-600 border border-navy-500/50 rounded px-2 py-1 text-sm text-gray-200 text-right focus:outline-none focus:border-teal-400" />
                      </fetcher.Form>
                    </td>
                    <td className="text-right px-4 py-1">
                      <input name="moisturePercent" form={`edit-${pd._id}`} type="number" step="0.01" defaultValue={pd.moisturePercent} className="w-20 bg-navy-600 border border-navy-500/50 rounded px-2 py-1 text-sm text-gray-200 text-right focus:outline-none focus:border-teal-400" />
                    </td>
                    <td className="text-right px-4 py-2.5 text-gray-500">auto</td>
                    <td className="px-4 py-2.5 capitalize text-xs">{pd.status}</td>
                    <td className="px-4 py-1">
                      <input name="notes" form={`edit-${pd._id}`} type="text" defaultValue={pd.notes || ''} className="w-32 bg-navy-600 border border-navy-500/50 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
                    </td>
                    <td className="text-right px-4 py-2.5 space-x-2">
                      <button type="submit" form={`edit-${pd._id}`} className="text-xs text-green-400 hover:text-green-300" onClick={() => setEditingId(null)}>Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-300">Cancel</button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={pd._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                  <td className="px-4 py-2.5">{sp?.name || 'Unknown'}</td>
                  <td className="text-right px-4 py-2.5">{formatTonnes(pd.wetTonnes)}</td>
                  <td className="text-right px-4 py-2.5">{pd.moisturePercent.toFixed(2)}%</td>
                  <td className="text-right px-4 py-2.5 text-gold-400">{formatTonnes(pd.dryTonnes)}</td>
                  <td className="px-4 py-2.5 capitalize text-xs">{pd.status}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{pd.notes || '—'}</td>
                  <td className="text-right px-4 py-2.5 space-x-2">
                    {pd.status !== 'locked' && canWriteTonnage && (
                      <>
                        <button onClick={() => setEditingId(pd._id)} className="text-xs text-teal-400 hover:text-teal-300">Edit</button>
                        <fetcher.Form method="post" className="inline">
                          <input type="hidden" name="intent" value="delete-processing-data" />
                          <input type="hidden" name="id" value={pd._id} />
                          <button type="submit" className="text-xs text-red-400 hover:text-red-300" onClick={(e) => { if (!confirm('Delete this record?')) e.preventDefault(); }}>Del</button>
                        </fetcher.Form>
                      </>
                    )}
                    {canWriteAssay && <button onClick={() => setShowAssayForm(showAssayForm === pd._id ? null : pd._id)} className="text-xs text-gold-400 hover:text-gold-300">+Assay</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inline assay form */}
      {showAssayForm && (
        <div className="mt-4 bg-navy-700 rounded-lg p-4 border border-gold-400/30">
          <h3 className="text-sm font-medium text-gold-400 mb-3">Add Assay for Record</h3>
          <fetcher.Form method="post" className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 items-end" onSubmit={() => setShowAssayForm(null)}>
            <input type="hidden" name="intent" value="create-assay" />
            <input type="hidden" name="processingDataId" value={showAssayForm} />
            <input type="hidden" name="samplingPointId" value={processingData.find((pd: any) => pd._id === showAssayForm)?.samplingPoint?._id || ''} />
            <input type="hidden" name="periodType" value={periodType} />
            <input type="hidden" name="date" value={date} />
            {periodType === 'shift' && <input type="hidden" name="shift" value={shift} />}

            <div>
              <label className="block text-xs text-gray-400 mb-1">Grade (g/t Au)</label>
              <input name="grade" type="number" step="0.01" min="0" required className="w-full lg:w-28 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Lab Sample ID</label>
              <input name="labSampleId" type="text" className="w-full lg:w-32 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" placeholder="Optional" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Notes</label>
              <input name="notes" type="text" className="w-full lg:w-32 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" placeholder="Optional" />
            </div>

            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <button type="submit" className="px-4 py-1.5 bg-gold-400 text-navy-950 rounded text-sm font-medium hover:bg-gold-500 transition-colors">
                Save Assay
              </button>
              <button type="button" onClick={() => setShowAssayForm(null)} className="px-4 py-1.5 border border-gray-600 text-gray-400 rounded text-sm hover:border-gray-500 transition-colors">
                Cancel
              </button>
            </div>
          </fetcher.Form>
        </div>
      )}
    </div>
  );
}

function AssaysTab({ pendingAssays, verifiedAssays, fetcher, canVerify = true }: any) {
  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <h3 className="text-sm font-medium text-gold-400 mb-3 uppercase tracking-wider">Pending Verification</h3>
        <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-gold-400/10 text-gold-400">
                <th className="text-left px-4 py-2.5 font-medium">Sampling Point</th>
                <th className="text-right px-4 py-2.5 font-medium">Grade (g/t)</th>
                <th className="text-left px-4 py-2.5 font-medium">Lab ID</th>
                <th className="text-left px-4 py-2.5 font-medium">Period</th>
                <th className="text-right px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingAssays.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-600">No pending assays</td></tr>
              ) : pendingAssays.map((a: any) => (
                <tr key={a._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                  <td className="px-4 py-2.5">{a.samplingPoint?.name || 'Unknown'}</td>
                  <td className="text-right px-4 py-2.5 text-gold-400">{formatGrade(a.grade)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.labSampleId || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{a.period?.date ? new Date(a.period.date).toISOString().split('T')[0] : '—'}</td>
                  <td className="text-right px-4 py-2.5">
                    {canVerify && (
                      <fetcher.Form method="post" className="inline">
                        <input type="hidden" name="intent" value="verify-assay" />
                        <input type="hidden" name="id" value={a._id} />
                        <button type="submit" className="text-xs text-green-400 hover:text-green-300 font-medium">Verify</button>
                      </fetcher.Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verified */}
      <div>
        <h3 className="text-sm font-medium text-teal-400 mb-3 uppercase tracking-wider">Verified Assays</h3>
        <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="bg-teal-500/20 text-teal-400">
                <th className="text-left px-4 py-2.5 font-medium">Sampling Point</th>
                <th className="text-right px-4 py-2.5 font-medium">Grade (g/t)</th>
                <th className="text-left px-4 py-2.5 font-medium">Lab ID</th>
                <th className="text-left px-4 py-2.5 font-medium">Period</th>
                <th className="text-right px-4 py-2.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {verifiedAssays.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-600">No verified assays</td></tr>
              ) : verifiedAssays.map((a: any) => (
                <tr key={a._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                  <td className="px-4 py-2.5">{a.samplingPoint?.name || 'Unknown'}</td>
                  <td className="text-right px-4 py-2.5">{formatGrade(a.grade)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{a.labSampleId || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400">{a.period?.date ? new Date(a.period.date).toISOString().split('T')[0] : '—'}</td>
                  <td className="text-right px-4 py-2.5">
                    {canVerify && (
                      <fetcher.Form method="post" className="inline">
                        <input type="hidden" name="intent" value="unverify-assay" />
                        <input type="hidden" name="id" value={a._id} />
                        <button type="submit" className="text-xs text-amber-400 hover:text-amber-300 font-medium">Unverify</button>
                      </fetcher.Form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
