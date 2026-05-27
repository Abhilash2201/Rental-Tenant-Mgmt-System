/**
 * @file api/axios.js
 * @description Configured Axios instance for all API calls.
 * - Automatically attaches the JWT token from localStorage to every request
 * - Handles 401 responses by redirecting to login (token expired)
 * - All API calls in the app use this instance, not the raw axios import
 */

import axios from 'axios';

/**
 * Base Axios instance.
 * In development, Vite proxies /api → http://localhost:5000
 * In production, set VITE_API_URL env variable.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// ── Request Interceptor ──────────────────────────────────────────────────────
/**
 * Attach the JWT Bearer token to every outgoing request.
 * Token is stored in localStorage after login.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ─────────────────────────────────────────────────────
/**
 * Handle global response errors:
 * - 401: Token expired or invalid → clear storage and redirect to login
 * - Other errors: Pass through for individual handlers
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('owner');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
