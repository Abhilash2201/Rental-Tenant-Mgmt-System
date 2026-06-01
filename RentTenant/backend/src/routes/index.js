/**
 * @file routes/index.js
 * @description Central router — mounts all module routes under /api prefix.
 *
 * Route Map:
 *   POST   /api/auth/register                          → Owner register
 *   POST   /api/auth/login                             → Owner login
 *   GET    /api/auth/me                                → Get own profile
 *   PUT    /api/auth/me                                → Update profile
 *   PUT    /api/auth/change-password                   → Change password
 *
 *   GET    /api/buildings                              → List buildings
 *   POST   /api/buildings                              → Add building
 *   GET    /api/buildings/:id                          → Building detail
 *   PUT    /api/buildings/:id                          → Update building
 *   DELETE /api/buildings/:id                          → Delete building
 *   DELETE /api/buildings/:id/photos                   → Remove a photo
 *
 *   GET    /api/buildings/:buildingId/units             → List units in building
 *   POST   /api/buildings/:buildingId/units             → Add unit
 *   GET    /api/buildings/:buildingId/units/:id         → Unit detail
 *   PUT    /api/buildings/:buildingId/units/:id         → Update unit
 *   DELETE /api/buildings/:buildingId/units/:id         → Delete unit
 *
 *   GET    /api/tenants                                → All tenants (owner)
 *   POST   /api/tenants                                → Add tenant (+ auto creates agreement+reminders)
 *   GET    /api/tenants/:id                            → Tenant detail
 *   PUT    /api/tenants/:id                            → Update tenant
 *   PUT    /api/tenants/:id/move-out                   → Move out tenant
 *
 *   GET    /api/rents/pending                          → All pending/overdue rents
 *   GET    /api/rents/report                           → Monthly income report
 *   GET    /api/rents/tenant/:tenantId                 → Rent history for tenant
 *   POST   /api/rents                                  → Create rent record
 *   PUT    /api/rents/:id/pay                          → Mark rent as paid
 *   POST   /api/rents/mark-overdue                     → Mark overdues
 *
 *   GET    /api/reminders                              → All reminders
 *   GET    /api/reminders/today                        → Today's due reminders
 *   GET    /api/reminders/unread-count                 → Notification badge count
 *   GET    /api/reminders/notifications                → In-app notifications
 *   PUT    /api/reminders/notifications/read-all       → Mark all notifications read
 *   PUT    /api/reminders/notifications/:id/read       → Mark one notification read
 *   PUT    /api/reminders/:id/dismiss                  → Dismiss a reminder
 *   PUT    /api/reminders/agreements/:id/renew         → Renew agreement
 */

const express = require('express');

const authRoutes     = require('./firebaseAuthRoutes');
const buildingRoutes = require('./buildingRoutes');
const unitRoutes     = require('./unitRoutes');
const tenantRoutes   = require('./tenantRoutes');
const rentRoutes     = require('./rentRoutes');
const reminderRoutes = require('./reminderRoutes');

const router = express.Router();

// ── Mount Routes ──────────────────────────────────────────────────────────────

router.use('/auth',      authRoutes);
router.use('/buildings', buildingRoutes);

// Units are nested under buildings: /api/buildings/:buildingId/units
router.use('/buildings/:buildingId/units', unitRoutes);

router.use('/tenants',   tenantRoutes);
router.use('/rents',     rentRoutes);
router.use('/reminders', reminderRoutes);

// ── API Info endpoint ────────────────────────────────────────────────────────
/**
 * @swagger
 * /api:
 *   get:
 *     summary: API info and available endpoints
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API overview
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name:    '🏢 Rent & Tenant Management API',
    version: '1.0.0',
    docs:    '/api-docs',
    endpoints: {
      auth:      '/api/auth',
      buildings: '/api/buildings',
      units:     '/api/buildings/:buildingId/units',
      tenants:   '/api/tenants',
      rents:     '/api/rents',
      reminders: '/api/reminders',
    },
  });
});

module.exports = router;
