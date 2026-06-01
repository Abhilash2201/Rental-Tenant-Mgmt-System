/**
 * @file api/firebaseStorage.js
 * @description Firebase Storage utility functions for image uploads.
 * Upload images to Firebase Storage and get download URLs.
 */

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import { auth } from "../firebase";

/**
 * Upload a single image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} folder - Storage folder (e.g., 'owners', 'buildings', 'tenants')
 * @returns {Promise<string>} Download URL
 */
export const uploadImage = async (file, folder) => {
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }

  try {
    // Create file path: folder/userId/filename
    const userId = auth.currentUser.uid;
    const timestamp = Date.now();
    const filename = `${folder}/${userId}/${timestamp}-${file.name}`;

    // Create storage reference
    const fileRef = ref(storage, filename);

    // Upload file
    await uploadBytes(fileRef, file);

    // Get download URL
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (err) {
    console.error("Upload error:", err);
    throw new Error("Failed to upload image");
  }
};

/**
 * Upload multiple images to Firebase Storage
 * @param {File[]} files - Array of image files
 * @param {string} folder - Storage folder
 * @returns {Promise<string[]>} Array of download URLs
 */
export const uploadImages = async (files, folder) => {
  const urls = await Promise.all(
    files.map((file) => uploadImage(file, folder)),
  );
  return urls;
};

/**
 * Upload profile picture
 * @param {File} file - Profile picture file
 * @returns {Promise<string>} Download URL
 */
export const uploadProfilePic = async (file) => {
  return uploadImage(file, "owners");
};

/**
 * Upload building photos
 * @param {File[]} files - Building photo files
 * @returns {Promise<string[]>} Array of download URLs
 */
export const uploadBuildingPhotos = async (files) => {
  return uploadImages(files, "buildings");
};

/**
 * Upload tenant photo
 * @param {File} file - Tenant photo file
 * @returns {Promise<string>} Download URL
 */
export const uploadTenantPhoto = async (file) => {
  return uploadImage(file, "tenants");
};

/**
 * Upload ID proof (Aadhaar, PAN, etc.)
 * @param {File} file - ID document file
 * @returns {Promise<string>} Download URL
 */
export const uploadIdProof = async (file) => {
  return uploadImage(file, "id-proofs");
};

/**
 * Upload document (agreement, contract, etc.)
 * @param {File} file - Document file
 * @returns {Promise<string>} Download URL
 */
export const uploadDocument = async (file) => {
  return uploadImage(file, "documents");
};
