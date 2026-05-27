/**
 * @file models/index.js
 * @description Database schema initializer.
 * Run once with `npm run db:init` to create all tables in PostgreSQL.
 *
 * Table Hierarchy:
 *   owners → buildings → units → tenants → agreements + rent_records + reminders
 */

const { pool } = require('../config/db');
require('dotenv').config({ path: '../../.env' });

/**
 * SQL to create the `owners` table.
 * Each owner has login credentials and profile info.
 */
const createOwnersTable = `
  CREATE TABLE IF NOT EXISTS owners (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  UNIQUE NOT NULL,
    phone       VARCHAR(15)   NOT NULL,
    password    TEXT          NOT NULL,         -- bcrypt hashed
    profile_pic TEXT,                           -- Cloudinary URL
    created_at  TIMESTAMP     DEFAULT NOW(),
    updated_at  TIMESTAMP     DEFAULT NOW()
  );
`;

/**
 * SQL to create the `buildings` table.
 * Each building belongs to one owner and has an address + photos.
 */
const createBuildingsTable = `
  CREATE TABLE IF NOT EXISTS buildings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id       UUID         NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name           VARCHAR(150) NOT NULL,
    address_line1  VARCHAR(255) NOT NULL,
    address_line2  VARCHAR(255),
    city           VARCHAR(100) NOT NULL,
    state          VARCHAR(100) NOT NULL,
    pincode        VARCHAR(10)  NOT NULL,
    total_floors   INTEGER      DEFAULT 1,
    description    TEXT,
    photos         TEXT[],                      -- Array of Cloudinary URLs
    created_at     TIMESTAMP    DEFAULT NOW(),
    updated_at     TIMESTAMP    DEFAULT NOW()
  );
`;

/**
 * SQL to create the `units` table.
 * Each unit/home is on a specific floor of a building.
 * Status: vacant | occupied | maintenance
 */
const createUnitsTable = `
  CREATE TABLE IF NOT EXISTS units (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id     UUID         NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    unit_number     VARCHAR(20)  NOT NULL,       -- e.g. "101", "A-2"
    floor_number    INTEGER      NOT NULL,
    unit_type       VARCHAR(20)  DEFAULT '1BHK', -- 1BHK, 2BHK, 3BHK, Studio, etc.
    area_sqft       DECIMAL(8,2),
    rent_amount     DECIMAL(10,2) NOT NULL,       -- Current monthly rent
    deposit_amount  DECIMAL(10,2) DEFAULT 0,
    is_furnished    BOOLEAN      DEFAULT FALSE,
    status          VARCHAR(20)  DEFAULT 'vacant' CHECK (status IN ('vacant','occupied','maintenance')),
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW(),
    UNIQUE(building_id, unit_number)              -- No duplicate unit numbers per building
  );
`;

/**
 * SQL to create the `tenants` table.
 * One active tenant per unit. Previous tenants kept for history.
 */
const createTenantsTable = `
  CREATE TABLE IF NOT EXISTS tenants (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id           UUID         NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    email             VARCHAR(150),
    phone             VARCHAR(15)  NOT NULL,
    alternate_phone   VARCHAR(15),
    id_proof_type     VARCHAR(30),               -- Aadhaar, PAN, Passport, etc.
    id_proof_number   VARCHAR(50),
    id_proof_url      TEXT,                      -- Cloudinary URL
    photo_url         TEXT,                      -- Tenant photo (Cloudinary URL)
    emergency_contact_name  VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    move_in_date      DATE         NOT NULL,
    move_out_date     DATE,                      -- NULL = currently active
    is_active         BOOLEAN      DEFAULT TRUE,
    created_at        TIMESTAMP    DEFAULT NOW(),
    updated_at        TIMESTAMP    DEFAULT NOW()
  );
`;

/**
 * SQL to create the `agreements` table.
 * Tracks rent agreements with automatic 2-year renewal cycle.
 * Status: active | expired | renewed | terminated
 */
const createAgreementsTable = `
  CREATE TABLE IF NOT EXISTS agreements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id         UUID         NOT NULL REFERENCES units(id),
    start_date      DATE         NOT NULL,
    end_date        DATE         NOT NULL,       -- Typically start_date + 2 years
    rent_amount     DECIMAL(10,2) NOT NULL,      -- Agreed rent at signing
    deposit_amount  DECIMAL(10,2) DEFAULT 0,
    document_url    TEXT,                        -- Signed agreement PDF (Cloudinary)
    status          VARCHAR(20)  DEFAULT 'active' CHECK (status IN ('active','expired','renewed','terminated')),
    notes           TEXT,
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
  );
`;

/**
 * SQL to create the `rent_records` table.
 * Monthly payment ledger per tenant.
 * Status: pending | paid | overdue | waived
 */
const createRentRecordsTable = `
  CREATE TABLE IF NOT EXISTS rent_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    unit_id         UUID          NOT NULL REFERENCES units(id),
    month           INTEGER       NOT NULL CHECK (month BETWEEN 1 AND 12),
    year            INTEGER       NOT NULL,
    due_date        DATE          NOT NULL,
    paid_date       DATE,                        -- NULL until payment received
    amount_due      DECIMAL(10,2) NOT NULL,
    amount_paid     DECIMAL(10,2) DEFAULT 0,
    payment_mode    VARCHAR(30),                 -- Cash, UPI, Bank Transfer, Cheque
    transaction_ref VARCHAR(100),               -- UPI txn ID or cheque number
    status          VARCHAR(20)   DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived')),
    notes           TEXT,
    created_at      TIMESTAMP     DEFAULT NOW(),
    updated_at      TIMESTAMP     DEFAULT NOW(),
    UNIQUE(tenant_id, month, year)               -- One record per tenant per month
  );
`;

/**
 * SQL to create the `reminders` table.
 * Stores scheduled reminders for the owner.
 * Types:
 *   - rent_due       → Monthly rent collection reminder
 *   - agreement_renewal → 2-year agreement expiry alert
 *   - rent_increment    → 11-month rent revision alert
 * Status: pending | sent | dismissed
 */
const createRemindersTable = `
  CREATE TABLE IF NOT EXISTS reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID         NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id       UUID         REFERENCES tenants(id) ON DELETE SET NULL,
    unit_id         UUID         REFERENCES units(id)  ON DELETE SET NULL,
    type            VARCHAR(30)  NOT NULL CHECK (type IN ('rent_due','agreement_renewal','rent_increment')),
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    trigger_date    DATE         NOT NULL,       -- Date the reminder fires
    status          VARCHAR(20)  DEFAULT 'pending' CHECK (status IN ('pending','sent','dismissed')),
    is_read         BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMP    DEFAULT NOW(),
    updated_at      TIMESTAMP    DEFAULT NOW()
  );
`;

/**
 * SQL to create the `notifications` table.
 * In-app notification log for the owner dashboard.
 */
const createNotificationsTable = `
  CREATE TABLE IF NOT EXISTS notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id    UUID         NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    reminder_id UUID         REFERENCES reminders(id) ON DELETE SET NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT         NOT NULL,
    type        VARCHAR(30)  NOT NULL,            -- Same types as reminders
    is_read     BOOLEAN      DEFAULT FALSE,
    created_at  TIMESTAMP    DEFAULT NOW()
  );
`;

/**
 * Trigger function to auto-update `updated_at` columns on row changes.
 * Applied to all tables that have an `updated_at` field.
 */
const createUpdatedAtTrigger = `
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ language 'plpgsql';
`;

/**
 * Apply the updated_at trigger to all relevant tables.
 * Uses IF NOT EXISTS so re-running db:init is safe (idempotent).
 */
const applyTriggers = `
  DO $$
  DECLARE
    tables TEXT[] := ARRAY['owners','buildings','units','tenants','agreements','rent_records','reminders'];
    t TEXT;
  BEGIN
    FOREACH t IN ARRAY tables LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'set_updated_at_' || t
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER set_updated_at_%I
           BEFORE UPDATE ON %I
           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
          t, t
        );
      END IF;
    END LOOP;
  END;
  $$;
`;

/**
 * Useful index for quick lookups by owner, building, unit, and tenant.
 * Indexes speed up the most common query patterns.
 */
const createIndexes = `
  CREATE INDEX IF NOT EXISTS idx_buildings_owner      ON buildings(owner_id);
  CREATE INDEX IF NOT EXISTS idx_units_building       ON units(building_id);
  CREATE INDEX IF NOT EXISTS idx_units_status         ON units(status);
  CREATE INDEX IF NOT EXISTS idx_tenants_unit         ON tenants(unit_id);
  CREATE INDEX IF NOT EXISTS idx_tenants_active       ON tenants(is_active);
  CREATE INDEX IF NOT EXISTS idx_rent_records_tenant  ON rent_records(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rent_records_status  ON rent_records(status);
  CREATE INDEX IF NOT EXISTS idx_reminders_owner      ON reminders(owner_id);
  CREATE INDEX IF NOT EXISTS idx_reminders_trigger    ON reminders(trigger_date, status);
  CREATE INDEX IF NOT EXISTS idx_notifications_owner  ON notifications(owner_id, is_read);
`;

/**
 * Main function: runs all CREATE TABLE statements in order.
 * Order matters due to foreign key dependencies.
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing database schema...');

    // Enable UUID extension (required for gen_random_uuid())
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Create tables in dependency order
    await client.query(createOwnersTable);
    console.log('  ✅ Table: owners');

    await client.query(createBuildingsTable);
    console.log('  ✅ Table: buildings');

    await client.query(createUnitsTable);
    console.log('  ✅ Table: units');

    await client.query(createTenantsTable);
    console.log('  ✅ Table: tenants');

    await client.query(createAgreementsTable);
    console.log('  ✅ Table: agreements');

    await client.query(createRentRecordsTable);
    console.log('  ✅ Table: rent_records');

    await client.query(createRemindersTable);
    console.log('  ✅ Table: reminders');

    await client.query(createNotificationsTable);
    console.log('  ✅ Table: notifications');

    // Create trigger function + apply to all tables
    await client.query(createUpdatedAtTrigger);
    await client.query(applyTriggers);
    console.log('  ✅ Triggers: updated_at auto-update');

    // Create query optimization indexes
    await client.query(createIndexes);
    console.log('  ✅ Indexes created');

    console.log('\n🎉 Database initialized successfully!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run when this file is executed directly: `node src/models/index.js`
initializeDatabase();
