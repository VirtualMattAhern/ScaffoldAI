import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { app } from './app.js';
import { ensureSchema, resetSchemaState } from './db/schema.js';
import { resetDbClient } from './db/client.js';

let tempDir = '';
let baseUrl = '';
let token = '';
let server: ReturnType<typeof app.listen> | null = null;

async function requestJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${pathname}`, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function shiftDays(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), 'skafoldai-api-test-'));
  delete process.env.DATABASE_URL;
  process.env.DATABASE_PATH = path.join(tempDir, 'test.db');
  process.env.AUTH_SESSION_SECRET = 'test-secret';
  await resetDbClient();
  resetSchemaState();
  await ensureSchema();

  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const login = await requestJson<{ token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', displayName: 'Test User' }),
  });
  token = login.token;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
  await resetDbClient();
  resetSchemaState();
  delete process.env.DATABASE_PATH;
  await rm(tempDir, { recursive: true, force: true });
});

describe('task planning integration', () => {
  it('filters future planned tasks out of top 3 suggestions', async () => {
    const today = shiftDays(0);
    const tomorrow = shiftDays(1);

    await requestJson('/api/tasks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: 'Do today', plannedFor: today }),
    });
    await requestJson('/api/tasks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: 'Do tomorrow', plannedFor: tomorrow }),
    });

    const top3 = await requestJson<Array<{ title: string }>>('/api/tasks/top3', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(top3.map((task) => task.title)).toContain('Do today');
    expect(top3.map((task) => task.title)).not.toContain('Do tomorrow');
  });

  it('stores goal links and planned dates on tasks', async () => {
    const goal = await requestJson<{ id: string }>('/api/goals', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: 'Ship calmer planning UX', colorHex: '#0ea5e9' }),
    });

    await requestJson('/api/tasks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'Add weekly calendar',
        goalId: goal.id,
        plannedFor: shiftDays(2),
      }),
    });

    const tasks = await requestJson<Array<{ title: string; goalId: string | null; plannedFor: string | null }>>('/api/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Add weekly calendar',
          goalId: goal.id,
          plannedFor: shiftDays(2),
        }),
      ]),
    );
  });

  it('creates the next recurring task when one is completed', async () => {
    const created = await requestJson<{ id: string }>('/api/tasks', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        title: 'Weekly review',
        type: 'repeat',
        recurrenceRule: 'weekly',
        plannedFor: shiftDays(0),
      }),
    });

    await requestJson(`/api/tasks/${created.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status: 'done' }),
    });

    const tasks = await requestJson<Array<{ id: string; title: string; status: string; recurrenceRule: string | null; plannedFor: string | null }>>('/api/tasks', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          status: 'done',
        }),
        expect.objectContaining({
          title: 'Weekly review',
          status: 'open',
          recurrenceRule: 'weekly',
          plannedFor: shiftDays(7),
        }),
      ]),
    );
  });
});
