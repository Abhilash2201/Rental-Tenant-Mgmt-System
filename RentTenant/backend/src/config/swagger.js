/**
 * @file config/swagger.js
 * @description Swagger / OpenAPI 3.0 configuration for API documentation.
 * Docs are auto-generated from JSDoc @swagger annotations in route files.
 * Access the docs at: http://localhost:5000/api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger definition — the top-level metadata of the API spec.
 * Components section defines reusable schemas and security schemes.
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '🏢 Rent & Tenant Management API',
    version: '1.0.0',
    description: `
## Overview
REST API for managing rental properties, tenants, agreements, and payments.

## Features
- 🔐 JWT Authentication for property owners
- 🏗️ Building & unit management with photo uploads
- 👤 Tenant profiles with document storage
- 📜 Rent agreement tracking (2-year renewal cycle)
- 💰 Monthly rent ledger with payment status
- 🔔 Automated reminders: rent due, renewal, increment (11-month)

## Authentication
All protected routes require a **Bearer token** in the Authorization header:
\`Authorization: Bearer <your_jwt_token>\`

Get your token from the \`POST /api/auth/login\` endpoint.
    `,
    contact: {
      name: 'Rent Tenant Support',
      email: 'support@renttenant.com',
    },
    license: {
      name: 'ISC',
    },
  },

  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development Server',
    },
    {
      url: 'https://api.renttenant.com',
      description: 'Production Server',
    },
  ],

  // ── Reusable Components ──────────────────────────────────────────────────
  components: {
    /**
     * Security scheme: Bearer JWT token.
     * Applied globally to protected routes via `security: [{bearerAuth: []}]`
     */
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from POST /api/auth/login',
      },
    },

    /**
     * Reusable response schemas.
     * Referenced in route docs as `$ref: '#/components/schemas/ErrorResponse'`
     */
    schemas: {
      // ── Generic Responses ──────────────────────────────
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
          errors: {
            type: 'array',
            items: { type: 'object' },
            description: 'Validation errors (if applicable)',
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          total:       { type: 'integer', example: 50 },
          page:        { type: 'integer', example: 1 },
          limit:       { type: 'integer', example: 10 },
          total_pages: { type: 'integer', example: 5 },
        },
      },

      // ── Owner ──────────────────────────────────────────
      Owner: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          name:        { type: 'string', example: 'Ramesh Kumar' },
          email:       { type: 'string', format: 'email' },
          phone:       { type: 'string', example: '9876543210' },
          profile_pic: { type: 'string', example: 'https://res.cloudinary.com/...' },
          created_at:  { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'phone', 'password'],
        properties: {
          name:     { type: 'string', example: 'Ramesh Kumar' },
          email:    { type: 'string', format: 'email', example: 'ramesh@example.com' },
          phone:    { type: 'string', example: '9876543210' },
          password: { type: 'string', minLength: 6, example: 'secret123' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email:    { type: 'string', format: 'email', example: 'ramesh@example.com' },
          password: { type: 'string', example: 'secret123' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          token:   { type: 'string', example: 'eyJhbGciOiJIUzI1NiIs...' },
          owner:   { $ref: '#/components/schemas/Owner' },
        },
      },

      // ── Building ───────────────────────────────────────
      Building: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          owner_id:      { type: 'string', format: 'uuid' },
          name:          { type: 'string', example: 'Sunshine Apartments' },
          address_line1: { type: 'string', example: '12 MG Road' },
          address_line2: { type: 'string', example: 'Near City Mall' },
          city:          { type: 'string', example: 'Bangalore' },
          state:         { type: 'string', example: 'Karnataka' },
          pincode:       { type: 'string', example: '560001' },
          total_floors:  { type: 'integer', example: 5 },
          description:   { type: 'string' },
          photos:        { type: 'array', items: { type: 'string' } },
          total_units:   { type: 'integer', example: 20 },
          occupied_units:{ type: 'integer', example: 15 },
          created_at:    { type: 'string', format: 'date-time' },
        },
      },

      // ── Unit ───────────────────────────────────────────
      Unit: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          building_id:    { type: 'string', format: 'uuid' },
          unit_number:    { type: 'string', example: '101' },
          floor_number:   { type: 'integer', example: 1 },
          unit_type:      { type: 'string', example: '2BHK' },
          area_sqft:      { type: 'number', example: 850 },
          rent_amount:    { type: 'number', example: 15000 },
          deposit_amount: { type: 'number', example: 30000 },
          is_furnished:   { type: 'boolean', example: false },
          status:         { type: 'string', enum: ['vacant','occupied','maintenance'] },
          created_at:     { type: 'string', format: 'date-time' },
        },
      },

      // ── Tenant ─────────────────────────────────────────
      Tenant: {
        type: 'object',
        properties: {
          id:                     { type: 'string', format: 'uuid' },
          unit_id:                { type: 'string', format: 'uuid' },
          name:                   { type: 'string', example: 'Suresh Patel' },
          email:                  { type: 'string', format: 'email' },
          phone:                  { type: 'string', example: '9123456780' },
          alternate_phone:        { type: 'string' },
          id_proof_type:          { type: 'string', example: 'Aadhaar' },
          id_proof_number:        { type: 'string', example: '1234 5678 9012' },
          id_proof_url:           { type: 'string' },
          photo_url:              { type: 'string' },
          emergency_contact_name: { type: 'string' },
          emergency_contact_phone:{ type: 'string' },
          move_in_date:           { type: 'string', format: 'date' },
          move_out_date:          { type: 'string', format: 'date' },
          is_active:              { type: 'boolean' },
        },
      },

      // ── Agreement ──────────────────────────────────────
      Agreement: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          tenant_id:      { type: 'string', format: 'uuid' },
          unit_id:        { type: 'string', format: 'uuid' },
          start_date:     { type: 'string', format: 'date', example: '2024-01-01' },
          end_date:       { type: 'string', format: 'date', example: '2026-01-01' },
          rent_amount:    { type: 'number', example: 15000 },
          deposit_amount: { type: 'number', example: 30000 },
          document_url:   { type: 'string' },
          status:         { type: 'string', enum: ['active','expired','renewed','terminated'] },
        },
      },

      // ── Rent Record ────────────────────────────────────
      RentRecord: {
        type: 'object',
        properties: {
          id:              { type: 'string', format: 'uuid' },
          tenant_id:       { type: 'string', format: 'uuid' },
          unit_id:         { type: 'string', format: 'uuid' },
          month:           { type: 'integer', example: 6 },
          year:            { type: 'integer', example: 2024 },
          due_date:        { type: 'string', format: 'date' },
          paid_date:       { type: 'string', format: 'date' },
          amount_due:      { type: 'number', example: 15000 },
          amount_paid:     { type: 'number', example: 15000 },
          payment_mode:    { type: 'string', example: 'UPI' },
          transaction_ref: { type: 'string' },
          status:          { type: 'string', enum: ['pending','paid','overdue','waived'] },
        },
      },

      // ── Reminder ───────────────────────────────────────
      Reminder: {
        type: 'object',
        properties: {
          id:           { type: 'string', format: 'uuid' },
          owner_id:     { type: 'string', format: 'uuid' },
          tenant_id:    { type: 'string', format: 'uuid' },
          unit_id:      { type: 'string', format: 'uuid' },
          type:         { type: 'string', enum: ['rent_due','agreement_renewal','rent_increment'] },
          title:        { type: 'string' },
          message:      { type: 'string' },
          trigger_date: { type: 'string', format: 'date' },
          status:       { type: 'string', enum: ['pending','sent','dismissed'] },
          is_read:      { type: 'boolean' },
          created_at:   { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

/**
 * swagger-jsdoc options.
 * `apis` points to all route files where @swagger annotations are written.
 */
const options = {
  swaggerDefinition,
  apis: ['./src/routes/*.js'], // All route files are scanned for @swagger comments
};

/**
 * Generated OpenAPI spec object.
 * Passed to swagger-ui-express in server.js to serve the Swagger UI.
 */
const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
