/**
 * @file middleware/upload.js
 * @description File upload middleware using Multer + Cloudinary.
 * Images and documents are uploaded directly to Cloudinary.
 * Returns a Cloudinary URL stored in the database.
 *
 * Usage in routes:
 *   router.post('/buildings', protect, upload.array('photos', 5), controller);
 *   router.post('/tenants',   protect, upload.single('photo'),    controller);
 */

const multer    = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { AppError } = require('./errorHandler');
require('dotenv').config();

// ── Cloudinary Configuration ─────────────────────────────────────────────────
/**
 * Configure Cloudinary SDK with credentials from environment variables.
 * Sign up at https://cloudinary.com to get these values.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Cloudinary Storage Engine for Multer ─────────────────────────────────────
/**
 * CloudinaryStorage dynamically determines the folder and format
 * based on the request context (e.g. which endpoint is being called).
 */
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Determine the upload folder based on the route/field name
    let folder = 'rent-tenant/misc';

    if (file.fieldname === 'photos') {
      folder = 'rent-tenant/buildings';       // Building exterior photos
    } else if (file.fieldname === 'photo') {
      folder = 'rent-tenant/tenants';         // Tenant profile photos
    } else if (file.fieldname === 'id_proof') {
      folder = 'rent-tenant/id-proofs';       // Aadhaar / PAN uploads
    } else if (file.fieldname === 'document') {
      folder = 'rent-tenant/agreements';      // Signed agreement PDFs
    } else if (file.fieldname === 'profile_pic') {
      folder = 'rent-tenant/owners';          // Owner profile photos
    }

    return {
      folder,
      // Allowed file formats (PDFs stored as raw resources)
      format: file.mimetype === 'application/pdf' ? undefined : 'webp',
      // Use UUID-based filename to prevent collisions
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
      resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
      // Transformation: resize large images to max 1200px width to save storage
      transformation: file.mimetype.startsWith('image/')
        ? [{ width: 1200, crop: 'limit', quality: 'auto' }]
        : undefined,
    };
  },
});

// ── File Type Filter ─────────────────────────────────────────────────────────
/**
 * Restricts uploads to images and PDFs only.
 * Rejects other file types with a descriptive error.
 *
 * @param {Request}  req      - Express request
 * @param {Object}   file     - Multer file object
 * @param {Function} callback - cb(error, acceptFile)
 */
const fileFilter = (req, file, callback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true); // Accept the file
  } else {
    callback(
      new AppError(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and PDF files are allowed.`,
        400
      ),
      false // Reject the file
    );
  }
};

// ── Multer Instance ──────────────────────────────────────────────────────────
/**
 * Main multer upload instance.
 * - storage: Cloudinary (files go directly to Cloudinary, not local disk)
 * - fileFilter: Validates MIME type before upload
 * - limits: Max file size 5MB per file
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
  },
});

/**
 * Helper to delete a file from Cloudinary by its public_id.
 * Call this when a building photo or document is replaced/removed.
 *
 * @param {string} publicId    - Cloudinary public ID (from stored URL)
 * @param {string} resourceType - 'image' | 'raw' (for PDFs)
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
    // Non-fatal — log and continue (don't throw)
  }
};

/**
 * Extract Cloudinary public_id from a full URL.
 * Used when we need to delete an old image before uploading a new one.
 *
 * @param {string} url - Full Cloudinary URL
 * @returns {string}   - Cloudinary public ID (folder/filename without extension)
 */
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // URL format: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/filename.ext
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;
  // Rejoin everything after the version segment, strip file extension
  return parts
    .slice(uploadIndex + 2) // skip 'upload' and 'v<number>'
    .join('/')
    .replace(/\.[^/.]+$/, ''); // remove extension
};

module.exports = { upload, deleteFromCloudinary, getPublicIdFromUrl, cloudinary };
