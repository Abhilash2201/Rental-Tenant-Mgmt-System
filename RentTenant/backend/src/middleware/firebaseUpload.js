/**
 * @file middleware/firebaseUpload.js
 * @description File upload middleware using Multer + Firebase Storage.
 * Files are uploaded to Firebase Cloud Storage (not Cloudinary).
 * Returns a signed download URL that's valid for 7 days.
 *
 * Usage in routes:
 *   router.post('/buildings', protect, upload.array('photos', 5), controller);
 *   router.post('/tenants',   protect, upload.single('photo'),    controller);
 */

const multer = require("multer");
const { storage } = require("../config/firebase");
const { AppError } = require("./errorHandler");
const { v4: uuid } = require("uuid");

// ── Multer Memory Storage ────────────────────────────────────────────────────
/**
 * Store files in memory (not on disk) so we can immediately upload to Firebase.
 * Files are lost if server restarts, but that's fine for temporary uploads.
 */
const memoryStorage = multer.memoryStorage();

/**
 * Create multer instances for different field types
 */
const upload = {
  // Single file upload (e.g., profile pic, tenant photo)
  single: (fieldname) =>
    multer({
      storage: memoryStorage,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }).single(fieldname),

  // Multiple files upload (e.g., building photos)
  array: (fieldname, maxFiles) =>
    multer({
      storage: memoryStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    }).array(fieldname, maxFiles),
};

/**
 * Upload a file to Firebase Storage.
 * Returns a signed download URL valid for 7 days.
 *
 * @param {Object} file - Multer file object { buffer, originalname, mimetype }
 * @param {string} folder - Cloud Storage folder (e.g., 'buildings', 'tenants')
 * @param {string} userId - Firebase UID for organizing uploads
 * @returns {Promise<string>} Signed download URL
 */
const uploadToFirebase = async (file, folder, userId) => {
  try {
    const bucket = storage.bucket();

    // Create unique filename: folder/userId/uuid-originalname
    const filename = `${folder}/${userId}/${uuid()}-${file.originalname}`;
    const fileRef = bucket.file(filename);

    // Upload file to Firebase Storage
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Generate signed URL (valid for 7 days)
    const [signedUrl] = await fileRef.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log(`✅ File uploaded: ${filename}`);
    return signedUrl;
  } catch (err) {
    console.error("❌ Firebase upload error:", err);
    throw new AppError("Failed to upload file to storage", 500);
  }
};

/**
 * Middleware to handle single file upload to Firebase.
 * Usage: router.put('/profile', protect, firebaseUpload.singleFileMiddleware('profile_pic'), controller);
 */
const singleFileMiddleware = (fieldname) => {
  return async (req, res, next) => {
    const uploadMiddleware = upload.single(fieldname);

    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return next(new AppError(err.message, 400));
      }

      if (req.file) {
        try {
          const url = await uploadToFirebase(req.file, fieldname, req.user.uid);
          req.fileUrl = url;
        } catch (err) {
          return next(err);
        }
      }

      next();
    });
  };
};

/**
 * Middleware to handle multiple file uploads to Firebase.
 * Usage: router.post('/buildings', protect, firebaseUpload.multiFileMiddleware('photos', 5), controller);
 */
const multiFileMiddleware = (fieldname, maxFiles) => {
  return async (req, res, next) => {
    const uploadMiddleware = upload.array(fieldname, maxFiles);

    uploadMiddleware(req, res, async (err) => {
      if (err) {
        return next(new AppError(err.message, 400));
      }

      if (req.files && req.files.length > 0) {
        try {
          const urls = await Promise.all(
            req.files.map((file) =>
              uploadToFirebase(file, fieldname, req.user.uid),
            ),
          );
          req.fileUrls = urls;
        } catch (err) {
          return next(err);
        }
      }

      next();
    });
  };
};

/**
 * Middleware to handle uploads for multiple named fields to Firebase.
 * Sets req.uploadedFiles[fieldname] = [url, ...] for each field that has files.
 * Usage: router.post('/tenants', protect, fieldsMiddleware([{name:'photo',maxCount:1},{name:'id_proof',maxCount:1}]), controller);
 *
 * @param {Array<{name: string, maxCount: number}>} fields
 */
const fieldsMiddleware = (fields) => {
  return async (req, res, next) => {
    const uploadMiddleware = multer({
      storage: memoryStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
    }).fields(fields);

    uploadMiddleware(req, res, async (err) => {
      if (err) return next(new AppError(err.message, 400));

      req.uploadedFiles = {};

      if (req.files && typeof req.files === "object") {
        try {
          for (const fieldname of Object.keys(req.files)) {
            const filesForField = req.files[fieldname];
            if (filesForField && filesForField.length > 0) {
              req.uploadedFiles[fieldname] = await Promise.all(
                filesForField.map((file) =>
                  uploadToFirebase(file, fieldname, req.user.uid),
                ),
              );
            }
          }
        } catch (uploadErr) {
          return next(uploadErr);
        }
      }

      next();
    });
  };
};

module.exports = {
  upload,
  uploadToFirebase,
  singleFileMiddleware,
  multiFileMiddleware,
  fieldsMiddleware,
};
