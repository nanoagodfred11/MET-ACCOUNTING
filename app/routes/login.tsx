import { Form, redirect, useActionData, useNavigation } from 'react-router';
import { getUserFromSession, login, createUserSession } from '~/lib/auth.server';
import { connectDB } from '~/lib/db.server';
import type { Route } from './+types/login';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await getUserFromSession(request);
  if (user) throw redirect('/');
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await connectDB();
  const formData = await request.formData();
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  try {
    const result = await login(username, password);
    return createUserSession(result.token, '/');
  } catch (err: any) {
    return { error: err.message || 'Login failed' };
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gold-400 mb-1">Met Accounting</h1>
          <p className="text-sm text-gray-500">CIL Gold Processing Plant</p>
        </div>

        {/* Login Card */}
        <div className="bg-navy-700 rounded-lg border border-navy-500/30 p-6">
          <h2 className="text-lg font-semibold text-gray-200 mb-4">Sign In</h2>

          {actionData?.error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded px-3 py-2 mb-4">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm text-gray-400 mb-1">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoFocus
                className="w-full bg-navy-600 border border-navy-500/50 rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-teal-400 placeholder-gray-600"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-gray-400 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full bg-navy-600 border border-navy-500/50 rounded px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-teal-400 placeholder-gray-600"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded font-medium text-sm bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 hover:from-gold-400 hover:to-gold-400 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </Form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Met Accounting v2
        </p>
      </div>
    </div>
  );
}
