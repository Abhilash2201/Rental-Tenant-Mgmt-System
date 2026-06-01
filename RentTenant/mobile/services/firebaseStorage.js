/**
 * @file services/firebaseStorage.js
 * @description Firebase Storage utility functions for React Native/Expo mobile app.
 * Handles image uploads to Firebase Storage.
 */

import storage from "@react-native-firebase/storage";
import auth from "@react-native-firebase/auth";
import * as FileSystem from "expo-file-system";

/**
 * Upload a single image to Firebase Storage
 * @param {Object} image - Image object from expo-image-picker { uri, type, name }
 * @param {string} folder - Storage folder (e.g., 'owners', 'buildings', 'tenants')
 * @returns {Promise<string>} Download URL
 */
export const uploadImage = async (image, folder) => {
  if (!auth().currentUser) {
    throw new Error("User not authenticated");
  }

  try {
    const userId = auth().currentUser.uid;
    const timestamp = Date.now();
    const filename = `${folder}/${userId}/${timestamp}-${image.name}`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(image.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Firebase Storage
    const ref = storage().ref(filename);
    await ref.putString(base64, "base64", {
      contentType: image.type || "image/jpeg",
    });

    // Get download URL
    const url = await ref.getDownloadURL();
    return url;
  } catch (err) {
    console.error("Upload error:", err);
    throw new Error("Failed to upload image");
  }
};

/**
 * Upload multiple images to Firebase Storage
 * @param {Array} images - Array of image objects
 * @param {string} folder - Storage folder
 * @returns {Promise<string[]>} Array of download URLs
 */
export const uploadImages = async (images, folder) => {
  const urls = await Promise.all(
    images.map((image) => uploadImage(image, folder)),
  );
  return urls;
};

/**
 * Upload profile picture
 * @param {Object} image - Image object from expo-image-picker
 * @returns {Promise<string>} Download URL
 */
export const uploadProfilePic = async (image) => {
  return uploadImage(image, "owners");
};

/**
 * Upload building photos
 * @param {Array} images - Array of image objects
 * @returns {Promise<string[]>} Array of download URLs
 */
export const uploadBuildingPhotos = async (images) => {
  return uploadImages(images, "buildings");
};

/**
 * Upload tenant photo
 * @param {Object} image - Image object
 * @returns {Promise<string>} Download URL
 */
export const uploadTenantPhoto = async (image) => {
  return uploadImage(image, "tenants");
};

/**
 * Upload ID proof
 * @param {Object} image - Image object
 * @returns {Promise<string>} Download URL
 */
export const uploadIdProof = async (image) => {
  return uploadImage(image, "id-proofs");
};

/**
 * Upload document
 * @param {Object} image - Image/document object
 * @returns {Promise<string>} Download URL
 */
export const uploadDocument = async (image) => {
  return uploadImage(image, "documents");
};
