#!/bin/bash
# Firebase Setup Quick Start Guide

echo "🚀 Firebase Integration Setup Checklist"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

print_done() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_todo() {
    echo -e "${RED}⚠ $1${NC}"
}

echo "📚 DOCUMENTATION"
print_step "Read the following files in order:"
echo "  1. FIREBASE_INTEGRATION_SUMMARY.md - Overview & quick reference"
echo "  2. SETUP_INSTRUCTIONS.md - Step-by-step setup"
echo "  3. FIREBASE_MIGRATION_GUIDE.md - Detailed migration guide"
echo ""

echo "🔐 STEP 1: Firebase Project Setup"
print_todo "Create Firebase project at https://firebase.google.com"
print_todo "Enable Email/Password Authentication"
print_todo "Enable Cloud Storage"
print_todo "Create service account & download JSON key"
print_todo "Get Firebase config for web & mobile apps"
echo ""

echo "📝 STEP 2: Environment Variables"
print_step "Backend (.env)"
echo "  Copy backend/.env.example to backend/.env"
echo "  Add Firebase credentials:"
echo "    - FIREBASE_PROJECT_ID"
echo "    - FIREBASE_PRIVATE_KEY"
echo "    - FIREBASE_CLIENT_EMAIL"
echo "    - FIREBASE_STORAGE_BUCKET"
echo ""

print_step "Web (.env.local)"
echo "  Copy web/.env.example to web/.env.local"
echo "  Add Firebase config from Firebase Console"
echo ""

print_step "Mobile (.env)"
echo "  Copy mobile/.env.example to mobile/.env"
echo "  Add Firebase config and API URL"
echo ""

echo "📦 STEP 3: Install Dependencies"
print_step "Backend"
echo "  cd backend && npm install"
echo "  Packages updated:"
echo "    + firebase-admin"
echo "    - bcryptjs (removed)"
echo "    - cloudinary (removed)"
echo "    - jsonwebtoken (removed)"
echo ""

print_step "Web"
echo "  cd web && npm install firebase"
echo ""

print_step "Mobile"
echo "  cd mobile && npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/storage"
echo ""

echo "🗄️  STEP 4: Database Migration"
print_step "Add Firebase UID column:"
echo "  ALTER TABLE owners ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;"
echo ""

echo "🛠️  STEP 5: Code Updates"
print_todo "Backend:"
echo "  • Update all routes to use firebaseAuth middleware"
echo "  • Update file upload routes to use firebaseUpload middleware"
echo "  • Add require('./src/config/firebase') to server.js"
echo "  • Update auth controllers to use new Firebase service"
echo ""

print_todo "Web:"
echo "  • Update LoginPage to use new AuthContext"
echo "  • Update RegisterPage to use register + createUserProfile"
echo "  • Update ProfilePage to use updateUserProfile"
echo "  • Update Building/Tenant forms to use firebaseStorage"
echo ""

print_todo "Mobile:"
echo "  • Update LoginScreen to use new AuthContext"
echo "  • Update RegisterScreen to use register + createUserProfile"
echo "  • Update ProfileScreen to use updateUserProfile"
echo "  • Update Building/Tenant screens to use firebaseStorage"
echo ""

echo "✅ STEP 6: Testing"
print_step "Backend"
echo "  npm run dev"
echo "  Test endpoints with Postman"
echo ""

print_step "Web"
echo "  npm run dev"
echo "  Test login, register, profile update"
echo ""

print_step "Mobile"
echo "  expo start"
echo "  Test on Android emulator or iOS simulator"
echo ""

echo "🚀 STEP 7: Deployment"
print_step "Add Firebase env vars to production environment"
print_step "Deploy backend"
print_step "Deploy web"
print_step "Build and deploy mobile app"
echo ""

echo "═══════════════════════════════════════"
echo "✅ Firebase Integration Setup Complete!"
echo "═══════════════════════════════════════"
echo ""
echo "Quick Links:"
echo "  • Firebase Console: https://firebase.google.com/console"
echo "  • Firebase Auth Docs: https://firebase.google.com/docs/auth"
echo "  • Firebase Storage Docs: https://firebase.google.com/docs/storage"
echo ""
echo "Questions? See FIREBASE_MIGRATION_GUIDE.md → Troubleshooting section"
