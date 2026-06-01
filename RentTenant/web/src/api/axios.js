/**
 * @file api/axios.js
 * @description Configured Axios instance for all API calls.
 * - Automatically attaches Firebase ID token to every request
 * - Handles 401 responses by redirecting to login (token expired)
 * - All API calls in the app use this instance, not the raw axios import
 */

import axios from "axios";
import { auth } from "../firebase";

/**
 * Base Axios instance.
 * In development, Vite proxies /api → http://localhost:5000
 * In production, set VITE_API_URL env variable.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 second timeout
});

// ── Request Interceptor ──────────────────────────────────────────────────────
/**
 * Attach Firebase ID token to every outgoing request.
 * Firebase automatically refreshes the token when it expires.
 */
api.interceptors.request.use(
  async (config) => {
    // Wait for Firebase auth to initialise if it hasn't yet
    const currentUser = auth.currentUser ?? await new Promise((resolve) => {
      const unsub = auth.onAuthStateChanged((user) => {
        unsub();
        resolve(user);
      });
    });

    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.error("Failed to get Firebase token:", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
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
    if (error.response?.status === 401 && !auth.currentUser) {
      // Only force logout if Firebase also has no current user
      auth.signOut().catch(console.error);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
