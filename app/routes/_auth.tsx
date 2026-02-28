import { Outlet, useLoaderData } from 'react-router';
import { requireAuth } from '~/lib/auth.server';
import { connectDB } from '~/lib/db.server';
import { Sidebar } from '~/components/Sidebar';
import type { Route } from './+types/_auth';

export async function loader({ request }: Route.LoaderArgs) {
  await connectDB();
  const user = await requireAuth(request);
  return { user };
}

export default function AuthLayout() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen">
      <Sidebar username={user.username} role={user.role} />
      <main className="pt-14 lg:pt-0 lg:ml-56 p-4 sm:p-6 min-h-screen overflow-y-auto">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
