/**
 * @file context/AuthContext.jsx
 * @description Firebase authentication context for React Native/Expo mobile app.
 * Uses react-native-firebase for auth and storage.
 * Tokens are automatically managed by Firebase.
 */

import { createContext, useContext, useState, useEffect } from "react";
import auth from "@react-native-firebase/auth";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the entire app (see app/_layout.jsx).
 * Listens to Firebase auth state changes.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Listen to Firebase auth state changes
   * This runs once on mount and whenever auth state changes
   */
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Check if user profile exists in our database
          const response = await authAPI.profileExists();
          if (response.data.exists) {
            setOwner(response.data.profile);
          } else {
            // First time login - user needs to create profile
            setOwner(null);
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
      const result = await auth().createUserWithEmailAndPassword(
        email,
        password,
      );

      // Update profile name
      await result.user.updateProfile({ displayName: name });

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
      const response = await authAPI.createProfile(name, phone);
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
      const result = await auth().signInWithEmailAndPassword(email, password);
      return result.user;
    } catch (err) {
      const errorMsg =
        err.code === "auth/invalid-email"
          ? "Invalid email format"
          : err.code === "auth/user-not-found"
            ? "Email not registered"
            : err.code === "auth/wrong-password"
              ? "Incorrect password"
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
      await auth().signOut();
      setUser(null);
      setOwner(null);
      router.replace("/(auth)/login");
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Update user profile
   * @param {string} name
   * @param {string} phone
   * @param {Object} profilePic - Image object from expo-image-picker
   * @returns {Promise<Object>} Updated owner profile
   */
  const updateUserProfile = async (name, phone, profilePic = null) => {
    try {
      setError(null);
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);

      if (profilePic) {
        // Convert expo-image-picker image to FormData blob
        const uriParts = profilePic.uri.split(".");
        const fileType = `image/${uriParts[uriParts.length - 1]}`;

        formData.append("profile_pic", {
          uri: profilePic.uri,
          type: fileType,
          name:
            profilePic.fileName || `profile.${uriParts[uriParts.length - 1]}`,
        });
      }

      const response = await authAPI.updateMe(formData);
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
      const response = await authAPI.getMe();
      setOwner(response.data.owner);
      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch profile";
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        owner,
        loading,
        error,
        isAuthenticated: !!user,
        register,
        createUserProfile,
        login,
        logout,
        updateUserProfile,
        getProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to consume auth context anywhere in the app.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
