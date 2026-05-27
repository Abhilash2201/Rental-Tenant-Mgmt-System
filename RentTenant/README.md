# 🏢 Rent & Tenant Management System

A full-stack property management system for building owners to manage tenants, collect rent, and get automated reminders.

---

## 📁 Project Structure (Monorepo)

```
RentTenant/
├── backend/     ← Node.js + Express REST API + PostgreSQL
├── web/         ← React.js + Vite web dashboard (Tailwind CSS)
└── mobile/      ← React Native Expo mobile app
```

---

## 🚀 Quick Start

### 1. Backend API

```bash
cd backend

# Install dependencies
npm install

# Copy env file and fill in your values
copy .env.example .env

# Initialize the database (creates all 8 tables)
npm run db:init

# Start development server
npm run dev
# → API running at  http://localhost:5000
# → Swagger UI at   http://localhost:5000/api-docs
# → Health check at http://localhost:5000/health
```

**Required `.env` values:**
| Variable | Description |
|---|---|
| `DB_HOST` | PostgreSQL host (e.g. `localhost`) |
| `DB_NAME` | Database name (e.g. `rent_tenant_db`) |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `JWT_SECRET` | Any long random string |
| `CLOUDINARY_*` | From [cloudinary.com](https://cloudinary.com) |
| `EMAIL_USER` | Gmail address for sending reminders |
| `EMAIL_PASS` | Gmail App Password (not your login password) |

---

### 2. Web Dashboard

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev
# → http://localhost:5173
```

> **Note:** The Vite dev server proxies `/api/*` requests to `http://localhost:5000` automatically. No CORS issues in development.

---

### 3. Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Copy env file and set your machine's LAN IP
copy .env.example .env
# Edit EXPO_PUBLIC_API_URL=http://192.168.1.x:5000/api

# Start Expo development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios
```

> **Important:** Set `EXPO_PUBLIC_API_URL` to your computer's **local network IP** (not `localhost`) so the phone/emulator can reach the backend.

---

## 🏗️ Backend Architecture

```
backend/
├── server.js                   ← Entry point (Express + Swagger + Cron)
├── src/
│   ├── config/
│   │   ├── db.js               ← PostgreSQL pool + query helpers
│   │   └── swagger.js          ← OpenAPI 3.0 spec + reusable schemas
│   ├── models/
│   │   └── index.js            ← DB schema (8 tables + triggers + indexes)
│   ├── middleware/
│   │   ├── auth.js             ← JWT protect middleware + token generator
│   │   ├── errorHandler.js     ← AppError class + global error handler
│   │   └── upload.js           ← Multer + Cloudinary file upload
│   ├── controllers/            ← Business logic (5 modules)
│   ├── routes/                 ← Express routes with @swagger JSDoc (6 files)
│   └── services/
│       ├── emailService.js     ← Nodemailer HTML email templates
│       └── reminderCron.js     ← Daily 9AM cron job (reminders + overdue)
```

### Database Tables

| Table | Description |
|---|---|
| `owners` | Property owner accounts |
| `buildings` | Buildings with address + photo array |
| `units` | Homes/offices per floor |
| `tenants` | Tenant profiles + ID proof + emergency contact |
| `agreements` | 2-year rent agreements |
| `rent_records` | Monthly payment ledger |
| `reminders` | Scheduled alerts (3 types) |
| `notifications` | In-app notification log |

---

## 🌐 Web Dashboard Architecture

```
web/
├── src/
│   ├── api/
│   │   ├── axios.js        ← Axios instance (JWT interceptor + 401 redirect)
│   │   └── index.js        ← All API functions (authAPI, buildingAPI, etc.)
│   ├── context/
│   │   └── AuthContext.jsx ← JWT state + localStorage persistence
│   ├── components/
│   │   └── layout/
│   │       └── MainLayout.jsx  ← Sidebar + header + notification badge
│   └── pages/
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       ├── DashboardPage.jsx     ← Stats + reminders + pending rents
│       ├── BuildingsPage.jsx     ← Building grid + add modal + photo upload
│       ├── BuildingDetailPage.jsx← Floors/units view + add unit
│       ├── TenantsPage.jsx       ← Tenant list + add tenant modal
│       ├── TenantDetailPage.jsx  ← Full profile + rent history + move-out
│       ├── RentsPage.jsx         ← Pending rents + monthly report
│       ├── RemindersPage.jsx     ← All 3 reminder types + notifications
│       └── ProfilePage.jsx       ← Owner profile + change password
```

---

## 📱 Mobile App Architecture

```
mobile/
├── app/
│   ├── _layout.jsx         ← Root layout (providers + AuthGate redirect)
│   ├── (auth)/
│   │   ├── _layout.jsx     ← Auth stack (no tab bar)
│   │   ├── login.jsx       ← Login screen
│   │   └── register.jsx    ← Register screen
│   └── (tabs)/
│       ├── _layout.jsx     ← Bottom tab navigator (5 tabs)
│       ├── index.jsx       ← Dashboard (stats + reminders + pending rents)
│       ├── buildings.jsx   ← Building list + add building modal
│       ├── tenants.jsx     ← Tenant list with search + filter tabs
│       ├── rents.jsx       ← Pending rents + mark paid modal
│       ├── reminders.jsx   ← All reminders + notifications
│       └── profile.jsx     ← Owner profile + change password + logout
├── services/
│   └── api.js              ← Axios + SecureStore token + all API functions
├── context/
│   └── AuthContext.jsx     ← Auth state (SecureStore instead of localStorage)
└── constants/
    └── colors.js           ← Dark theme color palette
```

---

## 📚 API Documentation

Swagger UI is available at **`http://localhost:5000/api-docs`** after starting the backend.

### Endpoints Summary

| Module | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Buildings | `GET/POST /api/buildings`, `GET/PUT/DELETE /api/buildings/:id` |
| Units | `GET/POST /api/buildings/:id/units`, `GET/PUT/DELETE .../units/:id` |
| Tenants | `GET/POST /api/tenants`, `GET/PUT /api/tenants/:id`, `PUT .../move-out` |
| Rent | `GET /api/rents/pending`, `GET /api/rents/report`, `PUT /api/rents/:id/pay` |
| Reminders | `GET /api/reminders`, `PUT /api/reminders/:id/dismiss` |

---

## 🔔 Reminder System

Three automated reminder types (created when a tenant is added):

| Type | Trigger | Action |
|---|---|---|
| `rent_due` | 3 days before monthly due date | Email + in-app notification |
| `rent_increment` | 11 months after move-in | Suggest rent revision |
| `agreement_renewal` | 60 days before 2-year end date | Prompt to renew/terminate |

The **daily cron job** runs at 9:00 AM IST, checks all due reminders, sends emails, creates in-app notifications, and auto-reschedules next month's rent reminders.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Express.js |
| Database | PostgreSQL (raw `pg` — no ORM) |
| File Storage | Cloudinary |
| Email | Nodemailer (Gmail SMTP) |
| Scheduler | node-cron |
| API Docs | Swagger UI (swagger-jsdoc) |
| Web Frontend | React 19, Vite, Tailwind CSS v4 |
| Web State | TanStack Query v5, React Router v7 |
| Mobile | React Native, Expo SDK 53 |
| Mobile Router | Expo Router v4 (file-based) |
| Mobile Storage | expo-secure-store |
| Auth | JWT (jsonwebtoken + bcryptjs) |
