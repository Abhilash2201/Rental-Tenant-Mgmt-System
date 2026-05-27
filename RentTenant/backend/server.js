/**
 * @file server.js
 * @description Main entry point for the Rent & Tenant Management API.
 * Sets up Express, middleware, routes, Swagger docs, and the cron scheduler.
 */

require('dotenv').config(); // Load environment variables first

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const swaggerUi  = require('swagger-ui-express');

const swaggerSpec      = require('./src/config/swagger');
const { errorHandler } = require('./src/middleware/errorHandler');
const routes           = require('./src/routes/index');
const { startReminderCron } = require('./src/services/reminderCron');

// ── App Initialization ──────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ─────────────────────────────────────────────────────
/**
 * helmet: Sets secure HTTP headers (XSS protection, no sniff, etc.)
 * Configured to allow Swagger UI to load its own CSS/JS assets.
 */
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled so Swagger UI assets load correctly
  })
);

// ── CORS ────────────────────────────────────────────────────────────────────
/**
 * Allow requests from the React web frontend and React Native dev server.
 * In production, restrict `origin` to your actual domain.
 */
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173', // Vite web app
      'http://localhost:3000',                            // Alt web port
      'http://localhost:19006',                           // Expo mobile dev
    ],
    credentials: true, // Allow cookies / Authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Request Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));           // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse form data

// ── HTTP Request Logging ─────────────────────────────────────────────────────
/**
 * morgan: Logs each HTTP request in development mode.
 * Format: METHOD /path STATUS TIME
 */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Swagger API Documentation ────────────────────────────────────────────────
/**
 * Serves interactive API docs at GET /api-docs
 * UI powered by swagger-ui-express with the spec from swagger.js
 */
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '🏢 Rent Tenant API Docs',
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar-wrapper .link span { color: #e94560; }
    `,
    swaggerOptions: {
      persistAuthorization: true, // Keeps the JWT token between page refreshes
      displayRequestDuration: true,
      docExpansion: 'list',       // Collapse all sections by default
      filter: true,               // Enable endpoint search box
    },
  })
);

/**
 * Serve raw Swagger JSON spec (useful for Postman import or code generation).
 * GET /api-docs.json
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ── Health Check ──────────────────────────────────────────────────────────────
/**
 * Simple health check endpoint.
 * Used by load balancers / uptime monitors to confirm API is alive.
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🏢 Rent Tenant API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
/**
 * All API routes mounted under /api prefix.
 * Individual route files handle sub-paths (e.g. /api/auth, /api/buildings)
 */
app.use('/api', routes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
/**
 * Catches any request that didn't match a defined route.
 * Returns a JSON 404 instead of an HTML error page.
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: 'Visit /api-docs for available endpoints',
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
/**
 * Must be registered AFTER all routes.
 * Catches errors thrown by controllers and returns structured JSON.
 */
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Docs:   http://localhost:${PORT}/api-docs`);
  console.log(`❤️  Health:     http://localhost:${PORT}/health`);
  console.log(`🌐 Env:        ${process.env.NODE_ENV || 'development'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Start the daily reminder cron job
  startReminderCron();
});

module.exports = app; // Export for testing
