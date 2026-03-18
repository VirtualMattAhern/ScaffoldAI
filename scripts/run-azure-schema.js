#!/usr/bin/env node
/**
 * Run Azure SQL schema against a database.
 * Usage: node scripts/run-azure-schema.js "Server=tcp:host,1433;Database=db;User ID=user;Password=pwd;Encrypt=true;"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mssql from 'mssql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connStr = process.argv[2] || process.env.DATABASE_URL;
if (!connStr) {
  console.error('Usage: node run-azure-schema.js <connection-string>');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '../src/api/src/db/azure-schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf-8');

async function run() {
  const pool = await mssql.connect(connStr);
  try {
    await pool.request().query(sql);
    console.log('Schema applied successfully.');
  } finally {
    await pool.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
