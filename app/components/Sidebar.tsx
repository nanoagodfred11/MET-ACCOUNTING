import { NavLink, Form } from 'react-router';
import { useState } from 'react';
import { LayoutDashboard, PencilLine, Scale, TrendingUp, FileText, LogOut, Menu, X } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/data-entry', label: 'Data Entry', icon: PencilLine },
  { to: '/mass-balance', label: 'Mass Balance', icon: Scale },
  { to: '/recovery', label: 'Recovery', icon: TrendingUp },
  { to: '/monthly', label: 'Monthly Report', icon: FileText },
];

export function Sidebar({ username, role }: { username: string; role: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-navy-900 border-b border-navy-500/30 flex items-center justify-between px-4 z-50 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-navy-700 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="text-gold-400 text-base font-bold tracking-tight">Met Accounting</h1>
        </div>
        <div className="text-right">
          <p className="text-gold-400 text-xs font-medium">{username}</p>
          <p className="text-[10px] text-teal-400/80 capitalize">{role.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-56 bg-navy-900 border-r border-navy-500/30 flex flex-col z-50 no-print transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-navy-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-gold-400 text-lg font-bold tracking-tight">Met Accounting</h1>
              <p className="text-xs text-navy-500 mt-0.5">CIL Gold Plant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-200"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-teal-400 bg-teal-400/10 border-r-2 border-teal-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-navy-700/50'
                }`
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-navy-500/30">
          <div className="mb-3">
            <p className="text-gold-400 text-sm font-medium">{username}</p>
            <p className="text-xs text-teal-400/80 capitalize">{role.replace('_', ' ')}</p>
          </div>
          <Form method="post" action="/logout">
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors w-full"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Logout</span>
            </button>
          </Form>
        </div>
      </aside>
    </>
  );
}
