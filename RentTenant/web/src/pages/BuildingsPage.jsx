/**
 * @file pages/BuildingsPage.jsx
 * @description Lists all buildings owned by the logged-in user.
 * Supports real-time search filtering, a grid card layout with placeholder
 * images, and an "Add Building" modal with full form + photo upload support.
 *
 * Data sources:
 *   - buildingAPI.getAll()   → buildings list
 *   - buildingAPI.create()   → create new building (multipart/form-data)
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Layers,
  Home,
  Users,
  X,
  Loader2,
  ImagePlus,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { buildingAPI } from '../api';

// ─── Initial form state ───────────────────────────────────────────────────────
const INITIAL_FORM = {
  name:          '',
  address_line1: '',
  address_line2: '',
  city:          '',
  state:         '',
  pincode:       '',
  total_floors:  '',
  description:   '',
};

// ─── Card skeleton ────────────────────────────────────────────────────────────
const BuildingCardSkeleton = () => (
  <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden animate-pulse">
    <div className="w-full h-40 bg-slate-700" />
    <div className="p-4 space-y-2">
      <div className="h-5 bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-700 rounded w-1/2" />
      <div className="flex gap-3 mt-3">
        <div className="h-4 bg-slate-700 rounded w-1/3" />
        <div className="h-4 bg-slate-700 rounded w-1/3" />
      </div>
    </div>
  </div>
);

/**
 * BuildingsPage — grid view of all buildings with search + add functionality.
 */
const BuildingsPage = () => {
  const queryClient = useQueryClient();

  // Search term for client-side filtering
  const [search, setSearch]       = useState('');
  // Modal visibility
  const [modalOpen, setModalOpen] = useState(false);
  // Controlled form state
  const [form, setForm]           = useState(INITIAL_FORM);
  // Selected photo files (File[])
  const [photos, setPhotos]       = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch all buildings ────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn:  () => buildingAPI.getAll().then((r) => r.data),
  });

  const buildings = data?.data || [];

  // ── Client-side search filter ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return buildings;
    const q = search.toLowerCase();
    return buildings.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.state?.toLowerCase().includes(q),
    );
  }, [buildings, search]);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePhotoChange = (e) => {
    // Append newly selected files to the existing list
    const files = Array.from(e.target.files);
    setPhotos((prev) => [...prev, ...files]);
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm(INITIAL_FORM);
    setPhotos([]);
  };

  /** Build FormData and call buildingAPI.create() */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.city.trim()) {
      toast.error('Building name and city are required.');
      return;
    }

    const fd = new FormData();
    // Append all text fields
    Object.entries(form).forEach(([key, val]) => {
      if (val !== '') fd.append(key, val);
    });
    // Append photo files (backend expects field name "photos")
    photos.forEach((file) => fd.append('photos', file));

    setSubmitting(true);
    try {
      await buildingAPI.create(fd);
      // Invalidate buildings list so the grid refreshes
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast.success('Building added successfully!');
      closeModal();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to add building.';
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
          <h1 className="text-2xl font-bold text-white">My Buildings</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isLoading ? '…' : `${buildings.length} building${buildings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white
                     font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Building
        </button>
      </div>

      {/* ── Search Bar ────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or city…"
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500
                     rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                     focus:ring-blue-500 focus:border-transparent transition"
        />
      </div>

      {/* ── Buildings Grid ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <BuildingCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Building2 className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-lg font-medium">No buildings found</p>
          <p className="text-sm mt-1">
            {search ? 'Try a different search term.' : 'Click "Add Building" to get started.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((building) => (
            <Link
              key={building.id}
              to={`/buildings/${building.id}`}
              className="group bg-slate-800 border border-slate-700 rounded-xl overflow-hidden
                         hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/20 transition-all"
            >
              {/* Building photo / placeholder */}
              <div className="relative w-full h-40 bg-slate-700 overflow-hidden">
                {building.photos?.[0] ? (
                  <img
                    src={building.photos[0]}
                    alt={building.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-slate-600" />
                  </div>
                )}
                {/* Floors badge */}
                {building.total_floors && (
                  <span className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 text-xs
                                   px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {building.total_floors}F
                  </span>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-white text-sm leading-snug line-clamp-1 group-hover:text-blue-400 transition-colors">
                    {building.name}
                  </h3>
                  <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5 group-hover:text-blue-400 transition-colors" />
                </div>

                {/* City */}
                {building.city && (
                  <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {building.city}{building.state ? `, ${building.state}` : ''}
                  </p>
                )}

                {/* Units stats */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Home className="w-3.5 h-3.5" />
                    <span>{building.total_units ?? 0} units</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <Users className="w-3.5 h-3.5" />
                    <span>{building.occupied_units ?? 0} occupied</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Add Building Modal ────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh]
                          overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800">
              <h2 className="text-lg font-semibold text-white">Add New Building</h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Building Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Building name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Sunrise Apartments"
                  required
                  className="input-dark"
                />
              </div>

              {/* Address Line 1 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Address line 1
                </label>
                <input
                  type="text"
                  name="address_line1"
                  value={form.address_line1}
                  onChange={handleChange}
                  placeholder="Street / society name"
                  className="input-dark"
                />
              </div>

              {/* Address Line 2 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Address line 2
                </label>
                <input
                  type="text"
                  name="address_line2"
                  value={form.address_line2}
                  onChange={handleChange}
                  placeholder="Landmark, locality"
                  className="input-dark"
                />
              </div>

              {/* City + State */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Mumbai"
                    required
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Maharashtra"
                    className="input-dark"
                  />
                </div>
              </div>

              {/* Pincode + Total Floors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="400001"
                    maxLength={6}
                    className="input-dark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Total floors
                  </label>
                  <input
                    type="number"
                    name="total_floors"
                    value={form.total_floors}
                    onChange={handleChange}
                    placeholder="4"
                    min={1}
                    className="input-dark"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Optional notes about the building…"
                  className="input-dark resize-none"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Photos
                </label>
                {/* Custom file picker trigger */}
                <label className="flex items-center gap-2 cursor-pointer w-full border border-dashed
                                  border-slate-600 rounded-lg p-3 hover:border-blue-500 transition-colors
                                  text-slate-400 hover:text-blue-400 text-sm">
                  <ImagePlus className="w-5 h-5" />
                  <span>Click to add photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>

                {/* Preview selected files */}
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {photos.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded-lg border border-slate-600"
                        />
                        {/* Remove button overlay */}
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full
                                     flex items-center justify-center text-white opacity-0
                                     group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5
                             rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800
                             disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg
                             text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Add Building'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inline CSS helper (Tailwind doesn't allow dynamic class strings) ─── */}
      <style>{`
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
        .input-dark:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgb(59 130 246);
          border-color: transparent;
        }
      `}</style>
    </div>
  );
};

export default BuildingsPage;
