/**
 * @file context/AuthContext.jsx
 * @description Firebase authentication context for web application.
 * Manages user auth state using Firebase Auth SDK.
 *
 * Features:
 * - Automatic token refresh (Firebase handles this)
 * - User session persistence
 * - Loading state during auth checks
 * - Error handling for auth operations
 */

import { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";
import api from "../api/axios";

const AuthContext = createContext();

/**
 * AuthProvider component - wrap your entire app with this
 * Usage: <AuthProvider><App /></AuthProvider>
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Listen to Firebase auth state changes
   * This runs once on mount and whenever auth state changes
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Check if user profile exists in our database
          const response = await api.get("/auth/profile-exists");
          if (response.data.exists) {
            setOwner(response.data.profile);
          } else {
            // Auto-create profile on first login using Firebase display name
            try {
              const created = await api.post("/auth/create-profile", {
                name: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              });
              setOwner(created.data.owner);
            } catch {
              setOwner(null);
            }
          }
        } else {
          setUser(null);
          setOwner(null);
        }
      } catch (err) {
        console.error("Auth state error:", err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  /**
   * Register a new user with Firebase
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @returns {Promise<Object>} Firebase user
   */
  const register = async (email, password, name) => {
    try {
      setError(null);
      // Create user in Firebase Auth
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Update profile name in Firebase
      await updateProfile(result.user, { displayName: name });

      // Now user needs to create their profile in our database
      // This will be done in a separate step after they see the registration success

      return result.user;
    } catch (err) {
      const errorMsg =
        err.code === "auth/email-already-in-use"
          ? "Email already registered"
          : err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * Create user profile in database after Firebase registration
   * @param {string} name
   * @param {string} phone
   * @returns {Promise<Object>} Owner profile
   */
  const createUserProfile = async (name, phone = "") => {
    try {
      setError(null);
      const response = await api.post("/auth/create-profile", { name, phone });
      setOwner(response.data.owner);
      return response.data.owner;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create profile";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * Login an existing user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Firebase user
   */
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
    } catch (err) {
      const errorMsg =
        err.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : err.message;
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      setOwner(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Update user profile
   * @param {string} name
   * @param {string} phone
   * @param {File} profilePic
   * @returns {Promise<Object>} Updated owner profile
   */
  const updateUserProfile = async (name, phone, profilePic = null) => {
    try {
      setError(null);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      if (profilePic) {
        formData.append("profile_pic", profilePic);
      }

      const response = await api.put("/auth/me", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOwner(response.data.owner);
      return response.data.owner;
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to update profile";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  /**
   * Get current user's profile and stats
   */
  const getProfile = async () => {
    try {
      setError(null);
      const response = await api.get("/auth/me");
      setOwner(response.data.owner);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch profile";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const value = {
    user,
    owner,
    loading,
    error,
    register,
    createUserProfile,
    login,
    logout,
    updateUserProfile,
    getProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Usage: const { user, login, logout } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
