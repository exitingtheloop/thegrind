# map.md — Repo Map + Where to Change What

> File names may differ slightly. Avoid moving files; add new ones if needed.

---

## Core files (likely)

- src/App.tsx
  UI layout (tap arena, icons, name entry, timer, leaderboard)

- src/game/state.ts
  Store: numbers, actions, tick(), run timer, derived rates

- src/game/economy.ts
  Generator defs (4), cost scaling, teamwork multiplier formula

- src/game/powerups.ts
  Powerups defs (2), buffs

- src/game/events.ts
  Events defs (4), random scheduler (25–40s), ticker log

- src/game/bignum.ts
  Decimal helpers: d(), fmt()

- src/game/loop.ts (or tick.ts)
  requestAnimationFrame loop

- src/services/leaderboard.ts (to add)
  submitScore(), fetchTopScores()

- src/services/save.ts
  Save/load/offline (recommended to disable during wedding run)

- src/**/*.test.ts
  Vitest unit tests

---

## Common edits

Change generator balance:
- src/game/economy.ts

Change events effects or timing:
- src/game/events.ts

Change powerups:
- src/game/powerups.ts

Change convert percentage:
- src/game/state.ts

Change run duration:
- src/game/state.ts (or a config file)

Add/update leaderboard:
- src/services/leaderboard.ts
- src/App.tsx

---

## Wedding mode toggle (recommended)

Create a config:
- src/game/config.ts
  - WEDDING_MODE = true
  - RUN_DURATION_MS = 8 * 60 * 1000
  - generator defs
  - event defs

Import config into store/modules.

---

## Commands

- npm run dev
- npm test
- npm run build
