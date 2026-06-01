/**
 * @file api/index.js
 * @description All API service functions, organized by module.
 * Each function wraps an Axios call and returns the response data.
 * Import from this file across all pages/components.
 *
 * Usage:
 *   import { buildingAPI } from '../api';
 *   const buildings = await buildingAPI.getAll();
 */

import api from './axios';

// ══════════════════════════════════════════════════════════════════════════════
// AUTH API
// ══════════════════════════════════════════════════════════════════════════════

export const authAPI = {
  /** Get logged-in owner's profile + stats */
  getMe: () => api.get('/auth/me'),

  /** Update owner profile (name, phone, profile_pic) */
  updateMe: (formData) =>
    api.put('/auth/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Check if DB profile exists for current Firebase user */
  profileExists: () => api.get('/auth/profile-exists'),
};

// ══════════════════════════════════════════════════════════════════════════════
// BUILDING API
// ══════════════════════════════════════════════════════════════════════════════

export const buildingAPI = {
  /** Get all buildings (with pagination and search) */
  getAll: (params) => api.get('/buildings', { params }),

  /** Get single building with floors and units */
  getById: (id) => api.get(`/buildings/${id}`),

  /** Create a new building (with photo uploads) */
  create: (formData) =>
    api.post('/buildings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Update building details and/or add photos */
  update: (id, formData) =>
    api.put(`/buildings/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Delete a specific building photo */
  deletePhoto: (id, photoUrl) =>
    api.delete(`/buildings/${id}/photos`, { data: { photo_url: photoUrl } }),

  /** Delete a building */
  delete: (id) => api.delete(`/buildings/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// UNIT API
// ══════════════════════════════════════════════════════════════════════════════

export const unitAPI = {
  /** Get all units in a building */
  getAll: (buildingId, params) =>
    api.get(`/buildings/${buildingId}/units`, { params }),

  /** Get a single unit */
  getById: (buildingId, unitId) =>
    api.get(`/buildings/${buildingId}/units/${unitId}`),

  /** Add a new unit to a building */
  create: (buildingId, data) =>
    api.post(`/buildings/${buildingId}/units`, data),

  /** Update a unit */
  update: (buildingId, unitId, data) =>
    api.put(`/buildings/${buildingId}/units/${unitId}`, data),

  /** Delete a vacant unit */
  delete: (buildingId, unitId) =>
    api.delete(`/buildings/${buildingId}/units/${unitId}`),
};

// ══════════════════════════════════════════════════════════════════════════════
// TENANT API
// ══════════════════════════════════════════════════════════════════════════════

export const tenantAPI = {
  /** Get all tenants */
  getAll: (params) => api.get('/tenants', { params }),

  /** Get single tenant with full details */
  getById: (id) => api.get(`/tenants/${id}`),

  /** Add tenant + auto-creates agreement, rent record, reminders */
  create: (formData) =>
    api.post('/tenants', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Update tenant details */
  update: (id, formData) =>
    api.put(`/tenants/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  /** Move out tenant */
  moveOut: (id, data) => api.put(`/tenants/${id}/move-out`, data),
};

// ══════════════════════════════════════════════════════════════════════════════
// RENT API
// ══════════════════════════════════════════════════════════════════════════════

export const rentAPI = {
  /** Get all pending/overdue rents */
  getPending: () => api.get('/rents/pending'),

  /** Get monthly income report */
  getReport: (params) => api.get('/rents/report', { params }),

  /** Get rent history for a tenant */
  getByTenant: (tenantId, params) =>
    api.get(`/rents/tenant/${tenantId}`, { params }),

  /** Create a new rent record */
  create: (data) => api.post('/rents', data),

  /** Mark rent as paid */
  markPaid: (id, data) => api.put(`/rents/${id}/pay`, data),

  /** Trigger overdue update */
  markOverdue: () => api.post('/rents/mark-overdue'),
};

// ══════════════════════════════════════════════════════════════════════════════
// REMINDER API
// ══════════════════════════════════════════════════════════════════════════════

export const reminderAPI = {
  /** Get all reminders (with filters) */
  getAll: (params) => api.get('/reminders', { params }),

  /** Get today's due reminders */
  getToday: () => api.get('/reminders/today'),

  /** Get unread notification count */
  getUnreadCount: () => api.get('/reminders/unread-count'),

  /** Get in-app notifications */
  getNotifications: (params) => api.get('/reminders/notifications', { params }),

  /** Mark a single notification as read */
  markRead: (id) => api.put(`/reminders/notifications/${id}/read`),

  /** Mark all notifications as read */
  markAllRead: () => api.put('/reminders/notifications/read-all'),

  /** Dismiss a reminder */
  dismiss: (id) => api.put(`/reminders/${id}/dismiss`),

  /** Renew a rent agreement */
  renewAgreement: (agreementId, data) =>
    api.put(`/reminders/agreements/${agreementId}/renew`, data),
};
