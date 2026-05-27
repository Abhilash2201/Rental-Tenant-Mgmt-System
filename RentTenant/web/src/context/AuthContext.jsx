/**
 * @file context/AuthContext.jsx
 * @description Global authentication context.
 * Provides owner state, login, logout, and token management to all components.
 * Wrap the app with <AuthProvider> in main.jsx.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';

// Create the context
const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and provides auth state to all children.
 * Reads token + owner from localStorage on mount (persists across page refreshes).
 *
 * @param {ReactNode} children - Child components
 */
export const AuthProvider = ({ children }) => {
  // Initialize from localStorage so user stays logged in on refresh
  const [owner, setOwner]   = useState(() => {
    try {
      const stored = localStorage.getItem('owner');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken]     = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true); // Initial auth check in progress

  /**
   * On mount: verify the stored token is still valid by calling /auth/me.
   * If token expired or missing, clear auth state.
   */
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await authAPI.getMe();
        setOwner(res.data.owner);
      } catch {
        // Token invalid — clear everything
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []); // Run once on mount

  /**
   * Login: stores token and owner in state + localStorage.
   *
   * @param {string} newToken - JWT token from API response
   * @param {Object} ownerData - Owner profile from API response
   */
  const login = (newToken, ownerData) => {
    setToken(newToken);
    setOwner(ownerData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('owner', JSON.stringify(ownerData));
  };

  /**
   * Logout: clears all auth state and localStorage.
   * Redirect to /login is handled by the router.
   */
  const logout = () => {
    setToken(null);
    setOwner(null);
    localStorage.removeItem('token');
    localStorage.removeItem('owner');
  };

  /**
   * Update owner in state (called after profile update).
   *
   * @param {Object} updatedOwner - New owner data
   */
  const updateOwner = (updatedOwner) => {
    setOwner(updatedOwner);
    localStorage.setItem('owner', JSON.stringify(updatedOwner));
  };

  // Expose auth values and functions to all consumers
  const value = {
    owner,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    logout,
    updateOwner,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to consume AuthContext.
 * Throws an error if used outside of AuthProvider.
 *
 * @returns {Object} Auth context value
 * @example
 *   const { owner, logout, isAuthenticated } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
