import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { app } from './app.js';

let baseUrl = '';
let server: ReturnType<typeof app.listen> | null = null;

beforeEach(() => {
  server = app.listen(0);
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => (err ? reject(err) : resolve()));
  });
  server = null;
});

describe('API health', () => {
  it('returns health payload and request tracing header', async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { 'X-Request-Id': 'health-test-request' },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('health-test-request');

    const payload = await response.json() as { status: string; version: string };
    expect(payload.status).toBe('ok');
    expect(payload.version).toBe('1.0.0');
  });
});
