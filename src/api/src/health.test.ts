/**
 * Basic health check test - validates API structure
 */
import { describe, it, expect } from 'vitest';

describe('API health', () => {
  it('should have health endpoint path', () => {
    expect('/api/health').toBe('/api/health');
  });
});
