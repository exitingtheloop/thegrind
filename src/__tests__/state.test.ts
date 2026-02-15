// ─── Game Store Unit Tests ─────────────────────────────────────
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, generatorCost, totalAutoTaps, totalTapMultiplier } from '../game/state';
import {
  RUN_DURATION_MS,
  GENERATORS,
  MAX_OWNED,
  EVENT_MIN_INTERVAL_MS,
  EVENT_MAX_INTERVAL_MS,
  COST_SCALE,
  getFlavorText,
} from '../game/config';

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

// Reset store before each test
beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k];
  useGameStore.setState({
    momentum: 0,
    athScore: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    buffs: [],
    events: [],
    nextEventAt: 0,
    runStatus: 'idle',
    runEndsAt: 0,
    lastTick: 0,
    playerName: '',
    submitted: false,
    leaderboard: [],
    autoTapsPerSec: 0,
    tapMultiplier: 1,
    momentumPerSec: 0,
    tutorialSeen: false,
  });
});

// ─── Helper: start a run at a known time ───────────────────────

function startRunAt(name: string, now: number) {
  useGameStore.setState({
    momentum: 0,
    athScore: 0,
    generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    buffs: [],
    events: [],
    nextEventAt: now + EVENT_MIN_INTERVAL_MS + 1000,
    runStatus: 'running',
    runEndsAt: now + RUN_DURATION_MS,
    lastTick: now,
    playerName: name,
    submitted: false,
    autoTapsPerSec: 0,
    tapMultiplier: 1,
    momentumPerSec: 0,
  });
}

// ─── Tests ─────────────────────────────────────────────────────

describe('generatorCost', () => {
  it('returns baseCost when owned=0', () => {
    const sideHustle = GENERATORS[0];
    expect(generatorCost(sideHustle, 0)).toBe(sideHustle.baseCost);
  });

  it('scales by COST_SCALE per unit owned', () => {
    const sideHustle = GENERATORS[0];
    const cost1 = generatorCost(sideHustle, 1);
    expect(cost1).toBe(Math.floor(sideHustle.baseCost * COST_SCALE));
  });

  it('scales exponentially', () => {
    const g = GENERATORS[1];
    const cost5 = generatorCost(g, 5);
    expect(cost5).toBe(Math.floor(g.baseCost * Math.pow(COST_SCALE, 5)));
  });
});

describe('totalAutoTaps', () => {
  it('returns 0 with no generators', () => {
    const gens = Object.fromEntries(GENERATORS.map((g) => [g.id, 0]));
    expect(totalAutoTaps(gens)).toBe(0);
  });

  it('sums autoTap generators only', () => {
    const autoTapGens = GENERATORS.filter((g) => g.type === 'autoTap');
    const gens = Object.fromEntries(GENERATORS.map((g) => [g.id, 0]));
    gens[autoTapGens[0].id] = 2; // 2 × valuePerUnit
    const expected = autoTapGens[0].valuePerUnit * 2;
    expect(totalAutoTaps(gens)).toBeCloseTo(expected);
  });
});

describe('totalTapMultiplier', () => {
  it('returns 1 with no generators', () => {
    const gens = Object.fromEntries(GENERATORS.map((g) => [g.id, 0]));
    expect(totalTapMultiplier(gens)).toBe(1);
  });

  it('adds tapMult generator bonuses', () => {
    const tapMultGens = GENERATORS.filter((g) => g.type === 'tapMult');
    const gens = Object.fromEntries(GENERATORS.map((g) => [g.id, 0]));
    gens[tapMultGens[0].id] = 3;
    const expected = 1 + tapMultGens[0].valuePerUnit * 3;
    expect(totalTapMultiplier(gens)).toBeCloseTo(expected);
  });
});

describe('startRun', () => {
  it('sets runStatus to running and resets state', () => {
    useGameStore.setState({ momentum: 999, athScore: 500 });
    useGameStore.getState().startRun('TestPlayer');

    const s = useGameStore.getState();
    expect(s.runStatus).toBe('running');
    expect(s.playerName).toBe('TestPlayer');
    expect(s.momentum).toBe(0);
    expect(s.athScore).toBe(0);
    expect(s.submitted).toBe(false);
  });

  it('sets runEndsAt to now + RUN_DURATION_MS', () => {
    const before = Date.now();
    useGameStore.getState().startRun('A');
    const after = Date.now();

    const s = useGameStore.getState();
    expect(s.runEndsAt).toBeGreaterThanOrEqual(before + RUN_DURATION_MS);
    expect(s.runEndsAt).toBeLessThanOrEqual(after + RUN_DURATION_MS);
  });
});

describe('tap', () => {
  it('does nothing when not running', () => {
    useGameStore.getState().tap();
    expect(useGameStore.getState().momentum).toBe(0);
  });

  it('adds momentum when running', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.getState().tap(now);
    expect(useGameStore.getState().momentum).toBeGreaterThan(0);
  });

  it('applies generator tap multiplier', () => {
    const now = 1000000;
    startRunAt('T', now);

    // Buy a tapMult generator manually
    const tapMultGen = GENERATORS.find((g) => g.type === 'tapMult')!;
    useGameStore.setState({
      generators: { ...useGameStore.getState().generators, [tapMultGen.id]: 2 },
    });

    useGameStore.getState().tap(now);
    const withMult = useGameStore.getState().momentum;

    // Reset and tap without generator
    useGameStore.setState({
      momentum: 0,
      generators: Object.fromEntries(GENERATORS.map((g) => [g.id, 0])),
    });
    useGameStore.getState().tap(now);
    const withoutMult = useGameStore.getState().momentum;

    const expectedRatio = 1 + tapMultGen.valuePerUnit * 2;
    expect(withMult / withoutMult).toBeCloseTo(expectedRatio);
  });

  it('applies buff tap multiplier', () => {
    const now = 1000000;
    startRunAt('T', now);

    useGameStore.setState({
      buffs: [
        { powerupId: 'paydayHit', endsAt: now + 20000, tapMultiplier: 2, autoTapsPerSec: 0 },
      ],
    });

    useGameStore.getState().tap(now);
    const withBuff = useGameStore.getState().momentum;

    useGameStore.setState({ momentum: 0, buffs: [] });
    useGameStore.getState().tap(now);
    const withoutBuff = useGameStore.getState().momentum;

    expect(withBuff).toBeCloseTo(withoutBuff * 2);
  });

  it('updates ATH score on tap', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.getState().tap(now);
    const s = useGameStore.getState();
    expect(s.athScore).toBe(s.momentum);
    expect(s.athScore).toBeGreaterThan(0);
  });
});

describe('buyGenerator', () => {
  it('does nothing when not running', () => {
    useGameStore.setState({ momentum: 10000 });
    useGameStore.getState().buyGenerator('sideHustle');
    expect(useGameStore.getState().generators['sideHustle']).toBe(0);
  });

  it('deducts cost and increments owned', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ momentum: 100 });

    useGameStore.getState().buyGenerator('sideHustle');

    const s = useGameStore.getState();
    expect(s.generators['sideHustle']).toBe(1);
    expect(s.momentum).toBe(100 - GENERATORS[0].baseCost);
  });

  it('rejects purchase when too expensive', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ momentum: 10 });

    useGameStore.getState().buyGenerator('sideHustle');
    expect(useGameStore.getState().generators['sideHustle']).toBe(0);
    expect(useGameStore.getState().momentum).toBe(10);
  });

  it('caps at MAX_OWNED', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({
      momentum: 999999,
      generators: { ...useGameStore.getState().generators, sideHustle: MAX_OWNED },
    });

    useGameStore.getState().buyGenerator('sideHustle');
    expect(useGameStore.getState().generators['sideHustle']).toBe(MAX_OWNED);
    expect(useGameStore.getState().momentum).toBe(999999); // no cost deducted
  });
});

describe('tick', () => {
  it('does nothing when not running', () => {
    useGameStore.getState().tick(Date.now());
    expect(useGameStore.getState().momentum).toBe(0);
  });

  it('applies passive auto-tap gains from generators', () => {
    const now = 1000000;
    startRunAt('T', now);
    const autoGen = GENERATORS.find((g) => g.type === 'autoTap')!;
    useGameStore.setState({
      generators: { ...useGameStore.getState().generators, [autoGen.id]: 1 },
    });

    useGameStore.getState().tick(now + 1000);

    // Should gain valuePerUnit * 1s * BASE_CPT
    expect(useGameStore.getState().momentum).toBeCloseTo(autoGen.valuePerUnit, 1);
  });

  it('applies auto-taps from buffs', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({
      buffs: [
        { powerupId: 'lockedIn', endsAt: now + 20000, tapMultiplier: 1, autoTapsPerSec: 10 },
      ],
    });

    useGameStore.getState().tick(now + 1000);

    // Buff auto-taps use genTapMult (1 at start) → 10 * 1 * 1 * 1 = 10
    expect(useGameStore.getState().momentum).toBeCloseTo(10, 0);
  });

  it('updates ATH on tick gains', () => {
    const now = 1000000;
    startRunAt('T', now);
    const autoGen = GENERATORS.find((g) => g.type === 'autoTap')!;
    useGameStore.setState({
      generators: { ...useGameStore.getState().generators, [autoGen.id]: 1 },
    });

    useGameStore.getState().tick(now + 1000);
    const s = useGameStore.getState();
    expect(s.athScore).toBe(s.momentum);
    expect(s.athScore).toBeGreaterThan(0);
  });

  it('ATH stays at peak even when momentum drops (via purchase)', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ momentum: 500, athScore: 500 });

    // Buy something, reducing momentum
    useGameStore.getState().buyGenerator('sideHustle'); // costs 25
    const s = useGameStore.getState();
    expect(s.momentum).toBe(475);
    expect(s.athScore).toBe(500); // ATH unchanged
  });

  it('finishes run at runEndsAt and submits ATH', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ momentum: 300, athScore: 500 });

    useGameStore.getState().tick(now + RUN_DURATION_MS + 1);

    const s = useGameStore.getState();
    expect(s.runStatus).toBe('finished');
    expect(s.submitted).toBe(true);
  });

  it('expires buffs after their endsAt', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({
      buffs: [
        { powerupId: 'test', endsAt: now + 500, tapMultiplier: 1, autoTapsPerSec: 0 },
      ],
    });

    useGameStore.getState().tick(now + 1000);
    expect(useGameStore.getState().buffs.length).toBe(0);
  });

  it('expires events after their endsAt', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({
      events: [
        {
          eventId: 'test', name: 'Test', description: 'Test event',
          icon: '🎁', positive: true, endsAt: now + 500,
          cpsMultiplier: 1.5, allGainsMultiplier: 1,
        },
      ],
    });

    useGameStore.getState().tick(now + 1000);
    expect(useGameStore.getState().events.length).toBe(0);
  });
});

describe('event scheduling', () => {
  it('triggers an event when nextEventAt is reached', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ nextEventAt: now + 100 });

    useGameStore.getState().tick(now + 200);

    const s = useGameStore.getState();
    expect(s.events.length).toBe(1);
    expect(s.nextEventAt).toBeGreaterThan(now + 200);
  });

  it('schedules next event within 25–40s range', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ nextEventAt: now + 50 });

    useGameStore.getState().tick(now + 100);

    const s = useGameStore.getState();
    const delay = s.nextEventAt - (now + 100);
    expect(delay).toBeGreaterThanOrEqual(EVENT_MIN_INTERVAL_MS - 1);
    expect(delay).toBeLessThanOrEqual(EVENT_MAX_INTERVAL_MS + 1);
  });
});

describe('wedding mode resets', () => {
  it('resets all game state on startRun', () => {
    useGameStore.setState({
      momentum: 5000,
      athScore: 5000,
      generators: { sideHustle: 10, promotionTrack: 5, budgetSystem: 0, familySupport: 0 },
      buffs: [{ powerupId: 'x', endsAt: 99999999, tapMultiplier: 2, autoTapsPerSec: 0 }],
      events: [
        {
          eventId: 'y', name: 'Y', description: 'Test event',
          icon: '🎁', positive: true, endsAt: 99999999,
          cpsMultiplier: 1.5, allGainsMultiplier: 1,
        },
      ],
      runStatus: 'finished',
      submitted: true,
    });

    useGameStore.getState().startRun('NewPlayer');

    const s = useGameStore.getState();
    expect(s.momentum).toBe(0);
    expect(s.athScore).toBe(0);
    expect(s.generators['sideHustle']).toBe(0);
    expect(s.generators['promotionTrack']).toBe(0);
    expect(s.buffs.length).toBe(0);
    expect(s.events.length).toBe(0);
    expect(s.runStatus).toBe('running');
    expect(s.submitted).toBe(false);
    expect(s.playerName).toBe('NewPlayer');
  });
});

describe('tutorial', () => {
  it('starts unseen by default', () => {
    expect(useGameStore.getState().tutorialSeen).toBe(false);
  });

  it('sets tutorialSeen on dismissTutorial', () => {
    useGameStore.getState().dismissTutorial();
    expect(useGameStore.getState().tutorialSeen).toBe(true);
    expect(storage['thegrind_tutorial_seen']).toBe('1');
  });
});

describe('persistence', () => {
  it('clears saved run on finish', () => {
    const now = 1000000;
    startRunAt('P', now);
    useGameStore.setState({ momentum: 500, athScore: 500 });

    storage['thegrind_run_state'] = JSON.stringify({ runStatus: 'running' });

    useGameStore.getState().tick(now + RUN_DURATION_MS + 1);
    expect(useGameStore.getState().runStatus).toBe('finished');
    expect(storage['thegrind_run_state']).toBeUndefined();
  });
});

describe('getFlavorText', () => {
  const g = GENERATORS[0];

  it('returns first text when owned is 0', () => {
    expect(getFlavorText(g, 0)).toBe(g.flavorTexts[0]);
  });

  it('returns text matching owned level', () => {
    expect(getFlavorText(g, 1)).toBe(g.flavorTexts[0]);
    expect(getFlavorText(g, 5)).toBe(g.flavorTexts[4]);
  });

  it('caps at last flavor text for high owned values', () => {
    expect(getFlavorText(g, 100)).toBe(g.flavorTexts[g.flavorTexts.length - 1]);
  });

  it('each generator has 10 flavor texts', () => {
    for (const gen of GENERATORS) {
      expect(gen.flavorTexts.length).toBe(10);
    }
  });
});

describe('event description in state', () => {
  it('includes description when event triggers', () => {
    const now = 1000000;
    startRunAt('T', now);
    useGameStore.setState({ nextEventAt: now + 50 });

    useGameStore.getState().tick(now + 100);

    const s = useGameStore.getState();
    expect(s.events.length).toBe(1);
    expect(s.events[0].description).toBeDefined();
    expect(typeof s.events[0].description).toBe('string');
    expect(s.events[0].description.length).toBeGreaterThan(0);
  });
});
