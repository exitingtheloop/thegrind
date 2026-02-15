// ─── Game Store (Zustand) ──────────────────────────────────────
// Single source of truth for all game state + actions.
// Logic belongs here; UI calls actions only.

import { create } from 'zustand';
import {
  GENERATORS,
  POWERUPS,
  EVENTS,
  COST_SCALE,
  BASE_CPT,
  MAX_OWNED,
  RUN_DURATION_MS,
  EVENT_MIN_INTERVAL_MS,
  EVENT_MAX_INTERVAL_MS,
  type GeneratorDef,
  type EventDef,
} from './config';
import { submitScore, fetchTopScores, type LeaderboardEntry } from '../services/leaderboard';

// ─── Persistence ───────────────────────────────────────────────

const SAVE_KEY = 'thegrind_run_state';
const SAVE_INTERVAL_MS = 2000; // save every 2s
let lastSaveAt = 0;

interface SavedState {
  momentum: number;
  athScore: number;
  generators: Record<string, number>;
  buffs: ActiveBuff[];
  events: ActiveEvent[];
  nextEventAt: number;
  runStatus: RunStatus;
  runEndsAt: number;
  lastTick: number;
  playerName: string;
  submitted: boolean;
}

function saveRunState(s: GameState): void {
  const now = Date.now();
  if (now - lastSaveAt < SAVE_INTERVAL_MS) return;
  lastSaveAt = now;

  if (s.runStatus !== 'running') {
    // Clear save when not running
    try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
    return;
  }

  const saved: SavedState = {
    momentum: s.momentum,
    athScore: s.athScore,
    generators: s.generators,
    buffs: s.buffs,
    events: s.events,
    nextEventAt: s.nextEventAt,
    runStatus: s.runStatus,
    runEndsAt: s.runEndsAt,
    lastTick: s.lastTick,
    playerName: s.playerName,
    submitted: s.submitted,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  } catch { /* noop */ }
}

function loadRunState(): Partial<SavedState> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedState;
    // Check if the run is still valid (not expired)
    if (saved.runStatus === 'running' && Date.now() < saved.runEndsAt) {
      return saved;
    }
    // Expired or finished — clean up
    localStorage.removeItem(SAVE_KEY);
    return null;
  } catch {
    return null;
  }
}

// ─── Types ─────────────────────────────────────────────────────

export type RunStatus = 'idle' | 'running' | 'finished';

export interface ActiveBuff {
  powerupId: string;
  endsAt: number; // timestamp ms
  tapMultiplier: number;
  autoTapsPerSec: number;
}

export interface ActiveEvent {
  eventId: string;
  name: string;
  description: string;
  icon: string;
  positive: boolean;
  endsAt: number;
  cpsMultiplier: number;
  allGainsMultiplier: number;
}

export interface GameState {
  // ─ Currency
  momentum: number;

  // ─ All-Time High score (peak momentum during this run)
  athScore: number;

  // ─ Generators (id → owned count, max MAX_OWNED)
  generators: Record<string, number>;

  // ─ Active buffs & events
  buffs: ActiveBuff[];
  events: ActiveEvent[];

  // ─ Event scheduler
  nextEventAt: number; // timestamp ms

  // ─ Run state
  runStatus: RunStatus;
  runEndsAt: number;
  lastTick: number;
  playerName: string;
  submitted: boolean;

  // ─ Leaderboard cache
  leaderboard: LeaderboardEntry[];

  // ─ Derived (recomputed each tick)
  autoTapsPerSec: number;
  tapMultiplier: number;
  momentumPerSec: number;

  // ─ Tutorial
  tutorialSeen: boolean;

  // ─ Actions
  startRun: (playerName: string) => void;
  tap: (now?: number) => void;
  buyGenerator: (id: string) => void;
  activatePowerup: (id: string) => void;
  tick: (now: number) => void;
  refreshLeaderboard: () => Promise<void>;
  dismissTutorial: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────

function initialGenerators(): Record<string, number> {
  const g: Record<string, number> = {};
  for (const def of GENERATORS) g[def.id] = 0;
  return g;
}

export function generatorCost(def: GeneratorDef, owned: number): number {
  return Math.floor(def.baseCost * Math.pow(COST_SCALE, owned));
}

/** Total auto-taps per second from autoTap generators. */
export function totalAutoTaps(generators: Record<string, number>): number {
  let total = 0;
  for (const def of GENERATORS) {
    if (def.type === 'autoTap') {
      total += def.valuePerUnit * (generators[def.id] ?? 0);
    }
  }
  return total;
}

/** Total additive tap multiplier from tapMult generators. Base = 1. */
export function totalTapMultiplier(generators: Record<string, number>): number {
  let bonus = 0;
  for (const def of GENERATORS) {
    if (def.type === 'tapMult') {
      bonus += def.valuePerUnit * (generators[def.id] ?? 0);
    }
  }
  return 1 + bonus;
}

function scheduleNextEvent(now: number): number {
  const delay =
    EVENT_MIN_INTERVAL_MS +
    Math.random() * (EVENT_MAX_INTERVAL_MS - EVENT_MIN_INTERVAL_MS);
  return now + delay;
}

function pickRandomEvent(): EventDef {
  return EVENTS[Math.floor(Math.random() * EVENTS.length)];
}

// ─── Store ─────────────────────────────────────────────────────

// Check for tutorial flag
function isTutorialSeen(): boolean {
  try { return localStorage.getItem('thegrind_tutorial_seen') === '1'; } catch { return false; }
}

// Try to restore a running session
const restored = loadRunState();

export const useGameStore = create<GameState>((set, get) => ({
  momentum: restored?.momentum ?? 0,
  athScore: restored?.athScore ?? 0,
  generators: restored?.generators ?? initialGenerators(),
  buffs: restored?.buffs ?? [],
  events: restored?.events ?? [],
  nextEventAt: restored?.nextEventAt ?? 0,
  runStatus: restored?.runStatus ?? 'idle',
  runEndsAt: restored?.runEndsAt ?? 0,
  lastTick: restored?.lastTick ?? 0,
  playerName: restored?.playerName ?? '',
  submitted: restored?.submitted ?? false,
  leaderboard: [],
  autoTapsPerSec: restored ? totalAutoTaps(restored.generators ?? {}) : 0,
  tapMultiplier: restored ? totalTapMultiplier(restored.generators ?? {}) : 1,
  momentumPerSec: 0,
  tutorialSeen: isTutorialSeen(),

  // ────────────────────────────────────────────── startRun
  startRun: (playerName: string) => {
    const now = Date.now();
    set({
      momentum: 0,
      athScore: 0,
      generators: initialGenerators(),
      buffs: [],
      events: [],
      nextEventAt: scheduleNextEvent(now),
      runStatus: 'running',
      runEndsAt: now + RUN_DURATION_MS,
      lastTick: now,
      playerName,
      submitted: false,
      autoTapsPerSec: 0,
      tapMultiplier: 1,
      momentumPerSec: 0,
    });
  },

  // ────────────────────────────────────────────── tap
  tap: (now?: number) => {
    const s = get();
    if (s.runStatus !== 'running') return;

    const currentNow = now ?? Date.now();

    // Generator-based tap multiplier
    const genTapMult = totalTapMultiplier(s.generators);

    // Buff tap multiplier
    let buffTapMult = 1;
    for (const b of s.buffs) {
      if (currentNow < b.endsAt) buffTapMult *= b.tapMultiplier;
    }

    // Event all-gains multiplier
    let eventAllMult = 1;
    for (const e of s.events) {
      if (currentNow < e.endsAt) eventAllMult *= e.allGainsMultiplier;
    }

    const gain = BASE_CPT * genTapMult * buffTapMult * eventAllMult;
    const newMomentum = s.momentum + gain;
    const newAth = Math.max(s.athScore, newMomentum);
    set({ momentum: newMomentum, athScore: newAth });
  },

  // ────────────────────────────────────────────── buyGenerator
  buyGenerator: (id: string) => {
    const s = get();
    if (s.runStatus !== 'running') return;

    const def = GENERATORS.find((g) => g.id === id);
    if (!def) return;

    const owned = s.generators[id] ?? 0;

    // Cap at MAX_OWNED
    if (owned >= MAX_OWNED) return;

    const cost = generatorCost(def, owned);
    if (s.momentum < cost) return;

    const newGens = { ...s.generators, [id]: owned + 1 };
    set({
      momentum: s.momentum - cost,
      generators: newGens,
      autoTapsPerSec: totalAutoTaps(newGens),
      tapMultiplier: totalTapMultiplier(newGens),
    });
  },

  // ────────────────────────────────────────────── activatePowerup
  activatePowerup: (id: string) => {
    const s = get();
    if (s.runStatus !== 'running') return;

    const def = POWERUPS.find((p) => p.id === id);
    if (!def) return;

    // Check cost
    if (s.momentum < def.cost) return;

    // Check if already active
    const now = Date.now();
    if (s.buffs.some((b) => b.powerupId === id && now < b.endsAt)) return;

    set({
      momentum: s.momentum - def.cost,
      buffs: [
        ...s.buffs,
        {
          powerupId: id,
          endsAt: now + def.durationMs,
          tapMultiplier: def.tapMultiplier,
          autoTapsPerSec: def.autoTapsPerSec,
        },
      ],
    });
  },

  // ────────────────────────────────────────────── tick
  tick: (now: number) => {
    const s = get();
    if (s.runStatus !== 'running') return;

    // ── Run timer check
    if (now >= s.runEndsAt) {
      // Auto-submit ATH score
      if (!s.submitted) {
        submitScore(s.playerName, Math.floor(s.athScore)).then(() => {
          get().refreshLeaderboard();
        });
      }
      set({ runStatus: 'finished', submitted: true, lastTick: now });
      // Clear saved run
      try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
      return;
    }

    const dt = Math.min((now - s.lastTick) / 1000, 1); // cap at 1s to prevent huge jumps
    if (dt <= 0) return;

    // ── Generator-derived values
    const genAutoTaps = totalAutoTaps(s.generators);
    const genTapMult = totalTapMultiplier(s.generators);

    // ── Active buff multipliers
    let buffTapMult = 1;
    let buffAutoTaps = 0;
    for (const b of s.buffs) {
      if (now < b.endsAt) {
        buffTapMult *= b.tapMultiplier;
        buffAutoTaps += b.autoTapsPerSec;
      }
    }

    // ── Active event multipliers
    let eventCpsMult = 1;
    let eventAllMult = 1;
    for (const e of s.events) {
      if (now < e.endsAt) {
        eventCpsMult *= e.cpsMultiplier;
        eventAllMult *= e.allGainsMultiplier;
      }
    }

    // ── Passive auto-tap gains (from generators)
    const passiveGain = genAutoTaps * BASE_CPT * dt * eventCpsMult * eventAllMult;

    // ── Buff auto-tap gains (from powerups like Locked-In)
    const buffAutoGain = buffAutoTaps * BASE_CPT * dt * genTapMult * buffTapMult * eventAllMult;

    const totalGain = passiveGain + buffAutoGain;

    // ── Expire buffs & events
    const activeBuffs = s.buffs.filter((b) => now < b.endsAt);
    const activeEvents = s.events.filter((e) => now < e.endsAt);

    // ── Maybe trigger new event
    let newEvents = activeEvents;
    let nextEventAt = s.nextEventAt;
    if (now >= s.nextEventAt) {
      const ev = pickRandomEvent();
      newEvents = [
        ...activeEvents,
        {
          eventId: ev.id,
          name: ev.name,
          description: ev.description,
          icon: ev.icon,
          positive: ev.positive,
          endsAt: now + ev.durationMs,
          cpsMultiplier: ev.cpsMultiplier,
          allGainsMultiplier: ev.allGainsMultiplier,
        },
      ];
      nextEventAt = scheduleNextEvent(now);
    }

    // ── Derive momentumPerSec for UI
    const momentumPerSec =
      genAutoTaps * BASE_CPT * eventCpsMult * eventAllMult +
      buffAutoTaps * BASE_CPT * genTapMult * buffTapMult * eventAllMult;

    const newMomentum = s.momentum + totalGain;
    const newAth = Math.max(s.athScore, newMomentum);

    set({
      momentum: newMomentum,
      athScore: newAth,
      buffs: activeBuffs,
      events: newEvents,
      nextEventAt,
      lastTick: now,
      autoTapsPerSec: genAutoTaps,
      tapMultiplier: genTapMult,
      momentumPerSec,
    });

    // Persist run state periodically
    saveRunState(get());
  },

  // ────────────────────────────────────────────── refreshLeaderboard
  refreshLeaderboard: async () => {
    const entries = await fetchTopScores(5);
    set({ leaderboard: entries });
  },

  // ────────────────────────────────────────────── dismissTutorial
  dismissTutorial: () => {
    try { localStorage.setItem('thegrind_tutorial_seen', '1'); } catch { /* noop */ }
    set({ tutorialSeen: true });
  },
}));
