import { useLoaderData } from 'react-router';
import { connectDB } from '~/lib/db.server';
import { requireAuth } from '~/lib/auth.server';
import { ProcessingData } from '~/lib/models/ProcessingData.server';
import { Assay } from '~/lib/models/Assay.server';
import { AuditLog } from '~/lib/models/AuditLog.server';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import { toISODate, parseISODate, formatTonnes } from '~/utils/format';
import type { Route } from './+types/_auth.shift-handover';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  await requireAuth(request);

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || toISODate(new Date());
  const d = parseISODate(date);

  // Get today's processing data with user info
  const todayQuery = { 'period.periodType': 'daily', 'period.date': d };

  const [processingData, assays, recentActivity] = await Promise.all([
    ProcessingData.find(todayQuery)
      .populate('samplingPoint')
      .populate('enteredBy', 'username')
      .populate('updatedBy', 'username')
      .sort({ updatedAt: -1 })
      .lean()
      .exec(),
    Assay.find(todayQuery)
      .populate('samplingPoint')
      .sort({ updatedAt: -1 })
      .lean()
      .exec(),
    AuditLog.find({ timestamp: { $gte: new Date(d.getTime() - 24 * 60 * 60 * 1000) } })
      .populate('userId', 'username')
      .sort({ timestamp: -1 })
      .limit(20)
      .lean()
      .exec(),
  ]);

  // Compute per-user activity summary
  const userActivityMap: Record<string, { username: string; actions: number; lastAction: string }> = {};
  for (const entry of recentActivity) {
    const uname = (entry.userId as any)?.username || entry.username || 'System';
    if (!userActivityMap[uname]) {
      userActivityMap[uname] = { username: uname, actions: 0, lastAction: '' };
    }
    userActivityMap[uname].actions++;
    if (!userActivityMap[uname].lastAction) {
      userActivityMap[uname].lastAction = `${entry.action} ${entry.targetCollection}`;
    }
  }
  const userActivity = Object.values(userActivityMap).sort((a, b) => b.actions - a.actions);

  // Pending items
  const pendingAssays = assays.filter((a: any) => !a.isVerified).length;
  const draftRecords = processingData.filter((pd: any) => pd.status === 'draft').length;

  return {
    date,
    processingData: JSON.parse(JSON.stringify(processingData)),
    assayStats: {
      total: assays.length,
      pending: pendingAssays,
      verified: assays.length - pendingAssays,
    },
    pendingItems: {
      unverifiedAssays: pendingAssays,
      draftRecords,
    },
    userActivity,
    recentActivity: JSON.parse(JSON.stringify(recentActivity.slice(0, 10))),
  };
}

export default function ShiftHandoverPage() {
  const { date, processingData, assayStats, pendingItems, userActivity, recentActivity } = useLoaderData<typeof loader>();

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Shift Handover</h1>
        <p className="text-sm text-gray-500">Date: {date}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryCard title="Data Records" value={processingData.length} subtitle="Today's entries" accent="teal" />
        <SummaryCard title="Assays" value={`${assayStats.verified}/${assayStats.total}`} subtitle="Verified" accent="gold" />
        <SummaryCard title="Pending Assays" value={pendingItems.unverifiedAssays} subtitle="Need verification" accent={pendingItems.unverifiedAssays > 0 ? 'red' : 'green'} />
        <SummaryCard title="Draft Records" value={pendingItems.draftRecords} subtitle="Need finalization" accent={pendingItems.draftRecords > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Activity */}
        <div className="bg-navy-700 rounded-lg border-t-2 border-t-teal-400 p-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">User Activity (24h)</h2>
          {userActivity.length === 0 ? (
            <p className="text-gray-600 text-sm">No activity recorded</p>
          ) : (
            <div className="space-y-2">
              {userActivity.map((u: any) => (
                <div key={u.username} className="flex items-center justify-between bg-navy-600/50 rounded px-3 py-2">
                  <div>
                    <p className="text-sm text-gold-400 font-medium">{u.username}</p>
                    <p className="text-[10px] text-gray-500">Last: {u.lastAction}</p>
                  </div>
                  <span className="text-xs text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded">
                    {u.actions} actions
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-navy-700 rounded-lg border-t-2 border-t-gold-400 p-4">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Recent Activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-gray-600 text-sm">No recent activity</p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((entry: any) => (
                <div key={entry._id} className="flex items-center gap-3 text-xs py-1.5 border-b border-navy-500/20 last:border-0">
                  <span className="text-gray-500 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-gold-400">{entry.userId?.username || 'System'}</span>
                  <span className="text-gray-400">
                    {entry.action} <span className="text-gray-500">{entry.targetCollection}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today's Data Summary */}
      {processingData.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Today's Data</h2>
          <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
            <table className="w-full text-sm min-w-[550px]">
              <thead>
                <tr className="bg-teal-500/20 text-teal-400">
                  <th className="text-left px-4 py-2.5 font-medium">Sampling Point</th>
                  <th className="text-right px-4 py-2.5 font-medium">Dry Tonnes</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium">Entered By</th>
                  <th className="text-left px-4 py-2.5 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {processingData.map((pd: any) => (
                  <tr key={pd._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                    <td className="px-4 py-2.5">{pd.samplingPoint?.name || 'Unknown'}</td>
                    <td className="text-right px-4 py-2.5 text-gold-400">{formatTonnes(pd.dryTonnes)}</td>
                    <td className="px-4 py-2.5 capitalize text-xs">{pd.status}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {pd.enteredBy?.username || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">
                      {new Date(pd.updatedAt).toLocaleTimeString()}
                      {pd.updatedBy?.username && (
                        <span className="text-gray-600"> by {pd.updatedBy.username}</span>
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

function SummaryCard({ title, value, subtitle, accent }: { title: string; value: string | number; subtitle: string; accent: string }) {
  const borderColors: Record<string, string> = {
    teal: 'border-t-teal-400',
    gold: 'border-t-gold-400',
    red: 'border-t-red-500',
    green: 'border-t-green-500',
    blue: 'border-t-blue-500',
  };

  return (
    <div className={`bg-navy-700 rounded-lg border-t-2 ${borderColors[accent] || borderColors.teal} p-4`}>
      <p className="text-xs text-gray-400 uppercase mb-1">{title}</p>
      <p className="text-xl font-bold text-gold-400">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
    </div>
  );
}
