/**
 * @file pages/TenantsPage.jsx
 * @description Lists all tenants with status tabs (All / Active / Inactive),
 * a table view with avatar, key info, and links to individual tenant pages.
 * Includes an "Add Tenant" modal with full form and file upload support.
 *
 * Data sources:
 *   - tenantAPI.getAll(params)  → tenant list (server-side filter by status)
 *   - tenantAPI.create(fd)      → create new tenant (multipart/form-data)
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  User,
  Phone,
  Building2,
  Home,
  Calendar,
  IndianRupee,
  X,
  Loader2,
  ImagePlus,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tenantAPI, buildingAPI, unitAPI } from '../api';

// ─── Status tab options ───────────────────────────────────────────────────────
const STATUS_TABS = ['all', 'active', 'inactive'];

// ─── Status badge styles ──────────────────────────────────────────────────────
const STATUS_BADGE = {
  active:   'bg-green-500/20 text-green-400 border border-green-500/30',
  inactive: 'bg-slate-600/50 text-slate-400 border border-slate-600',
};

// ─── ID proof type options ────────────────────────────────────────────────────
const ID_PROOF_TYPES = ['Aadhar Card', 'PAN Card', 'Passport', 'Voter ID', 'Driving License', 'Other'];

// ─── Initial form state ───────────────────────────────────────────────────────
const INITIAL_FORM = {
  unit_id:                   '',
  name:                      '',
  email:                     '',
  phone:                     '',
  move_in_date:              '',
  id_proof_type:             '',
  id_proof_number:           '',
  emergency_contact_name:    '',
  emergency_contact_phone:   '',
};

// ─── Table row skeleton ───────────────────────────────────────────────────────
const RowSkeleton = () => (
  <tr className="border-b border-slate-700 animate-pulse">
    {[120, 80, 100, 90, 80, 60].map((w, i) => (
      <td key={i} className="px-4 py-3.5">
        <div className={`h-4 bg-slate-700 rounded`} style={{ width: w }} />
      </td>
    ))}
  </tr>
);

/**
 * TenantsPage — filterable table of all tenants with add functionality.
 */
const TenantsPage = () => {
  const queryClient = useQueryClient();

  // Active status filter tab
  const [activeTab, setActiveTab]   = useState('all');
  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]             = useState(INITIAL_FORM);
  // File uploads: photo + id proof document
  const [photoFile, setPhotoFile]   = useState(null);
  const [idProofFile, setIdProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Selected building for unit cascade
  const [selectedBuildingId, setSelectedBuildingId] = useState('');

  // ── Fetch all buildings for dropdown ──────────────────────────────────────
  const { data: buildingsData } = useQuery({
    queryKey: ['buildings'],
    queryFn:  () => buildingAPI.getAll().then((r) => r.data),
  });
  const buildings = buildingsData?.data || [];

  // ── Fetch vacant units for selected building ───────────────────────────────
  const { data: unitsData } = useQuery({
    queryKey: ['units', selectedBuildingId],
    queryFn:  () => unitAPI.getAll(selectedBuildingId, { status: 'vacant' }).then((r) => r.data),
    enabled:  !!selectedBuildingId,
  });
  const vacantUnits = unitsData?.data || [];

  // ── Fetch tenants (filter passed as query param) ───────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['tenants', activeTab],
    queryFn:  () =>
      tenantAPI
        .getAll(activeTab !== 'all' ? { status: activeTab } : {})
        .then((r) => r.data),
  });

  const tenants = data?.data || [];

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(INITIAL_FORM);
    setPhotoFile(null);
    setIdProofFile(null);
    setSelectedBuildingId('');
  };

  /** Build FormData and submit */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.unit_id.trim() || !form.name.trim() || !form.phone.trim()) {
      toast.error('Unit ID, name, and phone are required.');
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([key, val]) => {
      if (val !== '') fd.append(key, val);
    });
    // Attach files if provided
    if (photoFile)   fd.append('photo',    photoFile);
    if (idProofFile) fd.append('id_proof', idProofFile);

    setSubmitting(true);
    try {
      await tenantAPI.create(fd);
      // Invalidate all status variants of the tenant query
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant added successfully!');
      closeModal();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to add tenant.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isLoading ? '…' : `${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white
                     font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      {/* ── Status Filter Tabs ────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tenants Table ─────────────────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase border-b border-slate-700 bg-slate-800/80">
                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                <th className="px-4 py-3 text-left font-medium">Phone</th>
                <th className="px-4 py-3 text-left font-medium">Building / Unit</th>
                <th className="px-4 py-3 text-left font-medium">Move-in</th>
                <th className="px-4 py-3 text-left font-medium">Rent</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No tenants found for this filter.</p>
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-700/40 transition-colors group"
                  >
                    {/* Avatar + Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* Tenant photo or initial avatar */}
                        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-blue-600 flex items-center justify-center">
                          {tenant.photo ? (
                            <img
                              src={tenant.photo}
                              alt={tenant.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white text-sm font-bold">
                              {tenant.name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">{tenant.name}</p>
                          {tenant.email && (
                            <p className="text-slate-400 text-xs">{tenant.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3.5 text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {tenant.phone || '—'}
                      </span>
                    </td>

                    {/* Building / Unit */}
                    <td className="px-4 py-3.5">
                      <p className="text-slate-300 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {tenant.building_name || '—'}
                      </p>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <Home className="w-3 h-3" />
                        {tenant.unit_name || tenant.unit_number || '—'}
                      </p>
                    </td>

                    {/* Move-in date */}
                    <td className="px-4 py-3.5 text-slate-300 text-xs">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {tenant.move_in_date
                          ? new Date(tenant.move_in_date).toLocaleDateString('en-IN')
                          : '—'}
                      </span>
                    </td>

                    {/* Rent */}
                    <td className="px-4 py-3.5 text-slate-300">
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                        {tenant.rent_amount
                          ? Number(tenant.rent_amount).toLocaleString('en-IN')
                          : '—'}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tenant.is_active ? STATUS_BADGE.active : STATUS_BADGE.inactive}`}>
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* View link */}
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        to={`/tenants/${tenant.id}`}
                        className="text-slate-500 hover:text-blue-400 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Tenant Modal ──────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg
                          max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h2 className="text-lg font-semibold text-white">Add New Tenant</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Building selector */}
              <div>
                <label className="field-label">Building <span className="text-red-400">*</span></label>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setForm((prev) => ({ ...prev, unit_id: '' }));
                  }}
                  required
                  className="input-dark"
                >
                  <option value="">Select a building…</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} — {b.city}</option>
                  ))}
                </select>
              </div>

              {/* Unit selector (shows only vacant units) */}
              <div>
                <label className="field-label">Unit <span className="text-red-400">*</span></label>
                <select
                  name="unit_id"
                  value={form.unit_id}
                  onChange={handleChange}
                  required
                  disabled={!selectedBuildingId}
                  className="input-dark disabled:opacity-50"
                >
                  <option value="">
                    {selectedBuildingId ? 'Select a vacant unit…' : 'Select a building first'}
                  </option>
                  {vacantUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      Unit {u.unit_number} — Floor {u.floor_number} — ₹{Number(u.rent_amount).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="field-label">Full name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Riya Patel"
                  required
                  className="input-dark"
                />
              </div>

              {/* Email + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="riya@example.com"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="field-label">Phone <span className="text-red-400">*</span></label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    required
                    className="input-dark"
                  />
                </div>
              </div>

              {/* Move-in date */}
              <div>
                <label className="field-label">Move-in date</label>
                <input
                  type="date"
                  name="move_in_date"
                  value={form.move_in_date}
                  onChange={handleChange}
                  className="input-dark"
                />
              </div>

              {/* ID Proof */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">ID proof type</label>
                  <select
                    name="id_proof_type"
                    value={form.id_proof_type}
                    onChange={handleChange}
                    className="input-dark"
                  >
                    <option value="">Select…</option>
                    {ID_PROOF_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">ID proof number</label>
                  <input
                    type="text"
                    name="id_proof_number"
                    value={form.id_proof_number}
                    onChange={handleChange}
                    placeholder="XXXX-XXXX-XXXX"
                    className="input-dark"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Emergency contact name</label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={form.emergency_contact_name}
                    onChange={handleChange}
                    placeholder="Amit Patel"
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="field-label">Emergency contact phone</label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    value={form.emergency_contact_phone}
                    onChange={handleChange}
                    placeholder="+91 98765 00000"
                    className="input-dark"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="field-label">Tenant photo</label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed
                                  border-slate-600 rounded-lg p-3 hover:border-blue-500 transition-colors
                                  text-slate-400 hover:text-blue-400 text-sm">
                  <User className="w-5 h-5" />
                  <span>{photoFile ? photoFile.name : 'Click to upload photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* ID Proof Document Upload */}
              <div>
                <label className="field-label">ID proof document</label>
                <label className="flex items-center gap-2 cursor-pointer border border-dashed
                                  border-slate-600 rounded-lg p-3 hover:border-blue-500 transition-colors
                                  text-slate-400 hover:text-blue-400 text-sm">
                  <ImagePlus className="w-5 h-5" />
                  <span>{idProofFile ? idProofFile.name : 'Click to upload ID proof'}</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setIdProofFile(e.target.files[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed
                             text-white font-semibold py-2.5 rounded-lg text-sm transition-colors
                             flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Add Tenant'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Scoped styles ─────────────────────────────────────────────────────── */}
      <style>{`
        .field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgb(203 213 225);
          margin-bottom: 0.375rem;
        }
        .input-dark {
          width: 100%;
          background-color: rgb(15 23 42);
          border: 1px solid rgb(51 65 85);
          color: white;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .input-dark::placeholder { color: rgb(100 116 139); }
        .input-dark option { background-color: rgb(15 23 42); }
        .input-dark:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgb(59 130 246);
          border-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default TenantsPage;
