/**
 * @file db.js
 * @description PostgreSQL database connection pool configuration.
 * Uses the `pg` library's Pool for efficient connection management.
 * All database queries across the app use this single shared pool.
 */

const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL connection pool.
 * Pool automatically manages multiple connections and reuses them,
 * which is more efficient than creating a new connection per query.
 */
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'rent_tenant_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Max connections in pool (default: 10)
  max: 10,
  // Time (ms) a client is allowed to sit idle before being removed
  idleTimeoutMillis: 30000,
  // Time (ms) to wait for a connection before throwing an error
  connectionTimeoutMillis: 2000,
});

/**
 * Test database connectivity on startup.
 * Logs success or error to help with initial setup debugging.
 */
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.stack);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release(); // Release the client back to the pool
  }
});

/**
 * Helper function to run parameterized queries safely.
 * Protects against SQL injection via parameterized inputs.
 *
 * @param {string} text - SQL query string with $1, $2 placeholders
 * @param {Array}  params - Values to bind to placeholders
 * @returns {Promise<QueryResult>} PostgreSQL query result
 */
const query = (text, params) => pool.query(text, params);

/**
 * Helper to get a dedicated client from the pool.
 * Use for transactions (BEGIN / COMMIT / ROLLBACK).
 *
 * @returns {Promise<PoolClient>} A dedicated pool client
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
