/**
 * @file pages/RentsPage.jsx
 * @description Rent management page with two tabs:
 *   1. "Pending / Overdue" — table of unpaid rents with a "Mark as Paid" action
 *   2. "Monthly Report"   — month/year picker + summary cards + per-building table
 *
 * Data sources:
 *   - rentAPI.getPending()         → pending & overdue rents
 *   - rentAPI.getReport({ month, year }) → monthly report data
 *   - rentAPI.markPaid(id, data)   → mark a rent as paid
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Calendar,
  CreditCard,
  TrendingUp,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rentAPI } from '../api';

// ─── Status badge styles ──────────────────────────────────────────────────────
const STATUS_BADGE = {
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  overdue: 'bg-red-500/20    text-red-400    border border-red-500/30',
  paid:    'bg-green-500/20  text-green-400  border border-green-500/30',
};

// ─── Payment mode options ─────────────────────────────────────────────────────
const PAYMENT_MODES = ['cash', 'upi', 'bank_transfer', 'cheque', 'other'];

// ─── Row skeleton ─────────────────────────────────────────────────────────────
const RowSkeleton = ({ cols = 6 }) => (
  <tr className="border-b border-slate-700 animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 bg-slate-700 rounded w-3/4" />
      </td>
    ))}
  </tr>
);

// ─── Summary Stat Card ────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon: Icon, color, bg }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
    <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} mb-3`}>
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <p className="text-xl font-bold text-white">{value}</p>
    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
  </div>
);

/**
 * RentsPage — tabbed view for pending rents and monthly income reports.
 */
const RentsPage = () => {
  const queryClient = useQueryClient();

  // Active tab: 'pending' | 'report'
  const [activeTab, setActiveTab] = useState('pending');

  // Mark-as-paid modal state
  const [payModal, setPayModal]   = useState(null);  // rent object or null
  const [payForm, setPayForm]     = useState({
    amount_paid:     '',
    payment_mode:    'cash',
    transaction_ref: '',
    paid_date:       new Date().toISOString().split('T')[0],
  });
  const [paying, setPaying] = useState(false);

  // Monthly report date selector
  const today = new Date();
  const [reportMonth, setReportMonth] = useState(today.getMonth() + 1); // 1-12
  const [reportYear,  setReportYear]  = useState(today.getFullYear());

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['rents-pending'],
    queryFn:  () => rentAPI.getPending().then((r) => r.data),
    enabled:  activeTab === 'pending',
  });

  const { data: reportData, isLoading: reportLoading } = useQuery({
    queryKey: ['rents-report', reportMonth, reportYear],
    queryFn:  () => rentAPI.getReport({ month: reportMonth, year: reportYear }).then((r) => r.data),
    enabled:  activeTab === 'report',
  });

  const pending = pendingData?.rents   || [];
  const report  = reportData?.report   || {};
  const summary = reportData?.summary  || {};

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Open the pay modal prefilled with the rent amount */
  const openPayModal = (rent) => {
    setPayModal(rent);
    setPayForm((prev) => ({
      ...prev,
      amount_paid: rent.amount?.toString() || '',
    }));
  };

  const closePayModal = () => {
    setPayModal(null);
    setPayForm({
      amount_paid: '',
      payment_mode: 'cash',
      transaction_ref: '',
      paid_date: new Date().toISOString().split('T')[0],
    });
  };

  const handlePayChange = (e) => {
    setPayForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();

    if (!payForm.amount_paid || isNaN(Number(payForm.amount_paid))) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setPaying(true);
    try {
      await rentAPI.markPaid(payModal.id, {
        amount_paid:     Number(payForm.amount_paid),
        payment_mode:    payForm.payment_mode,
        transaction_ref: payForm.transaction_ref,
        paid_date:       payForm.paid_date,
      });
      // Refresh pending list and report
      queryClient.invalidateQueries({ queryKey: ['rents-pending'] });
      queryClient.invalidateQueries({ queryKey: ['rents-report'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Rent marked as paid!');
      closePayModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to mark rent as paid.');
    } finally {
      setPaying(false);
    }
  };

  // ── Month/year options ─────────────────────────────────────────────────────
  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  // Last 5 years
  const YEARS = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rent Management</h1>
        <p className="text-slate-400 text-sm mt-0.5">Track payments and generate reports</p>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending / Overdue
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'report'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          Monthly Report
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PENDING / OVERDUE TAB                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Pending &amp; Overdue Rents
            </h2>
            {!pendingLoading && pending.length > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs font-medium px-2 py-0.5 rounded-full">
                {pending.length} pending
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                  <th className="px-4 py-3 text-left font-medium">Tenant</th>
                  <th className="px-4 py-3 text-left font-medium">Building / Unit</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Due Date</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pendingLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                ) : pending.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-slate-500">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-60" />
                      <p>All rents are up to date!</p>
                    </td>
                  </tr>
                ) : (
                  pending.map((rent) => (
                    <tr key={rent.id} className="hover:bg-slate-700/40 transition-colors">
                      {/* Tenant */}
                      <td className="px-4 py-3.5">
                        <p className="text-white font-medium">{rent.tenant_name}</p>
                      </td>
                      {/* Building / Unit */}
                      <td className="px-4 py-3.5">
                        <p className="text-slate-300">{rent.building_name || '—'}</p>
                        <p className="text-slate-400 text-xs">{rent.unit_name || '—'}</p>
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3.5 text-white font-medium whitespace-nowrap">
                        ₹{Number(rent.amount).toLocaleString('en-IN')}
                      </td>
                      {/* Due Date */}
                      <td className="px-4 py-3.5 text-slate-300 text-xs whitespace-nowrap">
                        {new Date(rent.due_date).toLocaleDateString('en-IN')}
                      </td>
                      {/* Status badge */}
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[rent.status] || STATUS_BADGE.pending}`}>
                          {rent.status === 'overdue' ? (
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Overdue
                            </span>
                          ) : (
                            'Pending'
                          )}
                        </span>
                      </td>
                      {/* Mark Paid button */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => openPayModal(rent)}
                          className="bg-green-600 hover:bg-green-500 text-white text-xs font-medium
                                     px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Mark as Paid
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* MONTHLY REPORT TAB                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'report' && (
        <div className="space-y-5">
          {/* Month + Year Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={reportMonth}
              onChange={(e) => setReportMonth(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg
                         px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={reportYear}
              onChange={(e) => setReportYear(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg
                         px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {reportLoading && <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />}
          </div>

          {/* Summary Cards */}
          {!reportLoading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Due"
                value={`₹${Number(summary.total_due || 0).toLocaleString('en-IN')}`}
                icon={IndianRupee}
                color="text-blue-400"
                bg="bg-blue-500/10"
              />
              <SummaryCard
                label="Collected"
                value={`₹${Number(summary.total_collected || 0).toLocaleString('en-IN')}`}
                icon={TrendingUp}
                color="text-green-400"
                bg="bg-green-500/10"
              />
              <SummaryCard
                label="Pending Count"
                value={summary.pending_count ?? 0}
                icon={Clock}
                color="text-yellow-400"
                bg="bg-yellow-500/10"
              />
              <SummaryCard
                label="Overdue Count"
                value={summary.overdue_count ?? 0}
                icon={AlertTriangle}
                color="text-red-400"
                bg="bg-red-500/10"
              />
            </div>
          )}

          {/* Per-building breakdown table */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                {MONTHS[reportMonth - 1]} {reportYear} — Breakdown
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                    <th className="px-4 py-3 text-left font-medium">Tenant</th>
                    <th className="px-4 py-3 text-left font-medium">Building / Unit</th>
                    <th className="px-4 py-3 text-left font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Paid On</th>
                    <th className="px-4 py-3 text-left font-medium">Mode</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {reportLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} cols={6} />)
                  ) : (report?.rents || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                        No rent records for this period.
                      </td>
                    </tr>
                  ) : (
                    (report?.rents || []).map((rent) => (
                      <tr key={rent.id} className="hover:bg-slate-700/40 transition-colors">
                        <td className="px-4 py-3 text-white">{rent.tenant_name}</td>
                        <td className="px-4 py-3">
                          <p className="text-slate-300">{rent.building_name || '—'}</p>
                          <p className="text-slate-400 text-xs">{rent.unit_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          ₹{Number(rent.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-xs">
                          {rent.paid_date
                            ? new Date(rent.paid_date).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-300 capitalize">
                          {rent.payment_mode || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[rent.status] || STATUS_BADGE.pending}`}>
                            {rent.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Mark as Paid Modal ────────────────────────────────────────────────── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div>
                <h2 className="text-lg font-semibold text-white">Mark as Paid</h2>
                <p className="text-slate-400 text-xs mt-0.5">{payModal.tenant_name}</p>
              </div>
              <button onClick={closePayModal} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleMarkPaid} className="px-6 py-5 space-y-4">
              {/* Amount Paid */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Amount paid (₹) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    name="amount_paid"
                    value={payForm.amount_paid}
                    onChange={handlePayChange}
                    min={0}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                               py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                               focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Payment mode
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    name="payment_mode"
                    value={payForm.payment_mode}
                    onChange={handlePayChange}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                               py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                               focus:ring-blue-500 focus:border-transparent transition capitalize"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m} className="capitalize">{m.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transaction Reference */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Transaction ref. <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  type="text"
                  name="transaction_ref"
                  value={payForm.transaction_ref}
                  onChange={handlePayChange}
                  placeholder="UPI / NEFT ref number"
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                             py-2.5 px-3 text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Paid Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Paid date
                </label>
                <input
                  type="date"
                  name="paid_date"
                  value={payForm.paid_date}
                  onChange={handlePayChange}
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                             py-2.5 px-3 text-sm focus:outline-none focus:ring-2
                             focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closePayModal}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed
                             text-white font-semibold py-2.5 rounded-lg text-sm transition-colors
                             flex items-center justify-center gap-2"
                >
                  {paying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentsPage;
