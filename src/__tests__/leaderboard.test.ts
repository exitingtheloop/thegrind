// ─── Leaderboard Service Tests ─────────────────────────────────
// Tests exercise the offline fallback path (fetch rejects → localStorage).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { submitScore, fetchTopScores } from '../services/leaderboard';

// Mock localStorage for Node test environment
const storage: Record<string, string> = {};
const mockLS = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = val; },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { for (const k of Object.keys(storage)) delete storage[k]; },
  get length() { return Object.keys(storage).length; },
  key: (_i: number) => null,
};
(globalThis as Record<string, unknown>).localStorage = mockLS;

// Mock fetch to always reject — forces offline fallback path
const mockFetch = vi.fn().mockRejectedValue(new Error('offline'));
(globalThis as Record<string, unknown>).fetch = mockFetch;

beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  mockFetch.mockClear();
});

describe('submitScore (offline fallback)', () => {
  it('adds a score to offline storage', async () => {
    await submitScore('Alice', 100);
    const top = await fetchTopScores(5);
    expect(top).toHaveLength(1);
    expect(top[0].name).toBe('Alice');
    expect(top[0].score).toBe(100);
  });

  it('keeps best score per name', async () => {
    await submitScore('Bob', 50);
    await submitScore('Bob', 200);
    await submitScore('Bob', 100); // worse than 200

    const top = await fetchTopScores(5);
    expect(top).toHaveLength(1);
    expect(top[0].score).toBe(200);
  });

  it('stores multiple players', async () => {
    await submitScore('A', 10);
    await submitScore('B', 30);
    await submitScore('C', 20);

    const top = await fetchTopScores(5);
    expect(top).toHaveLength(3);
    expect(top[0].name).toBe('B');
    expect(top[1].name).toBe('C');
    expect(top[2].name).toBe('A');
  });

  it('sends deviceId in fetch body', async () => {
    // Even though fetch rejects, verify it was called with correct shape
    await submitScore('Test', 42);
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain('/scores');

    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Test');
    expect(body.score).toBe(42);
    expect(body.deviceId).toBeDefined();
    expect(typeof body.deviceId).toBe('string');
    expect(body.deviceId.length).toBeGreaterThan(0);
  });
});

describe('fetchTopScores (offline fallback)', () => {
  it('returns empty array when no scores', async () => {
    const top = await fetchTopScores(5);
    expect(top).toEqual([]);
  });

  it('limits to requested count', async () => {
    await submitScore('A', 10);
    await submitScore('B', 20);
    await submitScore('C', 30);
    await submitScore('D', 40);
    await submitScore('E', 50);
    await submitScore('F', 60);

    const top = await fetchTopScores(3);
    expect(top).toHaveLength(3);
    expect(top[0].score).toBe(60);
    expect(top[2].score).toBe(40);
  });

  it('returns scores in descending order', async () => {
    await submitScore('X', 5);
    await submitScore('Y', 500);
    await submitScore('Z', 50);

    const top = await fetchTopScores(5);
    expect(top[0].score).toBe(500);
    expect(top[1].score).toBe(50);
    expect(top[2].score).toBe(5);
  });
});

describe('device ID persistence', () => {
  it('generates and persists a device ID in localStorage', async () => {
    await submitScore('Test', 1);

    const deviceId = storage['thegrind_device_id'];
    expect(deviceId).toBeDefined();
    expect(deviceId.length).toBeGreaterThan(0);

    // Second call should reuse the same device ID
    await submitScore('Test', 2);

    const body1 = JSON.parse(mockFetch.mock.calls[0][1].body);
    const body2 = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(body1.deviceId).toBe(body2.deviceId);
  });
});
