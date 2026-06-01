/\*\*

- @file SETUP_INSTRUCTIONS.md
- @description Step-by-step setup instructions for Firebase integration
  \*/

# Firebase Setup Instructions

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Web
cd web
npm install firebase

# Mobile
cd mobile
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/storage
```

### 2. Configure Environment Variables

#### Backend (.env)

```bash
cp .env.example .env
# Edit .env and add Firebase credentials from Firebase Console
```

#### Web (.env.local)

```bash
cp .env.example .env.local
# Edit .env.local and add Firebase config
```

#### Mobile (.env)

```bash
cp .env.example .env
# Edit .env and add Firebase config
```

### 3. Update Database Schema

Run this SQL to add Firebase UID column:

```sql
ALTER TABLE owners ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;
```

### 4. Update Backend Routes

The new Firebase-based auth routes are:

**File**: `backend/src/routes/firebaseAuthRoutes.js`

New endpoints:

- `POST /api/auth/create-profile` - Create user profile after signup
- `GET /api/auth/me` - Get user profile
- `GET /api/auth/profile-exists` - Check if profile exists
- `PUT /api/auth/me` - Update profile (with photo upload)

**Update other routes to use Firebase middleware:**

In all route files, replace:

```javascript
const { protect } = require("../middleware/auth");
```

With:

```javascript
const { protect } = require("../middleware/firebaseAuth");
```

### 5. Update File Upload Routes

For routes that upload files (buildings, tenants, etc.):

**Old way** (Cloudinary):

```javascript
router.post(
  "/buildings",
  protect,
  upload.array("photos", 5),
  controller.create,
);
```

**New way** (Firebase Storage):

```javascript
const { multiFileMiddleware } = require("../middleware/firebaseUpload");

router.post(
  "/buildings",
  protect,
  multiFileMiddleware("photos", 5),
  controller.create,
);
```

### 6. Update Server.js

Make sure `server.js` initializes Firebase config:

```javascript
// Add near the top of server.js
require("./src/config/firebase");
```

### 7. Update Auth Controllers

For any custom auth endpoints that handle registration/login, either:

- Remove them (let Firebase handle this on client)
- Or modify them to use Firebase Admin SDK

For other endpoints using req.owner, update to use req.user:

```javascript
// OLD
const ownerId = req.owner.id;

// NEW
// You need to fetch ownerId from database using Firebase UID
const firebaseUid = req.user.uid;
const ownerData = await query("SELECT id FROM owners WHERE firebase_uid = $1", [
  firebaseUid,
]);
const ownerId = ownerData.rows[0].id;
```

### 8. Test the Setup

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start web
cd web
npm run dev

# Terminal 3: Start mobile
cd mobile
expo start
```

## Important Files Created

### Backend

- `src/config/firebase.js` - Firebase Admin initialization
- `src/middleware/firebaseAuth.js` - Firebase authentication middleware
- `src/middleware/firebaseUpload.js` - Firebase Storage upload middleware
- `src/services/firebaseAuthService.js` - User profile management
- `src/controllers/firebaseAuthController.js` - Auth endpoints
- `src/routes/firebaseAuthRoutes.js` - Auth routes

### Web

- `src/firebase.js` - Firebase SDK initialization
- `src/context/AuthContext.jsx` - Updated with Firebase
- `src/api/axios.js` - Updated with Firebase token handling
- `src/api/firebaseStorage.js` - Firebase Storage utilities

### Mobile

- `firebase.js` - React Native Firebase initialization
- `context/AuthContext.jsx` - Updated with Firebase
- `services/firebaseStorage.js` - Firebase Storage utilities

## Migration Checklist

- [ ] Create Firebase project
- [ ] Enable Firebase Auth (Email/Password)
- [ ] Enable Firebase Storage
- [ ] Download service account JSON
- [ ] Add Firebase credentials to all .env files
- [ ] Run database schema update
- [ ] Install dependencies
- [ ] Update middleware in backend
- [ ] Update auth routes
- [ ] Update file upload routes
- [ ] Test backend endpoints with Postman
- [ ] Update web login/register pages
- [ ] Test web app
- [ ] Update mobile login/register pages
- [ ] Test mobile app
- [ ] Remove old auth/upload code

## Next Steps After Setup

1. **Update Login Page** - Use new AuthContext methods
2. **Update Register Page** - Use register + createUserProfile
3. **Update Profile Page** - Use updateUserProfile with file upload
4. **Update Building Form** - Use Firebase Storage for photos
5. **Update Tenant Form** - Use Firebase Storage for photos
6. **Test all flows** - Registration, login, logout, profile update
7. **Remove old code** - Delete old auth middleware, Cloudinary config, etc.

## Security Notes

1. **Enable Firebase Storage rules** (see FIREBASE_MIGRATION_GUIDE.md)
2. **Enable Email verification** for new users
3. **Set up password reset** flow in your app
4. **Enable reCAPTCHA** in Firebase Auth console (optional but recommended)
5. **Monitor Firebase usage** to stay within free tier limits

## Troubleshooting

See "Troubleshooting" section in FIREBASE_MIGRATION_GUIDE.md
