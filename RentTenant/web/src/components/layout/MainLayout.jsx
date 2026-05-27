/**
 * @file components/layout/MainLayout.jsx
 * @description Main app layout with sidebar navigation and top header.
 * All protected pages are rendered as children via React Router's <Outlet>.
 */

import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  IndianRupee,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { reminderAPI } from '../../api';

/**
 * Navigation link definitions.
 * Each entry maps to a sidebar item with an icon, label, and route path.
 */
const NAV_LINKS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard',  end: true },
  { to: '/buildings', icon: Building2,       label: 'Buildings'              },
  { to: '/tenants',   icon: Users,           label: 'Tenants'                },
  { to: '/rents',     icon: IndianRupee,     label: 'Rent'                   },
  { to: '/reminders', icon: Bell,            label: 'Reminders'              },
  { to: '/profile',   icon: User,            label: 'Profile'                },
];

/**
 * MainLayout renders the sidebar + top bar + page content.
 * On mobile, the sidebar is hidden by default and toggled via the menu button.
 */
const MainLayout = () => {
  const { owner, logout }     = useAuth();
  const navigate              = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Poll unread notification count for the bell badge in the header
  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn:  () => reminderAPI.getUnreadCount().then((r) => r.data),
    refetchInterval: 60000, // Refresh every 60 seconds
  });

  const unreadCount = unreadData?.unread_count || 0;

  /** Handle logout — clears auth state and redirects to /login */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* ── Mobile Overlay ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-slate-800 border-r border-slate-700
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Sidebar Header — Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-400" />
            <span className="text-white font-bold text-lg">RentManager</span>
          </div>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_LINKS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
              {/* Show unread badge on Reminders link */}
              {label === 'Reminders' && unreadCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer — Owner info + Logout */}
        <div className="px-3 py-4 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            {/* Owner avatar (first letter of name) */}
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {owner?.name?.charAt(0).toUpperCase() || 'O'}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{owner?.name}</p>
              <p className="text-slate-400 text-xs truncate">{owner?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 text-slate-400 text-sm lg:hidden">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white">RentManager</span>
          </div>

          {/* Notification bell (top-right) */}
          <div className="ml-auto flex items-center gap-3">
            <NavLink
              to="/reminders"
              className="relative text-slate-400 hover:text-white transition-colors p-2"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </NavLink>

            <NavLink
              to="/profile"
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm"
            >
              {owner?.name?.charAt(0).toUpperCase() || 'O'}
            </NavLink>
          </div>
        </header>

        {/* Page Content (scrollable) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
