/**
 * Database client - supports SQLite (local) and Azure SQL (production).
 * Uses DATABASE_URL for Azure SQL, DATABASE_PATH for SQLite.
 */

export interface DbClient {
  get<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  close(): Promise<void>;
}

function convertSqlForMssql(sql: string): string {
  let out = sql;
  let i = 0;
  out = out.replace(/\?/g, () => `@p${++i}`);
  // LIMIT n → OFFSET 0 ROWS FETCH NEXT n ROWS ONLY (must be after ORDER BY)
  out = out.replace(/LIMIT\s+(\d+)/gi, (_, n) => `OFFSET 0 ROWS FETCH NEXT ${n} ROWS ONLY`);
  return out;
}

function parseConnectionString(url: string): Record<string, string | boolean> {
  const parts = url.split(';').filter(Boolean);
  const out: Record<string, string | boolean> = {};
  for (const p of parts) {
    const [k, v] = p.split('=').map((s) => s.trim());
    if (!k || v === undefined) continue;
    const key = k.toLowerCase();
    if (v === 'true') out[key] = true;
    else if (v === 'false') out[key] = false;
    else out[key] = v;
  }
  return out;
}

async function createMssqlClient(): Promise<DbClient> {
  const sql = await import('mssql');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required for Azure SQL');
  const parsed = parseConnectionString(url);
  const serverPart = (parsed['server'] as string) ?? '';
  const [host, portStr] = serverPart.replace(/^tcp:/i, '').split(',');
  const config = {
    server: host?.trim() ?? 'localhost',
    port: parseInt(portStr?.trim() ?? '1433', 10),
    database: (parsed['database'] as string) ?? '',
    user: (parsed['user id'] ?? parsed['uid']) as string,
    password: (parsed['password'] ?? parsed['pwd']) as string,
    options: {
      encrypt: parsed['encrypt'] !== false,
      trustServerCertificate: parsed['trustservercertificate'] === true,
    },
  };
  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  return {
    async get<T>(querySql: string, params: unknown[] = []): Promise<T | undefined> {
      const mssqlSql = convertSqlForMssql(querySql);
      const req = pool.request();
      params.forEach((p, i) => {
        if (p === null || p === undefined) req.input(`p${i + 1}`, sql.NVarChar, null);
        else req.input(`p${i + 1}`, p);
      });
      const result = await req.query(mssqlSql);
      const rows = result.recordset as T[];
      return rows[0];
    },
    async all<T>(querySql: string, params: unknown[] = []): Promise<T[]> {
      const mssqlSql = convertSqlForMssql(querySql);
      const req = pool.request();
      params.forEach((p, i) => {
        if (p === null || p === undefined) req.input(`p${i + 1}`, sql.NVarChar, null);
        else req.input(`p${i + 1}`, p);
      });
      const result = await req.query(mssqlSql);
      return (result.recordset ?? []) as T[];
    },
    async run(execSql: string, params: unknown[] = []): Promise<{ changes: number }> {
      const mssqlSql = convertSqlForMssql(execSql);
      const req = pool.request();
      params.forEach((p, i) => {
        if (p === null || p === undefined) req.input(`p${i + 1}`, sql.NVarChar, null);
        else req.input(`p${i + 1}`, p);
      });
      const result = await req.query(mssqlSql);
      return { changes: result.rowsAffected?.[0] ?? 0 };
    },
    async close() { await pool.close(); },
  };
}

async function createSqliteClient(): Promise<DbClient> {
  const Database = (await import('better-sqlite3')).default;
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const fs = await import('fs');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dbDir = process.env.DATABASE_PATH
    ? path.dirname(process.env.DATABASE_PATH)
    : path.join(__dirname, '../../../data');
  const dbPath = process.env.DATABASE_PATH ?? path.join(dbDir, 'skafoldai.db');
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const db = new Database(dbPath);

  return {
    async get<T>(querySql: string, params: unknown[] = []): Promise<T | undefined> {
      const stmt = db.prepare(querySql);
      return stmt.get(...params) as T | undefined;
    },
    async all<T>(querySql: string, params: unknown[] = []): Promise<T[]> {
      const stmt = db.prepare(querySql);
      return stmt.all(...params) as T[];
    },
    async run(execSql: string, params: unknown[] = []): Promise<{ changes: number }> {
      const stmt = db.prepare(execSql);
      const result = stmt.run(...params) as { changes: number };
      return { changes: result.changes };
    },
    async close() { db.close(); },
  };
}

let _db: DbClient | null = null;

export async function getDb(): Promise<DbClient> {
  if (_db) return _db;
  _db = process.env.DATABASE_URL
    ? await createMssqlClient()
    : await createSqliteClient();
  return _db;
}

export function isAzureSql(): boolean {
  return !!process.env.DATABASE_URL;
}
