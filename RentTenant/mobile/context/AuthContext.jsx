/**
 * @file context/AuthContext.jsx
 * @description Global auth context for the mobile app.
 * Uses expo-secure-store (encrypted native storage) instead of localStorage.
 * Token is verified on app launch — auto-redirects if expired.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, saveToken, saveOwner, removeToken, removeOwner, getToken, getOwner } from '../services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the entire app (see app/_layout.jsx).
 * On mount it reads the stored token and verifies it with /auth/me.
 */
export const AuthProvider = ({ children }) => {
  const [owner,   setOwner]   = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  /**
   * On app launch: read SecureStore → verify token with API.
   * If invalid/expired, clears storage and shows login screen.
   */
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          setLoading(false);
          return;
        }
        // Token found — verify it's still valid
        setToken(storedToken);
        const res = await authAPI.getMe();
        setOwner(res.data.owner);
      } catch {
        // Token invalid or expired — clear it
        await removeToken();
        await removeOwner();
        setToken(null);
        setOwner(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  /**
   * Call after successful login/register.
   * Saves token + owner to SecureStore and updates state.
   *
   * @param {string} newToken
   * @param {Object} ownerData
   */
  const login = async (newToken, ownerData) => {
    await saveToken(newToken);
    await saveOwner(ownerData);
    setToken(newToken);
    setOwner(ownerData);
  };

  /**
   * Clears all auth data from SecureStore and state.
   */
  const logout = async () => {
    await removeToken();
    await removeOwner();
    setToken(null);
    setOwner(null);
  };

  /**
   * Update the owner object in state + storage (e.g. after profile update).
   * @param {Object} updatedOwner
   */
  const updateOwner = async (updatedOwner) => {
    await saveOwner(updatedOwner);
    setOwner(updatedOwner);
  };

  return (
    <AuthContext.Provider
      value={{
        owner,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        logout,
        updateOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume auth context anywhere in the app.
 * @returns {{ owner, token, loading, isAuthenticated, login, logout, updateOwner }}
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
