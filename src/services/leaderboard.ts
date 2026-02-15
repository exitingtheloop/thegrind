// ─── Leaderboard Service ───────────────────────────────────────
// Calls Azure Functions API. Falls back to localStorage when offline.

const API_BASE = import.meta.env.VITE_API_URL as string || '/api';
const WEDDING_CODE = (import.meta.env.VITE_WEDDING_CODE as string) || '';

// ─── Persistent device ID ──────────────────────────────────────
// Stored in localStorage so the backend can tie submissions to a device.
// Survives page reloads; only lost if user clears site data.

const DEVICE_ID_KEY = 'thegrind_device_id';

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id =
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ─── Types ─────────────────────────────────────────────────────

export interface LeaderboardEntry {
  name: string;
  score: number;
  createdAt?: string;
}

// ─── Offline fallback helpers ──────────────────────────────────

const OFFLINE_KEY = 'thegrind_offline_scores';

function saveOffline(name: string, score: number): void {
  try {
    const existing: { name: string; score: number; ts: number }[] = JSON.parse(
      localStorage.getItem(OFFLINE_KEY) || '[]',
    );
    existing.push({ name, score, ts: Date.now() });
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(existing));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function loadOffline(limit: number): LeaderboardEntry[] {
  try {
    const raw: { name: string; score: number }[] = JSON.parse(
      localStorage.getItem(OFFLINE_KEY) || '[]',
    );
    // Best score per name — preserve original casing
    const byName = new Map<string, { name: string; score: number }>();
    for (const r of raw) {
      const key = r.name.toLowerCase();
      const best = byName.get(key);
      if (!best || r.score > best.score) {
        byName.set(key, { name: r.name, score: r.score });
      }
    }
    return [...byName.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// ─── API calls ─────────────────────────────────────────────────

/**
 * Submit a score to the Azure Functions backend.
 * Falls back to localStorage if the network call fails.
 */
export async function submitScore(name: string, score: number): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        score,
        weddingCode: WEDDING_CODE,
        deviceId: getDeviceId(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Submit failed:', res.status, err);
    }
  } catch (e) {
    saveOffline(name, score);
    console.warn('Offline — score saved locally', e);
  }
}

/**
 * Fetch the top N scores from the Azure Functions backend.
 * Falls back to localStorage offline scores on failure.
 */
export async function fetchTopScores(limit = 5): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/scores?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return loadOffline(limit);
  }
}
