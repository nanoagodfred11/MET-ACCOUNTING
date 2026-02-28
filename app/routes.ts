import { type RouteConfig, index, route, layout } from '@react-router/dev/routes';

export default [
  route('login', 'routes/login.tsx'),
  route('logout', 'routes/logout.tsx'),
  layout('routes/_auth.tsx', [
    index('routes/_auth.dashboard.tsx'),
    route('data-entry', 'routes/_auth.data-entry.tsx'),
    route('mass-balance', 'routes/_auth.mass-balance.tsx'),
    route('recovery', 'routes/_auth.recovery.tsx'),
    route('monthly', 'routes/_auth.monthly.tsx'),
  ]),
] satisfies RouteConfig;
