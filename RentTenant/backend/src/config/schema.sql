-- ============================================================
-- Rent & Tenant Management System — Database Schema
-- Run this once in Neon SQL Editor to create all tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Owners (property owners who log in) ─────────────────────
CREATE TABLE IF NOT EXISTS owners (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid  VARCHAR(128) UNIQUE,          -- Firebase Auth UID
  email         VARCHAR(255) UNIQUE NOT NULL,
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  profile_pic   TEXT,                         -- Cloudinary URL
  password      VARCHAR(255),                 -- nullable (Firebase handles auth)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Buildings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buildings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city          VARCHAR(100) NOT NULL,
  state         VARCHAR(100) NOT NULL,
  pincode       VARCHAR(10)  NOT NULL,
  total_floors  INTEGER DEFAULT 1,
  description   TEXT,
  photos        TEXT[] DEFAULT '{}',          -- Array of Cloudinary URLs
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Units ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  building_id    UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number    VARCHAR(20) NOT NULL,
  floor_number   INTEGER NOT NULL DEFAULT 0,
  unit_type      VARCHAR(20) CHECK (unit_type IN ('Studio','1BHK','2BHK','3BHK','4BHK','Villa','Shop','Office')),
  area_sqft      NUMERIC(8,2),
  rent_amount    NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  is_furnished   BOOLEAN DEFAULT FALSE,
  status         VARCHAR(20) DEFAULT 'vacant' CHECK (status IN ('vacant','occupied','maintenance')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(building_id, unit_number)
);

-- ── Tenants ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id                 UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  name                    VARCHAR(255) NOT NULL,
  email                   VARCHAR(255),
  phone                   VARCHAR(20)  NOT NULL,
  alternate_phone         VARCHAR(20),
  id_proof_type           VARCHAR(50),
  id_proof_number         VARCHAR(100),
  id_proof_url            TEXT,               -- Cloudinary URL
  photo_url               TEXT,               -- Cloudinary URL
  emergency_contact_name  VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  move_in_date            DATE NOT NULL,
  move_out_date           DATE,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Agreements ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agreements (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id        UUID NOT NULL REFERENCES units(id)   ON DELETE RESTRICT,
  start_date     DATE NOT NULL,
  end_date       DATE NOT NULL,
  rent_amount    NUMERIC(10,2) NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  status         VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','terminated','renewed')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Rent Records ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rent_records (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  unit_id       UUID NOT NULL REFERENCES units(id)   ON DELETE RESTRICT,
  month         INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year          INTEGER NOT NULL,
  due_date      DATE NOT NULL,
  amount_due    NUMERIC(10,2) NOT NULL,
  amount_paid   NUMERIC(10,2) DEFAULT 0,
  paid_date     DATE,
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','partial')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, month, year)
);

-- ── Reminders ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reminders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id     UUID NOT NULL REFERENCES owners(id)   ON DELETE CASCADE,
  tenant_id    UUID          REFERENCES tenants(id)  ON DELETE CASCADE,
  unit_id      UUID          REFERENCES units(id)    ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL CHECK (type IN ('rent_due','rent_increment','agreement_renewal','custom')),
  title        VARCHAR(255) NOT NULL,
  message      TEXT,
  trigger_date DATE NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','dismissed','sent')),
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes (speeds up common queries) ──────────────────────
CREATE INDEX IF NOT EXISTS idx_buildings_owner     ON buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_units_building      ON units(building_id);
CREATE INDEX IF NOT EXISTS idx_tenants_unit        ON tenants(unit_id);
CREATE INDEX IF NOT EXISTS idx_tenants_active      ON tenants(is_active);
CREATE INDEX IF NOT EXISTS idx_rent_records_tenant ON rent_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_records_status ON rent_records(status);
CREATE INDEX IF NOT EXISTS idx_reminders_owner     ON reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_reminders_trigger   ON reminders(trigger_date);
CREATE INDEX IF NOT EXISTS idx_owners_firebase_uid ON owners(firebase_uid);
