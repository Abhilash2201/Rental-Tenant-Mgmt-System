/**
 * @file pages/ProfilePage.jsx
 * @description Owner profile page — view and edit profile details,
 * upload a profile picture, change password, and see portfolio stats.
 *
 * Data sources:
 *   - authAPI.getMe()           → owner profile + stats
 *   - authAPI.updateMe(fd)      → update name, phone, profile_pic
 *   - authAPI.changePassword()  → update password
 */

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  Home,
  Users,
  Camera,
  Save,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../api';
import { useAuth } from '../context/AuthContext';

/**
 * ProfilePage — full owner profile view, edit form, and change-password section.
 */
const ProfilePage = () => {
  const queryClient       = useQueryClient();
  const { updateOwner }   = useAuth();

  // ── Fetch profile + stats ──────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authAPI.getMe().then((r) => r.data),
  });

  const owner = data?.owner || {};
  const stats = data?.stats || {};

  // ── Edit profile form state ────────────────────────────────────────────────
  const [editForm, setEditForm]   = useState({ name: '', phone: '' });
  const [picFile, setPicFile]     = useState(null);      // selected File object
  const [picPreview, setPicPreview] = useState(null);    // object URL for preview
  const [savingProfile, setSavingProfile] = useState(false);

  // Populate form when owner data loads
  useEffect(() => {
    if (owner.name) {
      setEditForm({ name: owner.name || '', phone: owner.phone || '' });
    }
  }, [owner.name, owner.phone]);

  // ── Change password form state ─────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password:     '',
    confirm_password: '',
  });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [savingPw,      setSavingPw]      = useState(false);

  // ── Profile photo picker ───────────────────────────────────────────────────
  const handlePicChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPicFile(file);
    // Create a preview URL for instant feedback
    setPicPreview(URL.createObjectURL(file));
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      toast.error('Name cannot be empty.');
      return;
    }

    const fd = new FormData();
    fd.append('name', editForm.name.trim());
    if (editForm.phone) fd.append('phone', editForm.phone);
    if (picFile)        fd.append('profile_pic', picFile);

    setSavingProfile(true);
    try {
      const res = await authAPI.updateMe(fd);
      const updatedOwner = res.data.owner;

      // Sync context + localStorage so the sidebar avatar updates immediately
      updateOwner(updatedOwner);
      queryClient.invalidateQueries({ queryKey: ['me'] });

      // Clear the selected file after save
      setPicFile(null);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (pwForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match.');
      return;
    }

    setSavingPw(true);
    try {
      await authAPI.changePassword({
        current_password: pwForm.current_password,
        new_password:     pwForm.new_password,
      });
      // Clear the password form on success
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Password changed successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  // Derive display avatar — show preview > existing pic > initial letter
  const avatarLetter = owner?.name?.charAt(0).toUpperCase() || 'O';

  // Format join date
  const memberSince = owner?.created_at
    ? new Date(owner.created_at).toLocaleDateString('en-IN', {
        month: 'long',
        year:  'numeric',
      })
    : null;

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-slate-400 text-sm mt-0.5">Manage your account details and security</p>
      </div>

      {/* ── Profile Card (read-only overview) ────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        {isLoading ? (
          /* Loading skeleton for the profile card */
          <div className="flex items-center gap-5 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-slate-700 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-700 rounded w-1/3" />
              <div className="h-4 bg-slate-700 rounded w-1/2" />
              <div className="h-4 bg-slate-700 rounded w-1/4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar circle */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden border-4 border-slate-700">
                {picPreview || owner?.profile_pic ? (
                  <img
                    src={picPreview || owner.profile_pic}
                    alt={owner.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">{avatarLetter}</span>
                )}
              </div>
            </div>

            {/* Owner info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">{owner.name || '—'}</h2>

              {owner.email && (
                <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  {owner.email}
                </p>
              )}
              {owner.phone && (
                <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5" />
                  {owner.phone}
                </p>
              )}
              {memberSince && (
                <p className="text-slate-500 text-xs flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3" />
                  Member since {memberSince}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Card ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Buildings', value: stats.total_buildings ?? '—', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Units',     value: stats.total_units     ?? '—', icon: Home,      color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Tenants',   value: stats.active_tenants  ?? '—', icon: Users,     color: 'text-green-400',  bg: 'bg-green-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${bg} mb-2`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Edit Profile Form ─────────────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Edit Profile
          </h2>
        </div>

        <form onSubmit={handleSaveProfile} className="px-6 py-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your full name"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                         py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent transition placeholder-slate-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Phone number</label>
            <input
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+91 98765 43210"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                         py-2.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent transition placeholder-slate-500"
            />
          </div>

          {/* Profile Picture Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Profile picture
            </label>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed
                              border-slate-600 rounded-lg p-3 hover:border-blue-500 transition-colors
                              text-slate-400 hover:text-blue-400 text-sm w-fit">
              <Camera className="w-5 h-5" />
              <span>{picFile ? picFile.name : 'Click to change photo'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePicChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Save Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500
                         disabled:bg-blue-800 disabled:cursor-not-allowed text-white
                         font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Change Password Form ──────────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-yellow-400" />
            Change Password
          </h2>
        </div>

        <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Current password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={pwForm.current_password}
                onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                placeholder="Current password"
                autoComplete="current-password"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                           py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              New password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={pwForm.new_password}
                onChange={(e) => setPwForm((p) => ({ ...p, new_password: e.target.value }))}
                placeholder="Min. 6 characters"
                autoComplete="new-password"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                           py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition placeholder-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm_password: e.target.value }))}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg
                           py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2
                           focus:ring-blue-500 focus:border-transparent transition placeholder-slate-500"
              />
            </div>
            {/* Live mismatch hint */}
            {pwForm.confirm_password &&
              pwForm.new_password !== pwForm.confirm_password && (
                <p className="text-red-400 text-xs mt-1">Passwords do not match.</p>
              )}
          </div>

          {/* Submit */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={savingPw}
              className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-500
                         disabled:bg-yellow-800 disabled:cursor-not-allowed text-white
                         font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {savingPw ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Changing…
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
