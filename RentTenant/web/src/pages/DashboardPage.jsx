/**
 * @file pages/DashboardPage.jsx
 * @description Main dashboard — shows owner stats, today's reminders,
 * and a quick view of pending rent payments.
 *
 * Data sources:
 *   - authAPI.getMe()          → stat cards (buildings, units, tenants)
 *   - reminderAPI.getToday()   → today's reminders list
 *   - rentAPI.getPending()     → pending/overdue rents table
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Home,
  Users,
  CheckCircle2,
  Bell,
  IndianRupee,
  X,
  Loader2,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, reminderAPI, rentAPI } from '../api';

// ─── Helper: badge colour by reminder type ───────────────────────────────────
const REMINDER_BADGE = {
  rent_due:           'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  agreement_renewal:  'bg-red-500/20    text-red-400    border border-red-500/30',
  rent_increment:     'bg-blue-500/20   text-blue-400   border border-blue-500/30',
};

const REMINDER_LABEL = {
  rent_due:          'Rent Due',
  agreement_renewal: 'Agreement Renewal',
  rent_increment:    'Rent Increment',
};

// ─── Skeleton loader for stat cards ──────────────────────────────────────────
const StatCardSkeleton = () => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 bg-slate-700 rounded-lg" />
      <div className="w-8 h-8 bg-slate-700 rounded" />
    </div>
    <div className="w-16 h-7 bg-slate-700 rounded mb-1" />
    <div className="w-24 h-4 bg-slate-700 rounded" />
  </div>
);

/**
 * DashboardPage — landing page for authenticated owners.
 */
const DashboardPage = () => {
  const queryClient = useQueryClient();

  // ── Data fetching ──────────────────────────────────────────────────────────

  /** Owner profile + portfolio stats */
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authAPI.getMe().then((r) => r.data),
  });

  /** Today's due reminders */
  const { data: todayData, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders-today'],
    queryFn:  () => reminderAPI.getToday().then((r) => r.data),
  });

  /** Pending / overdue rents */
  const { data: pendingData, isLoading: rentsLoading } = useQuery({
    queryKey: ['rents-pending'],
    queryFn:  () => rentAPI.getPending().then((r) => r.data),
  });

  // Local loading state for pay action
  const [payingId, setPayingId] = useState(null);

  // ── Derived values ─────────────────────────────────────────────────────────
  const stats  = meData?.stats  || {};
  const owner  = meData?.owner  || {};
  const reminders = todayData?.reminders || [];
  const pending   = pendingData?.rents   || [];

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Dismiss a single reminder and invalidate the today list */
  const handleDismiss = async (id) => {
    try {
      await reminderAPI.dismiss(id);
      // Re-fetch today's reminders so the dismissed one disappears
      queryClient.invalidateQueries({ queryKey: ['reminders-today'] });
      toast.success('Reminder dismissed.');
    } catch {
      toast.error('Failed to dismiss reminder.');
    }
  };

  /** Quick mark-as-paid from the dashboard (defaults to cash, today's date) */
  const handleMarkPaid = async (rent) => {
    setPayingId(rent._id);
    try {
      await rentAPI.markPaid(rent._id, {
        amount_paid:     rent.amount,
        payment_mode:    'cash',
        paid_date:       new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['rents-pending'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Rent marked as paid!');
    } catch {
      toast.error('Failed to mark rent as paid.');
    } finally {
      setPayingId(null);
    }
  };

  // ── Stat cards definition ──────────────────────────────────────────────────
  const STAT_CARDS = [
    {
      label: 'Total Buildings',
      value: stats.total_buildings ?? '—',
      icon:  Building2,
      color: 'text-blue-400',
      bg:    'bg-blue-500/10',
    },
    {
      label: 'Total Units',
      value: stats.total_units ?? '—',
      icon:  Home,
      color: 'text-purple-400',
      bg:    'bg-purple-500/10',
    },
    {
      label: 'Occupied Units',
      value: stats.occupied_units ?? '—',
      icon:  CheckCircle2,
      color: 'text-green-400',
      bg:    'bg-green-500/10',
    },
    {
      label: 'Active Tenants',
      value: stats.active_tenants ?? '—',
      icon:  Users,
      color: 'text-yellow-400',
      bg:    'bg-yellow-500/10',
    },
  ];

  // Format today's date for the page title
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  return (
    <div className="space-y-8">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {today}
        </p>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {meLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="bg-slate-800 border border-slate-700 rounded-xl p-5"
              >
                {/* Icon badge */}
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${bg} mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                {/* Stat number */}
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-slate-400 text-sm mt-0.5">{label}</p>
              </div>
            ))}
      </div>

      {/* ── Two-column lower section ──────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Today's Reminders ─────────────────────────────────────────────── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-400" />
              Today&apos;s Reminders
            </h2>
            {/* Badge with count */}
            {!remindersLoading && reminders.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {reminders.length}
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-700">
            {remindersLoading ? (
              /* Skeleton rows */
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-5 py-3 animate-pulse flex items-center gap-3">
                  <div className="w-24 h-5 bg-slate-700 rounded" />
                  <div className="flex-1 h-4 bg-slate-700 rounded" />
                </div>
              ))
            ) : reminders.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">
                No reminders for today
              </div>
            ) : (
              reminders.map((r) => (
                <div key={r._id} className="px-5 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type badge */}
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1 ${REMINDER_BADGE[r.type] || 'bg-slate-700 text-slate-300'}`}>
                      {REMINDER_LABEL[r.type] || r.type}
                    </span>
                    {/* Tenant + building info */}
                    <p className="text-sm text-white truncate">{r.tenant_name}</p>
                    <p className="text-xs text-slate-400 truncate">{r.building_name}</p>
                  </div>
                  {/* Dismiss button */}
                  <button
                    onClick={() => handleDismiss(r._id)}
                    className="flex-shrink-0 text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Pending Rents ─────────────────────────────────────────────────── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-red-400" />
              Pending Rents
            </h2>
            {!rentsLoading && pending.length > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            {rentsLoading ? (
              <div className="px-5 py-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
              </div>
            ) : pending.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-500 text-sm">
                No pending rents
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                    <th className="px-5 py-2.5 text-left font-medium">Tenant</th>
                    <th className="px-3 py-2.5 text-left font-medium">Amount</th>
                    <th className="px-3 py-2.5 text-left font-medium">Due</th>
                    <th className="px-3 py-2.5 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {pending.map((rent) => (
                    <tr key={rent._id} className="hover:bg-slate-700/40 transition-colors">
                      {/* Tenant name + unit */}
                      <td className="px-5 py-3">
                        <p className="text-white font-medium truncate max-w-[120px]">
                          {rent.tenant_name}
                        </p>
                        <p className="text-slate-400 text-xs">{rent.unit_name}</p>
                      </td>
                      {/* Amount */}
                      <td className="px-3 py-3 text-white whitespace-nowrap">
                        ₹{Number(rent.amount).toLocaleString('en-IN')}
                      </td>
                      {/* Due date */}
                      <td className="px-3 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {new Date(rent.due_date).toLocaleDateString('en-IN')}
                      </td>
                      {/* Mark Paid button */}
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleMarkPaid(rent)}
                          disabled={payingId === rent._id}
                          className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed
                                     text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors
                                     flex items-center gap-1 ml-auto"
                        >
                          {payingId === rent._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            'Mark Paid'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
