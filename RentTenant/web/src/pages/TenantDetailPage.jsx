/**
 * @file pages/TenantDetailPage.jsx
 * @description Full tenant profile page — shows tenant details, agreement,
 * rent history, and reminders. Owner can mark payments and move out tenant.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantAPI, rentAPI } from '../api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, User, Phone, Mail, Home, Building2,
  Calendar, FileText, IndianRupee, Bell, LogOut,
  CheckCircle, Clock, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

/** Payment status badge */
const RentStatusBadge = ({ status }) => {
  const map = {
    paid:    'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    overdue: 'bg-red-500/20 text-red-400',
    waived:  'bg-slate-500/20 text-slate-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || map.pending}`}>
      {status}
    </span>
  );
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const TenantDetailPage = () => {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const [payModal, setPayModal]       = useState(null); // rent record to pay
  const [moveOutModal, setMoveOutModal] = useState(false);
  const [payForm, setPayForm]         = useState({ amount_paid:'', payment_mode:'UPI', transaction_ref:'', paid_date:'' });
  const [moveOutDate, setMoveOutDate] = useState('');
  const [saving, setSaving]           = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn:  () => tenantAPI.getById(id).then((r) => r.data.data),
  });

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await rentAPI.markPaid(payModal.id, payForm);
      toast.success('Rent marked as paid!');
      queryClient.invalidateQueries(['tenant', id]);
      setPayModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveOut = async () => {
    setSaving(true);
    try {
      await tenantAPI.moveOut(id, { move_out_date: moveOutDate });
      toast.success('Tenant moved out. Unit is now vacant.');
      navigate('/tenants');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) return <p className="text-slate-400">Tenant not found.</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate('/tenants')}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tenants
      </button>

      {/* ── Profile Card ── */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {data.photo_url ? (
              <img src={data.photo_url} alt={data.name} className="w-20 h-20 rounded-full object-cover border-2 border-blue-500" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {data.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">{data.name}</h1>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{data.phone}</span>
                  {data.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{data.email}</span>}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{data.building_name}</span>
                  <span className="flex items-center gap-1"><Home className="w-4 h-4" />Unit {data.unit_number}, Floor {data.floor_number}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />Since {format(new Date(data.move_in_date), 'dd MMM yyyy')}</span>
                </div>
              </div>
              {/* Move Out button */}
              {data.is_active && (
                <button
                  onClick={() => setMoveOutModal(true)}
                  className="flex items-center gap-1 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/60 px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Move Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ID Proof & Emergency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700 text-sm">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">ID Proof</p>
            <p className="text-white">{data.id_proof_type || 'N/A'}: {data.id_proof_number || '—'}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Emergency Contact</p>
            <p className="text-white">{data.emergency_contact_name || '—'} {data.emergency_contact_phone ? `• ${data.emergency_contact_phone}` : ''}</p>
          </div>
        </div>
      </div>

      {/* ── Agreement ── */}
      {data.agreement && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" /> Rent Agreement
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: 'Start Date',   val: format(new Date(data.agreement.start_date), 'dd MMM yyyy') },
              { label: 'End Date',     val: format(new Date(data.agreement.end_date), 'dd MMM yyyy') },
              { label: 'Agreed Rent',  val: `₹${data.agreement.rent_amount?.toLocaleString()}` },
              { label: 'Status',       val: data.agreement.status },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-slate-500 text-xs uppercase tracking-wide">{label}</p>
                <p className="text-white font-medium mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Rent History ── */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-blue-400" /> Rent History (Last 12 months)
        </h2>
        {data.rent_history?.length === 0 ? (
          <p className="text-slate-400 text-sm">No rent records yet.</p>
        ) : (
          <div className="space-y-2">
            {data.rent_history?.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">
                    {MONTHS[record.month - 1]} {record.year}
                  </p>
                  <p className="text-slate-400 text-xs">Due: {format(new Date(record.due_date), 'dd MMM')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">₹{record.amount_due?.toLocaleString()}</p>
                    {record.paid_date && (
                      <p className="text-slate-400 text-xs">Paid: {format(new Date(record.paid_date), 'dd MMM')}</p>
                    )}
                  </div>
                  <RentStatusBadge status={record.status} />
                  {record.status !== 'paid' && (
                    <button
                      onClick={() => {
                        setPayModal(record);
                        setPayForm({ amount_paid: record.amount_due, payment_mode: 'UPI', transaction_ref: '', paid_date: new Date().toISOString().split('T')[0] });
                      }}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Pay Rent Modal ── */}
      {payModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-700">
            <div className="p-5 border-b border-slate-700">
              <h3 className="text-white font-semibold">Mark Rent as Paid</h3>
              <p className="text-slate-400 text-sm">{MONTHS[payModal.month-1]} {payModal.year}</p>
            </div>
            <form onSubmit={handleMarkPaid} className="p-5 space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Amount Paid (₹)</label>
                <input type="number" value={payForm.amount_paid} onChange={(e) => setPayForm({...payForm, amount_paid: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Payment Mode</label>
                <select value={payForm.payment_mode} onChange={(e) => setPayForm({...payForm, payment_mode: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                  {['Cash','UPI','Bank Transfer','Cheque','NEFT','IMPS'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Transaction Ref / Note</label>
                <input type="text" placeholder="UPI ref / Cheque no." value={payForm.transaction_ref} onChange={(e) => setPayForm({...payForm, transaction_ref: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-1">Paid Date</label>
                <input type="date" value={payForm.paid_date} onChange={(e) => setPayForm({...payForm, paid_date: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPayModal(null)} className="flex-1 bg-slate-700 text-white py-2 rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                  {saving ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Move Out Modal ── */}
      {moveOutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-sm border border-slate-700 p-6">
            <h3 className="text-white font-semibold mb-2">Move Out Tenant</h3>
            <p className="text-slate-400 text-sm mb-4">This will mark <strong className="text-white">{data.name}</strong> as inactive and set the unit to vacant.</p>
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-1">Move-out Date</label>
              <input type="date" value={moveOutDate} onChange={(e) => setMoveOutDate(e.target.value)}
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setMoveOutModal(false)} className="flex-1 bg-slate-700 text-white py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleMoveOut} disabled={saving} className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium">
                {saving ? 'Processing...' : 'Move Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetailPage;
