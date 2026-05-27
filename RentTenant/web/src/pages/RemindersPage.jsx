/**
 * @file pages/RemindersPage.jsx
 * @description Reminders & Alerts page — shows three categorised reminder sections
 * (Agreement Renewals, Rent Due, Rent Increment) and an in-app notifications panel.
 *
 * Data sources:
 *   - reminderAPI.getAll()          → all reminders (grouped by type client-side)
 *   - reminderAPI.getNotifications() → in-app notification list
 *   - reminderAPI.dismiss(id)       → dismiss a single reminder
 *   - reminderAPI.markAllRead()     → mark every notification as read
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  FileText,
  IndianRupee,
  TrendingUp,
  X,
  Loader2,
  CheckCheck,
  RefreshCw,
  Calendar,
  Building2,
  Home,
  Circle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reminderAPI } from '../api';

// ─── Section configuration (colour coding) ───────────────────────────────────
const SECTIONS = [
  {
    type:    'agreement_renewal',
    label:   'Agreement Renewals',
    icon:    FileText,
    border:  'border-l-red-500',
    badge:   'bg-red-500/20 text-red-400 border border-red-500/30',
    btn:     'bg-red-600 hover:bg-red-500',
    btnLabel: 'Renew',
    showRenew: true,
  },
  {
    type:    'rent_due',
    label:   'Rent Due Reminders',
    icon:    IndianRupee,
    border:  'border-l-yellow-500',
    badge:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    btn:     null,
    btnLabel: null,
    showRenew: false,
  },
  {
    type:    'rent_increment',
    label:   'Rent Increment Suggestions',
    icon:    TrendingUp,
    border:  'border-l-blue-500',
    badge:   'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    btn:     null,
    btnLabel: null,
    showRenew: false,
  },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────
const ReminderSkeleton = () => (
  <div className="flex items-center gap-4 p-4 animate-pulse">
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-slate-700 rounded w-1/3" />
      <div className="h-3 bg-slate-700 rounded w-1/2" />
    </div>
    <div className="h-8 w-16 bg-slate-700 rounded-lg" />
  </div>
);

/**
 * ReminderRow — a single reminder item within a section.
 * Shows tenant name, unit, building, trigger date, and an action button.
 */
const ReminderRow = ({ reminder, section, onDismiss, dismissingId }) => {
  const isDismissing = dismissingId === reminder._id;

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="flex-1 min-w-0">
        {/* Tenant name */}
        <p className="text-white font-medium text-sm">{reminder.tenant_name || 'Unknown Tenant'}</p>

        {/* Unit + building */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {reminder.unit_name && (
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Home className="w-3 h-3" />
              {reminder.unit_name}
            </span>
          )}
          {reminder.building_name && (
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {reminder.building_name}
            </span>
          )}
          {reminder.trigger_date && (
            <span className="text-slate-500 text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(reminder.trigger_date).toLocaleDateString('en-IN')}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Section-specific action button (e.g. Renew for agreement_renewal) */}
        {section.showRenew && (
          <button
            className={`${section.btn} text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
            onClick={() => toast('Renew flow coming soon!')}
          >
            {section.btnLabel}
          </button>
        )}
        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(reminder._id)}
          disabled={isDismissing}
          className="text-slate-500 hover:text-red-400 transition-colors p-1 disabled:opacity-40"
          title="Dismiss"
        >
          {isDismissing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <X className="w-4 h-4" />
          }
        </button>
      </div>
    </div>
  );
};

/**
 * RemindersPage — categorised reminders + in-app notification panel.
 */
const RemindersPage = () => {
  const queryClient = useQueryClient();

  // ID of reminder currently being dismissed (for spinner)
  const [dismissingId, setDismissingId] = useState(null);
  const [markingAll,   setMarkingAll]   = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: remindersData, isLoading: remindersLoading } = useQuery({
    queryKey: ['reminders-all'],
    queryFn:  () => reminderAPI.getAll().then((r) => r.data),
  });

  const { data: notifData, isLoading: notifLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => reminderAPI.getNotifications().then((r) => r.data),
  });

  const allReminders  = remindersData?.reminders   || [];
  const notifications = notifData?.notifications   || [];

  // Group reminders by type for the three sections
  const byType = (type) => allReminders.filter((r) => r.type === type && !r.dismissed);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDismiss = async (id) => {
    setDismissingId(id);
    try {
      await reminderAPI.dismiss(id);
      queryClient.invalidateQueries({ queryKey: ['reminders-all'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('Reminder dismissed.');
    } catch {
      toast.error('Failed to dismiss reminder.');
    } finally {
      setDismissingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await reminderAPI.markAllRead();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Failed to mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reminders &amp; Alerts</h1>
        <p className="text-slate-400 text-sm mt-0.5">Stay on top of renewals, dues, and increments</p>
      </div>

      {/* ── Reminder Sections ─────────────────────────────────────────────────── */}
      {SECTIONS.map((section) => {
        const sectionReminders = byType(section.type);
        const Icon = section.icon;

        return (
          <div
            key={section.type}
            className={`bg-slate-800 border border-slate-700 border-l-4 ${section.border} rounded-xl overflow-hidden`}
          >
            {/* Section Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {section.label}
              </h2>
              {/* Count badge */}
              {!remindersLoading && sectionReminders.length > 0 && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${section.badge}`}>
                  {sectionReminders.length}
                </span>
              )}
            </div>

            {/* Reminder list */}
            <div className="divide-y divide-slate-700">
              {remindersLoading ? (
                Array.from({ length: 3 }).map((_, i) => <ReminderSkeleton key={i} />)
              ) : sectionReminders.length === 0 ? (
                <div className="px-5 py-6 text-center text-slate-500 text-sm">
                  No {section.label.toLowerCase()} at this time.
                </div>
              ) : (
                sectionReminders.map((reminder) => (
                  <ReminderRow
                    key={reminder._id}
                    reminder={reminder}
                    section={section}
                    onDismiss={handleDismiss}
                    dismissingId={dismissingId}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* ── In-app Notifications Panel ────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </h2>
          {/* Mark all read button */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs
                         font-medium transition-colors disabled:opacity-50"
            >
              {markingAll
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCheck className="w-3.5 h-3.5" />
              }
              Mark all read
            </button>
          )}
        </div>

        {/* Notification list */}
        <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
          {notifLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-slate-700" />
                <div className="flex-1 h-4 bg-slate-700 rounded w-2/3" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id}
                className={`flex items-start gap-3 px-5 py-3.5 transition-colors ${
                  !notif.is_read ? 'bg-blue-500/5' : 'hover:bg-slate-700/30'
                }`}
              >
                {/* Unread indicator dot */}
                <div className="mt-1.5 flex-shrink-0">
                  {notif.is_read ? (
                    <Circle className="w-2 h-2 text-slate-600 fill-slate-600" />
                  ) : (
                    <Circle className="w-2 h-2 text-blue-500 fill-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notif.is_read ? 'text-slate-400' : 'text-white font-medium'}`}>
                    {notif.message}
                  </p>
                  {notif.created_at && (
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(notif.created_at).toLocaleString('en-IN', {
                        day:    '2-digit',
                        month:  'short',
                        hour:   '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RemindersPage;
