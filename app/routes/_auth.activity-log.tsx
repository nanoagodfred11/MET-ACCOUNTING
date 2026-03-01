import { useLoaderData, useSearchParams } from 'react-router';
import { connectDB } from '~/lib/db.server';
import { requireAuth, checkPermission } from '~/lib/auth.server';
import { getFilteredAudits, getAuditsByUser } from '~/lib/services/auditService.server';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import type { Route } from './+types/_auth.activity-log';

const PAGE_SIZE = 30;

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await requireAuth(request);
  const permission = checkPermission(user.role, '/activity-log');

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const filterAction = url.searchParams.get('action') || '';
  const filterCollection = url.searchParams.get('collection') || '';
  const filterStart = url.searchParams.get('startDate') || '';
  const filterEnd = url.searchParams.get('endDate') || '';

  const offset = (page - 1) * PAGE_SIZE;

  let result;
  if (permission === 'own-only') {
    const entries = await getAuditsByUser(user.id, PAGE_SIZE);
    result = { entries, total: entries.length };
  } else {
    result = await getFilteredAudits(
      {
        ...(filterAction && { action: filterAction }),
        ...(filterCollection && { collection: filterCollection }),
        ...(filterStart && { startDate: new Date(filterStart) }),
        ...(filterEnd && { endDate: new Date(filterEnd + 'T23:59:59') }),
      },
      PAGE_SIZE,
      offset,
    );
  }

  return {
    entries: JSON.parse(JSON.stringify(result.entries)),
    total: result.total,
    page,
    pageSize: PAGE_SIZE,
    permission,
    filters: { action: filterAction, collection: filterCollection, startDate: filterStart, endDate: filterEnd },
  };
}

export default function ActivityLogPage() {
  const { entries, total, page, pageSize, permission, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const totalPages = Math.ceil(total / pageSize);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.set('page', '1');
    setSearchParams(next);
  }

  function goToPage(p: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(p));
    setSearchParams(next);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">Activity Log</h1>
        <p className="text-sm text-gray-500">{total} entries</p>
      </div>

      {permission === 'own-only' && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-2 text-sm text-blue-400">
          Showing your own activity only.
        </div>
      )}

      {/* Filters */}
      {permission !== 'own-only' && (
        <div className="bg-navy-700 rounded-lg p-4 mb-6 border border-navy-500/30">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => updateFilter('action', e.target.value)}
                className="bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400"
              >
                <option value="">All</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="calculate">Calculate</option>
                <option value="verify">Verify</option>
                <option value="unverify">Unverify</option>
                <option value="resolve">Resolve</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Collection</label>
              <select
                value={filters.collection}
                onChange={(e) => updateFilter('collection', e.target.value)}
                className="bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400"
              >
                <option value="">All</option>
                <option value="processingData">Processing Data</option>
                <option value="assay">Assay</option>
                <option value="massBalance">Mass Balance</option>
                <option value="recovery">Recovery</option>
                <option value="reconciliation">Reconciliation</option>
                <option value="user">User</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">From</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">To</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400"
              />
            </div>

            {(filters.action || filters.collection || filters.startDate || filters.endDate) && (
              <button
                onClick={() => setSearchParams({})}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 border border-gray-600 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
        <table className="w-full text-sm min-w-[650px]">
          <thead>
            <tr className="bg-teal-500/20 text-teal-400">
              <th className="text-left px-4 py-2.5 font-medium">Timestamp</th>
              <th className="text-left px-4 py-2.5 font-medium">User</th>
              <th className="text-left px-4 py-2.5 font-medium">Action</th>
              <th className="text-left px-4 py-2.5 font-medium">Collection</th>
              <th className="text-left px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No activity found</td></tr>
            ) : entries.map((entry: any) => (
              <tr key={entry._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-gold-400 text-xs">
                  {entry.userId?.username || entry.username || 'System'}
                </td>
                <td className="px-4 py-2.5">
                  <ActionBadge action={entry.action} />
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-300 capitalize">
                  {entry.targetCollection}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[250px] truncate">
                  {entry.changes ? summarizeChanges(entry.changes) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-xs text-gray-400 border border-navy-500/30 rounded disabled:opacity-30 hover:bg-navy-700 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs text-gray-400 border border-navy-500/30 rounded disabled:opacity-30 hover:bg-navy-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: 'bg-green-500/20 text-green-400',
    update: 'bg-blue-500/20 text-blue-400',
    delete: 'bg-red-500/20 text-red-400',
    calculate: 'bg-teal-500/20 text-teal-400',
    verify: 'bg-gold-400/20 text-gold-400',
    unverify: 'bg-amber-500/20 text-amber-400',
    resolve: 'bg-purple-500/20 text-purple-400',
  };
  const cls = colors[action] || 'bg-gray-500/20 text-gray-400';

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>
      {action}
    </span>
  );
}

function summarizeChanges(changes: Record<string, unknown>): string {
  const keys = Object.keys(changes);
  if (keys.length === 0) return '—';

  const parts: string[] = [];
  for (const key of keys.slice(0, 3)) {
    const val = changes[key];
    if (typeof val === 'object' && val !== null) {
      parts.push(key);
    } else {
      parts.push(`${key}: ${val}`);
    }
  }
  if (keys.length > 3) parts.push(`+${keys.length - 3} more`);
  return parts.join(', ');
}
