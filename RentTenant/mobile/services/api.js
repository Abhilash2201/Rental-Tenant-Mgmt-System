/**
 * @file services/api.js
 * @description Axios instance + all API service functions for the mobile app.
 *
 * Key differences from web/src/api/axios.js:
 *  - Uses EXPO_PUBLIC_API_URL env variable (set to your machine's LAN IP)
 *  - Token stored in expo-secure-store (encrypted native storage) not localStorage
 *  - 401 handler uses Expo Router navigation instead of window.location
 *
 * Usage:
 *   import { buildingAPI } from '../services/api';
 *   const res = await buildingAPI.getAll();
 */

import axios from 'axios';
import auth from '@react-native-firebase/auth';
import { router } from 'expo-router';

// ── Axios Instance ───────────────────────────────────────────────────────────

/**
 * Base Axios instance.
 * EXPO_PUBLIC_API_URL must be your computer's LAN IP (e.g. http://192.168.1.5:5000/api)
 * because a physical device or emulator cannot reach 'localhost'.
 */
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request Interceptor ──────────────────────────────────────────────────────
/**
 * Attach a fresh Firebase ID token to every request.
 * getIdToken() auto-refreshes the token when it expires (no manual SecureStore needed).
 */
api.interceptors.request.use(
  async (config) => {
    const currentUser = auth().currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error('Failed to get Firebase token:', err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response Interceptor ─────────────────────────────────────────────────────
/**
 * On 401: sign out via Firebase and redirect to login screen.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await auth().signOut().catch(() => {});
      router.replace('/(auth)/login');
    }
    return Promise.reject(error);
  },
);

// ══════════════════════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════════════════════

export const authAPI = {
  /** Create DB profile after Firebase registration (first login only) */
  createProfile: (name, phone) => api.post('/auth/create-profile', { name, phone }),

  /** Check if DB profile exists for the current Firebase user */
  profileExists: () => api.get('/auth/profile-exists'),

  /** Get logged-in owner profile + stats */
  getMe: () => api.get('/auth/me'),

  /** Update profile (name, phone, photo) — multipart */
  updateMe: (formData) =>
    api.put('/auth/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ══════════════════════════════════════════════════════════════════════════════
// BUILDING API
// ══════════════════════════════════════════════════════════════════════════════

export const buildingAPI = {
  getAll:      (params)        => api.get('/buildings', { params }),
  getById:     (id)            => api.get(`/buildings/${id}`),
  create:      (formData)      => api.post('/buildings', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:      (id, formData)  => api.put(`/buildings/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deletePhoto: (id, photoUrl)  => api.delete(`/buildings/${id}/photos`, { data: { photo_url: photoUrl } }),
  delete:      (id)            => api.delete(`/buildings/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// UNIT API
// ══════════════════════════════════════════════════════════════════════════════

export const unitAPI = {
  getAll:  (buildingId, params) => api.get(`/buildings/${buildingId}/units`, { params }),
  getById: (buildingId, unitId) => api.get(`/buildings/${buildingId}/units/${unitId}`),
  create:  (buildingId, data)   => api.post(`/buildings/${buildingId}/units`, data),
  update:  (buildingId, unitId, data) => api.put(`/buildings/${buildingId}/units/${unitId}`, data),
  delete:  (buildingId, unitId)       => api.delete(`/buildings/${buildingId}/units/${unitId}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// TENANT API
// ══════════════════════════════════════════════════════════════════════════════

export const tenantAPI = {
  getAll:  (params)   => api.get('/tenants', { params }),
  getById: (id)       => api.get(`/tenants/${id}`),
  create:  (formData) => api.post('/tenants', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:  (id, formData) => api.put(`/tenants/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  moveOut: (id, data) => api.put(`/tenants/${id}/move-out`, data),
};

// ══════════════════════════════════════════════════════════════════════════════
// RENT API
// ══════════════════════════════════════════════════════════════════════════════

export const rentAPI = {
  getPending:  ()               => api.get('/rents/pending'),
  getReport:   (params)         => api.get('/rents/report', { params }),
  getByTenant: (tenantId, params) => api.get(`/rents/tenant/${tenantId}`, { params }),
  create:      (data)           => api.post('/rents', data),
  markPaid:    (id, data)       => api.put(`/rents/${id}/pay`, data),
  markOverdue: ()               => api.post('/rents/mark-overdue'),
};

// ══════════════════════════════════════════════════════════════════════════════
// REMINDER API
// ══════════════════════════════════════════════════════════════════════════════

export const reminderAPI = {
  getAll:           (params) => api.get('/reminders', { params }),
  getToday:         ()       => api.get('/reminders/today'),
  getUnreadCount:   ()       => api.get('/reminders/unread-count'),
  getNotifications: (params) => api.get('/reminders/notifications', { params }),
  markRead:         (id)     => api.put(`/reminders/notifications/${id}/read`),
  markAllRead:      ()       => api.put('/reminders/notifications/read-all'),
  dismiss:          (id)     => api.put(`/reminders/${id}/dismiss`),
  renewAgreement:   (id, data) => api.put(`/reminders/agreements/${id}/renew`, data),
};

export default api;
