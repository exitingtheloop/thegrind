// ─── Wedding Mini-Game Configuration ───────────────────────────
// Single source of truth for all game constants, defs, and tuning.

export const WEDDING_MODE = true;

/** Short run for testing (20s instead of 8 min). */
const DEBUG_SHORT_RUN = true;

/** Run duration in milliseconds. */
export const RUN_DURATION_MS = DEBUG_SHORT_RUN ? 20 * 1000 : 8 * 60 * 1000;

/** Generator cost scaling factor per unit owned. */
export const COST_SCALE = 1.15;

/** Base clicks-per-tap (before multipliers). */
export const BASE_CPT = 1;

/** Maximum purchases per upgrade. */
export const MAX_OWNED = 10;

/** Events fire randomly every 25–40 s. */
export const EVENT_MIN_INTERVAL_MS = 25_000;
export const EVENT_MAX_INTERVAL_MS = 40_000;

// ─── Generator Definitions ─────────────────────────────────────
//
// Two types:
//  • autoTap  — produces automatic taps per second (passive income)
//  • tapMult  — adds to the tap multiplier (rewards active tapping)

export type GeneratorType = 'autoTap' | 'tapMult';

export interface GeneratorDef {
  id: string;
  name: string;
  type: GeneratorType;
  /** Flavor texts that change with each purchase (max 10). */
  flavorTexts: string[];
  baseCost: number;
  /**
   * For autoTap: auto-taps per second per unit owned.
   * For tapMult: additive multiplier bonus per unit owned.
   */
  valuePerUnit: number;
  icon: string;
}

/**
 * Get the current flavor text for a generator based on owned count.
 * Returns the last text if owned exceeds the array length.
 */
export function getFlavorText(def: GeneratorDef, owned: number): string {
  if (owned <= 0) return def.flavorTexts[0];
  const idx = Math.min(owned, def.flavorTexts.length) - 1;
  return def.flavorTexts[idx];
}

export const GENERATORS: GeneratorDef[] = [
  // ── Auto-tap generators (passive income) ──
  {
    id: 'sideHustle',
    name: 'Side Hustle',
    type: 'autoTap',
    flavorTexts: [
      'Sell old textbooks',
      'Weekend garage sale',
      'Facebook Marketplace hustle',
      'Etsy shop opens',
      'Freelance gig machine',
      'Dog walking empire',
      'Reselling sneakers',
      'Airbnb the spare room',
      'Dropshipping guru',
      'Side hustle CEO',
    ],
    baseCost: 25,
    valuePerUnit: 0.5,   // +0.5 auto-taps/s each → max 5/s
    icon: '💼',
  },
  {
    id: 'budgetSystem',
    name: 'Budget System',
    type: 'autoTap',
    flavorTexts: [
      'Track expenses in Notes app',
      'Open a savings account',
      'Set up auto-pay',
      'Cancel unused subscriptions',
      'Coupon queen/king era',
      'Cash envelope system',
      'High-yield savings account',
      'Emergency fund started',
      'Passive income lifestyle',
      'Money printer goes brr',
    ],
    baseCost: 250,
    valuePerUnit: 3,      // +3 auto-taps/s each → max 30/s
    icon: '💰',
  },

  // ── Tap-multiplier generators (boost manual taps) ──
  {
    id: 'promotionTrack',
    name: 'Promotion Track',
    type: 'tapMult',
    flavorTexts: [
      'Ask for a raise (politely)',
      'Update the LinkedIn',
      'Schmooze the boss',
      'Present at the team meeting',
      'Get the corner cubicle',
      'Lead a small team',
      'Skip-level meeting energy',
      'TEDx talk invitation',
      'CEO energy achieved',
      'Retired at the top',
    ],
    baseCost: 50,
    valuePerUnit: 0.5,   // +0.5× per unit → max +5× (6× total)
    icon: '📈',
  },
  {
    id: 'familySupport',
    name: 'Family Support',
    type: 'tapMult',
    flavorTexts: [
      "Mum's home cooking",
      "Dad's hand-me-down car",
      'Grandma sends $20 birthday card',
      'Move back in to save rent',
      "Uncle's investment tip",
      'Family recipe side business',
      'Parents cover the phone bill',
      "Dad's tax advice saves thousands",
      'Trust fund discovered (jk)',
      'Family empire established',
    ],
    baseCost: 400,
    valuePerUnit: 2,      // +2× per unit → max +20× (26× total with Promotion)
    icon: '👨‍👩‍👧‍👦',
  },
];

// ─── Power‑up Definitions ──────────────────────────────────────

export interface PowerupDef {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  /** Multiplier applied to tap gains (1 = no effect). */
  tapMultiplier: number;
  /** Auto-taps per second while active (0 = none). */
  autoTapsPerSec: number;
  icon: string;
  /** Cost to activate. */
  cost: number;
}

export const POWERUPS: PowerupDef[] = [
  {
    id: 'paydayHit',
    name: 'Payday Hit',
    description: '×2 tap gains for 20 s',
    durationMs: 20_000,
    tapMultiplier: 2,
    autoTapsPerSec: 0,
    icon: '💵',
    cost: 50,
  },
  {
    id: 'lockedIn',
    name: 'Locked‑In Mode',
    description: 'Auto‑taps 10/sec for 20 s',
    durationMs: 20_000,
    tapMultiplier: 1,
    autoTapsPerSec: 10,
    icon: '🔒',
    cost: 75,
  },
];

// ─── Event Definitions ─────────────────────────────────────────

export interface EventDef {
  id: string;
  name: string;
  description: string;
  durationMs: number;
  /** Multiplier applied to auto-tap income (1 = no effect). */
  cpsMultiplier: number;
  /** Multiplier applied to ALL gains (1 = no effect). */
  allGainsMultiplier: number;
  positive: boolean;
  icon: string;
}

export const EVENTS: EventDef[] = [
  {
    id: 'unexpectedBonus',
    name: 'Unexpected Bonus',
    description: '+50% passive income',
    durationMs: 15_000,
    cpsMultiplier: 1.5,
    allGainsMultiplier: 1,
    positive: true,
    icon: '🎁',
  },
  {
    id: 'raiseApproved',
    name: 'Raise Approved',
    description: '+25% all gains (taps + passive)',
    durationMs: 20_000,
    cpsMultiplier: 1,
    allGainsMultiplier: 1.25,
    positive: true,
    icon: '🎉',
  },
  {
    id: 'unexpectedBill',
    name: 'Unexpected Bill',
    description: '−50% passive income',
    durationMs: 15_000,
    cpsMultiplier: 0.5,
    allGainsMultiplier: 1,
    positive: false,
    icon: '📃',
  },
  {
    id: 'taxSurprise',
    name: 'Tax Surprise',
    description: '−25% all gains (taps + passive)',
    durationMs: 20_000,
    cpsMultiplier: 1,
    allGainsMultiplier: 0.75,
    positive: false,
    icon: '🏛️',
  },
];
