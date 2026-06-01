/**
 * @file config/firebase.js
 * @description Firebase Admin SDK initialization.
 *
 * Set these environment variables:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_PRIVATE_KEY (from service account JSON, replace \\n with actual newlines)
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_STORAGE_BUCKET (projectId.appspot.com)
 *
 * Get credentials from Firebase Console → Project Settings → Service Accounts
 */

const admin = require("firebase-admin");
require("dotenv").config();

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const auth = admin.auth();
const storage = admin.storage();

console.log("✅ Firebase Admin SDK initialized");

module.exports = { admin, auth, storage };
