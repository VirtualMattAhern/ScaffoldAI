import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mssql from 'mssql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const connStr = process.env.DATABASE_URL;
if (!connStr) {
  console.error('Set DATABASE_URL');
  process.exit(1);
}

const schemaPath = path.join(__dirname, '../src/db/azure-schema.sql');
const sql = fs.readFileSync(schemaPath, 'utf-8');

const pool = await mssql.connect(connStr);
try {
  await pool.request().query(sql);
  console.log('Schema applied.');
} finally {
  await pool.close();
}
