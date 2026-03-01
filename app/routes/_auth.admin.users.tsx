import { useLoaderData, useFetcher } from 'react-router';
import { useState } from 'react';
import { connectDB } from '~/lib/db.server';
import { requireRole } from '~/lib/auth.server';
import { userService } from '~/lib/services/userService.server';
import { ActionMessage } from '~/components/ActionMessage';
import { RouteErrorBoundary as ErrorBoundary } from '~/components/RouteErrorBoundary';
export { ErrorBoundary };
import type { Route } from './+types/_auth.admin.users';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'met_accountant', label: 'Met Accountant' },
  { value: 'plant_manager', label: 'Plant Manager' },
  { value: 'lab_technician', label: 'Lab Technician' },
];

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  await requireRole(request, ['admin']);

  const users = await userService.getAll();
  return { users: JSON.parse(JSON.stringify(users)) };
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const user = await requireRole(request, ['admin']);
  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'create-user') {
      const username = String(formData.get('username') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const role = String(formData.get('role') || 'lab_technician');

      if (!username || !email || !password) {
        return { success: false, message: 'Username, email, and password are required' };
      }
      if (password.length < 6) {
        return { success: false, message: 'Password must be at least 6 characters' };
      }

      await userService.create({ username, email, password, role }, user.id);
      return { success: true, message: `User "${username}" created` };
    }

    if (intent === 'update-user') {
      const id = String(formData.get('id'));
      const role = String(formData.get('role'));
      if (!id) return { success: false, message: 'User ID is required' };

      await userService.update(id, { role }, user.id);
      return { success: true, message: 'User role updated' };
    }

    if (intent === 'delete-user') {
      const id = String(formData.get('id'));
      if (!id) return { success: false, message: 'User ID is required' };
      if (id === user.id) return { success: false, message: 'Cannot delete your own account' };

      await userService.delete(id, user.id);
      return { success: true, message: 'User deleted' };
    }

    return { success: false, message: 'Unknown intent' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Operation failed' };
  }
}

export default function AdminUsersPage() {
  const { users } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const actionResult = fetcher.data as { success?: boolean; message?: string } | undefined;

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-gold-400">User Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-1.5 bg-teal-500 text-white rounded-lg text-sm hover:bg-teal-600 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      <ActionMessage result={actionResult} />

      {showForm && (
        <div className="bg-navy-700 rounded-lg p-4 mb-6 border border-navy-500/30">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Create User</h3>
          <fetcher.Form method="post" className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 items-end" onSubmit={() => setShowForm(false)}>
            <input type="hidden" name="intent" value="create-user" />

            <div>
              <label className="block text-xs text-gray-400 mb-1">Username</label>
              <input name="username" type="text" required className="w-full lg:w-36 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input name="email" type="email" required className="w-full lg:w-48 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input name="password" type="password" required minLength={6} className="w-full lg:w-36 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Role</label>
              <select name="role" className="w-full lg:w-40 bg-navy-600 border border-navy-500/50 rounded px-2 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-teal-400">
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="px-4 py-1.5 bg-teal-500 text-white rounded text-sm hover:bg-teal-600 transition-colors">
              Create
            </button>
          </fetcher.Form>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-lg border border-navy-500/30 -mx-4 sm:mx-0">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="bg-teal-500/20 text-teal-400">
              <th className="text-left px-4 py-2.5 font-medium">Username</th>
              <th className="text-left px-4 py-2.5 font-medium">Email</th>
              <th className="text-left px-4 py-2.5 font-medium">Role</th>
              <th className="text-left px-4 py-2.5 font-medium">Created</th>
              <th className="text-right px-4 py-2.5 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No users found</td></tr>
            ) : users.map((u: any) => (
              <tr key={u._id} className="border-t border-navy-500/20 hover:bg-navy-700/50">
                <td className="px-4 py-2.5 text-gold-400 font-medium">{u.username}</td>
                <td className="px-4 py-2.5 text-gray-400">{u.email}</td>
                <td className="px-4 py-2.5">
                  {editingId === u._id ? (
                    <fetcher.Form method="post" className="inline-flex gap-2 items-center" onSubmit={() => setEditingId(null)}>
                      <input type="hidden" name="intent" value="update-user" />
                      <input type="hidden" name="id" value={u._id} />
                      <select name="role" defaultValue={u.role} className="bg-navy-600 border border-navy-500/50 rounded px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-teal-400">
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <button type="submit" className="text-xs text-green-400 hover:text-green-300">Save</button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-300">Cancel</button>
                    </fetcher.Form>
                  ) : (
                    <span className="capitalize text-xs bg-navy-600 px-2 py-0.5 rounded">{u.role.replace('_', ' ')}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="text-right px-4 py-2.5 space-x-2">
                  <button onClick={() => setEditingId(u._id)} className="text-xs text-teal-400 hover:text-teal-300">Edit Role</button>
                  <fetcher.Form method="post" className="inline">
                    <input type="hidden" name="intent" value="delete-user" />
                    <input type="hidden" name="id" value={u._id} />
                    <button type="submit" className="text-xs text-red-400 hover:text-red-300" onClick={(e) => { if (!confirm(`Delete user "${u.username}"?`)) e.preventDefault(); }}>
                      Delete
                    </button>
                  </fetcher.Form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
