# Firebase Auth & Storage Migration Guide

## Overview

This guide explains how to migrate from custom JWT authentication and Cloudinary storage to Firebase Auth and Firebase Storage across your RentTenant application (backend, web, and mobile).

## What's Changing

### Before (Current Setup)

- **Authentication**: Custom JWT tokens, bcryptjs password hashing
- **Storage**: Cloudinary for images
- **Mobile Tokens**: Stored in expo-secure-store
- **Web Tokens**: Stored in localStorage

### After (Firebase Setup)

- **Authentication**: Firebase Auth (managed by Google)
- **Storage**: Firebase Cloud Storage (CDN-backed)
- **Mobile Tokens**: Automatically managed by Firebase SDK
- **Web Tokens**: Automatically managed by Firebase SDK

## Step 1: Create Firebase Project

1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Go to console" (top right)
3. Click "Create a project"
4. Enter project name: `rent-tenant`
5. Choose your region
6. Click "Create project"

## Step 2: Enable Firebase Services

### A. Enable Authentication (Email/Password)

1. In Firebase Console, go to **Authentication** (left sidebar)
2. Click **Get started**
3. Click **Email/Password** provider
4. Toggle **Enable**
5. Click **Save**

### B. Enable Cloud Storage

1. Go to **Cloud Storage** (left sidebar)
2. Click **Get started**
3. Choose region (same as project)
4. Click **Create**

## Step 3: Get Credentials

### For Backend (Firebase Admin SDK)

1. Go to **Project Settings** (gear icon, top right)
2. Click **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the JSON file somewhere safe
5. Open the JSON and copy these values to your `.env`:
   ```
   FIREBASE_PROJECT_ID=<project_id>
   FIREBASE_PRIVATE_KEY_ID=<private_key_id>
   FIREBASE_PRIVATE_KEY="<private_key>" (replace newlines with \n)
   FIREBASE_CLIENT_EMAIL=<client_email>
   FIREBASE_CLIENT_ID=<client_id>
   FIREBASE_STORAGE_BUCKET=<storage_bucket>
   ```

### For Web & Mobile (Firebase Config)

1. Go to **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Click the Web icon (for web app setup)
4. Register app: `rent-tenant-web`
5. Copy the config object and add to `.env.local`:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

6. For mobile, repeat with React Native icon and add same config to mobile `.env`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   ...
   ```

## Step 4: Install Dependencies

### Backend

```bash
cd backend
npm install firebase-admin
```

### Web

```bash
cd web
npm install firebase
```

### Mobile

```bash
cd mobile
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/storage
```

## Step 5: Update Database Schema

Add Firebase UID column to owners table:

```sql
-- Add Firebase UID column
ALTER TABLE owners ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;

-- Optional: After migration is complete, remove old auth columns
-- ALTER TABLE owners DROP COLUMN password;
-- ALTER TABLE owners DROP COLUMN password_reset_token;
-- ALTER TABLE owners DROP COLUMN password_reset_expires;
```

## Step 6: Update Routes & Middleware

### Backend Changes

**Old auth routes (no longer used):**

- `POST /api/auth/register` → Replaced by Firebase
- `POST /api/auth/login` → Replaced by Firebase
- `POST /api/auth/change-password` → Handled by Firebase

**New auth routes (for profile management):**

- `POST /api/auth/create-profile` → Create user profile after Firebase signup
- `GET /api/auth/me` → Get current user's profile
- `PUT /api/auth/me` → Update profile (name, phone, photo)
- `GET /api/auth/profile-exists` → Check if profile exists

**Update existing routes to use Firebase middleware:**

```javascript
// OLD
const { protect } = require("../middleware/auth");

// NEW
const { protect } = require("../middleware/firebaseAuth");
```

**Update file uploads:**

```javascript
// OLD
router.post("/buildings", protect, upload.array("photos", 5), controller);

// NEW
router.post(
  "/buildings",
  protect,
  firebaseUpload.multiFileMiddleware("photos", 5),
  controller,
);
```

## Step 7: Update Application Code

### Web App

**1. Update AuthContext** - Already done in `web/src/context/AuthContext.jsx`

**2. Update Login Page** (`web/src/pages/LoginPage.jsx`)

```javascript
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, error } = useAuth();

  const handleSubmit = async (email, password) => {
    try {
      await login(email, password);
      // Navigate to dashboard (Router handles this)
    } catch (err) {
      // Show error
    }
  };

  return (
    // Your login form
  );
}
```

**3. Update Register Page** (`web/src/pages/RegisterPage.jsx`)

```javascript
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, createUserProfile } = useAuth();

  const handleRegister = async (name, email, password) => {
    await register(email, password, name);
    // Then redirect to profile creation page
  };

  const handleCreateProfile = async (name, phone) => {
    await createUserProfile(name, phone);
    // Redirect to dashboard
  };

  return (
    // Your register and profile creation form
  );
}
```

**4. Update Profile Upload** - Use `firebaseStorage.js` utilities

```javascript
import { uploadProfilePic } from "../api/firebaseStorage";

const handleProfileUpdate = async (file, name, phone) => {
  let picUrl;
  if (file) {
    picUrl = await uploadProfilePic(file);
  }
  await updateUserProfile(name, phone, file);
};
```

### Mobile App

**1. Update AuthContext** - Already done in `mobile/context/AuthContext.jsx`

**2. Update Login Page** (`mobile/app/(auth)/login.jsx`)

```javascript
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login, error } = useAuth();

  const handleLogin = async (email, password) => {
    try {
      await login(email, password);
      // Router redirects automatically
    } catch (err) {
      // Show error message
    }
  };

  return (
    // Your login screen
  );
}
```

**3. Update Register Page** (`mobile/app/(auth)/register.jsx`)

```javascript
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen() {
  const { register, createUserProfile } = useAuth();

  const handleRegister = async (name, email, password, phone) => {
    await register(email, password, name);
    await createUserProfile(name, phone);
    // Router redirects to dashboard
  };

  return (
    // Your register screen
  );
}
```

**4. Update Profile Photo Upload** - Use `firebaseStorage.js` utilities

```javascript
import { uploadProfilePic } from "../services/firebaseStorage";
import * as ImagePicker from "expo-image-picker";

const pickProfilePic = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
  });

  if (result.assets?.[0]) {
    const image = {
      uri: result.assets[0].uri,
      type: "image/jpeg",
      name: result.assets[0].fileName,
    };
    const url = await uploadProfilePic(image);
    return url;
  }
};
```

## Step 8: Data Migration (Optional)

If you want to migrate existing owners to Firebase:

```sql
-- Add firebase_uid to existing owners
UPDATE owners SET firebase_uid = 'migrated_' || id::text
WHERE firebase_uid IS NULL;

-- Create Firebase users programmatically using Firebase Admin SDK
-- See backend/scripts/migrate-users.js (create this)
```

## Step 9: Testing

### Backend Testing

```bash
cd backend
npm run dev
# Test endpoints with Postman using Firebase token
```

### Web Testing

```bash
cd web
npm run dev
# Test login, register, profile update
```

### Mobile Testing

```bash
cd mobile
expo start
# Test on Android emulator or iOS simulator
```

## Step 10: Deployment

### Backend

1. Set Firebase env vars in your hosting platform (Heroku, Railway, etc.)
2. Deploy: `git push heroku main`

### Web

1. Update `.env.production` with production Firebase config
2. Deploy: `npm run build && npm run preview`

### Mobile

1. Update `.env` with production API URL
2. Build: `eas build`

## Important Notes

### ⚠️ Migrating from Old Auth

**If you already have users in the database:**

1. Don't delete the `password` column immediately
2. Create Firebase users programmatically for existing users
3. Once all users are migrated, drop the password column
4. Update the `firebase_uid` foreign key to reference user's UID

### 📝 Firebase Token Handling

- **Automatic refresh**: Firebase automatically refreshes tokens
- **No need to store**: Don't save tokens in localStorage/SecureStore
- **Always available**: Use `auth.currentUser` to get current user
- **Logout clears**: All data is cleared automatically on logout

### 🔒 Security Rules for Storage

Add these Firebase Storage rules in Console:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read/write their own folder
    match /{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId;
    }

    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 📲 Email Verification (Optional)

Enable email verification after signup:

```javascript
// After registration
await auth().currentUser.sendEmailVerification();

// In app, check if verified
if (!auth().currentUser.emailVerified) {
  // Show "Please verify your email" message
}
```

## Troubleshooting

### Issue: "Private key contains invalid characters"

**Solution**: Make sure private key has actual newlines, not escaped `\n`:

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...content...
-----END PRIVATE KEY-----"
```

### Issue: "Firebase token is invalid"

**Solution**: Ensure backend correctly verifies token:

```javascript
const token = req.headers.authorization.split(" ")[1];
const decodedToken = await admin.auth().verifyIdToken(token);
```

### Issue: "Cross-origin request blocked"

**Solution**: Add your domains to Firebase Console → Authentication → Authorized domains

### Issue: "Storage bucket not found"

**Solution**: Make sure `FIREBASE_STORAGE_BUCKET` is set correctly in `.env`

## What's Next?

After migration:

1. **Delete old auth endpoints** (register, login, changePassword)
2. **Remove Cloudinary dependencies** from backend
3. **Test all authentication flows** thoroughly
4. **Update documentation** with new auth flow
5. **Plan user communication** if migrating existing users

## References

- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [React Native Firebase](https://rnfirebase.io/)
