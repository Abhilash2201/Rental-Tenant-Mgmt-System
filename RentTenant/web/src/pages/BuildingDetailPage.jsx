/**
 * @file pages/BuildingDetailPage.jsx
 * @description Building detail page — shows all floors, units, and tenants.
 * Owner can add/edit units and see occupancy floor-by-floor.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { buildingAPI, unitAPI } from '../api';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Building2, MapPin, Layers, Users,
  Plus, Home, CheckCircle, Wrench, Circle,
} from 'lucide-react';

/**
 * Status badge component for unit occupancy status.
 */
const StatusBadge = ({ status }) => {
  const styles = {
    occupied:    'bg-green-500/20  text-green-400  border border-green-500/30',
    vacant:      'bg-slate-500/20  text-slate-400  border border-slate-500/30',
    maintenance: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  };
  const icons = {
    occupied:    <CheckCircle className="w-3 h-3" />,
    vacant:      <Circle className="w-3 h-3" />,
    maintenance: <Wrench className="w-3 h-3" />,
  };
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.vacant}`}>
      {icons[status]} {status}
    </span>
  );
};

const BuildingDetailPage = () => {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [form, setForm] = useState({
    unit_number: '', floor_number: '', unit_type: '2BHK',
    area_sqft: '', rent_amount: '', deposit_amount: '', is_furnished: false,
  });
  const [saving, setSaving] = useState(false);

  // Fetch building details with floors/units
  const { data, isLoading } = useQuery({
    queryKey: ['building', id],
    queryFn:  () => buildingAPI.getById(id).then((r) => r.data.data),
  });

  const handleAddUnit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await unitAPI.create(id, { ...form, floor_number: parseInt(form.floor_number) });
      toast.success(`Unit ${form.unit_number} added!`);
      queryClient.invalidateQueries(['building', id]);
      setShowAddUnit(false);
      setForm({ unit_number:'', floor_number:'', unit_type:'2BHK', area_sqft:'', rent_amount:'', deposit_amount:'', is_furnished: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add unit');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="h-48 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) return <p className="text-slate-400">Building not found.</p>;

  // Convert floors object to sorted array
  const floors = data.floors
    ? Object.entries(data.floors)
        .sort(([a], [b]) => Number(a) - Number(b))
    : [];

  return (
    <div className="space-y-6">
      {/* ── Back Button ── */}
      <button
        onClick={() => navigate('/buildings')}
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Buildings
      </button>

      {/* ── Building Header ── */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        {/* Photos */}
        {data.photos?.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {data.photos.map((photo, i) => (
              <img
                key={i}
                src={photo}
                alt={`Building photo ${i + 1}`}
                className="w-32 h-24 object-cover rounded-lg flex-shrink-0"
              />
            ))}
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-7 h-7 text-blue-400" />
              {data.name}
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {data.address_line1}{data.address_line2 ? `, ${data.address_line2}` : ''}, {data.city}, {data.state} – {data.pincode}
            </p>
            {data.description && (
              <p className="text-slate-500 text-sm mt-2">{data.description}</p>
            )}
          </div>
          {/* Stats */}
          <div className="flex gap-4 flex-shrink-0">
            {[
              { icon: Layers, label: 'Floors',    val: data.total_floors  },
              { icon: Home,   label: 'Units',     val: data.total_units   },
              { icon: Users,  label: 'Occupied',  val: data.occupied_units },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="bg-slate-700 rounded-lg p-3 text-center min-w-[72px]">
                <Icon className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-white font-bold text-xl">{val ?? 0}</p>
                <p className="text-slate-400 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Floors & Units ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Floors & Units</h2>
        <button
          onClick={() => setShowAddUnit(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Unit
        </button>
      </div>

      {floors.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Home className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No units yet. Add your first unit!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {floors.map(([floorNum, units]) => (
            <div key={floorNum} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {/* Floor header */}
              <div className="px-4 py-3 bg-slate-750 border-b border-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">
                  {floorNum === '0' ? 'Ground Floor' : `Floor ${floorNum}`}
                </span>
                <span className="ml-2 text-slate-400 text-xs">{units.length} unit(s)</span>
              </div>

              {/* Units grid */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {units.map((unit) => (
                  <div
                    key={unit.id}
                    className="bg-slate-700 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-semibold">Unit {unit.unit_number}</p>
                        <p className="text-slate-400 text-xs">{unit.unit_type} • {unit.area_sqft ? `${unit.area_sqft} sqft` : 'Area N/A'}</p>
                      </div>
                      <StatusBadge status={unit.status} />
                    </div>
                    <p className="text-blue-400 font-medium text-sm">₹{unit.rent_amount?.toLocaleString()}/mo</p>
                    {unit.tenant_name && (
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {unit.tenant_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Unit Modal ── */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-white font-semibold text-lg">Add New Unit</h3>
            </div>
            <form onSubmit={handleAddUnit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Unit Number *</label>
                  <input
                    type="text" required placeholder="101"
                    value={form.unit_number}
                    onChange={(e) => setForm({ ...form, unit_number: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Floor Number *</label>
                  <input
                    type="number" required min="0" placeholder="1"
                    value={form.floor_number}
                    onChange={(e) => setForm({ ...form, floor_number: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Unit Type</label>
                  <select
                    value={form.unit_type}
                    onChange={(e) => setForm({ ...form, unit_type: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {['Studio','1BHK','2BHK','3BHK','4BHK','Villa','Shop','Office'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Area (sqft)</label>
                  <input
                    type="number" placeholder="850"
                    value={form.area_sqft}
                    onChange={(e) => setForm({ ...form, area_sqft: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Monthly Rent (₹) *</label>
                  <input
                    type="number" required placeholder="15000"
                    value={form.rent_amount}
                    onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Deposit (₹)</label>
                  <input
                    type="number" placeholder="30000"
                    value={form.deposit_amount}
                    onChange={(e) => setForm({ ...form, deposit_amount: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_furnished}
                  onChange={(e) => setForm({ ...form, is_furnished: e.target.checked })}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-slate-300 text-sm">Furnished</span>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddUnit(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                  {saving ? 'Adding...' : 'Add Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildingDetailPage;
