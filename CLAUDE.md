# CLAUDE.md — Assistant Guide (GitHub Copilot / Claude Opus)

This file tells an AI assistant how to work on this repo without breaking things.

---

## 1) Project goal

Build a **wedding mini‑game** that is:
- fun for 5–10 minutes
- ends automatically at 8:00
- submits a score
- shows Top 5 leaderboard
- does NOT encourage playing during the reception

Theme: Gab + Nadine “grinding through married life” — humorous and relatable.

---

## 2) Non‑negotiables

- Keep changes small and reviewable.
- Do not rewrite the whole app or refactor the engine.
- Preserve strict TypeScript.
- Keep tests passing; add tests for new logic.
- UI must be icon‑first and minimal text.

---

## 3) Wedding version scope (keep it simple)

### Must have
1) Run timer (8 minutes)
   - Start Run button
   - Hard stop at 0:00
   - Auto‑submit score

2) MOMENTUM + TEAMWORK

3) Convert: Convert 10% MOMENTUM → TEAMWORK

4) 4 Generators, 2 Power‑ups, 4 Events

5) Leaderboard Top 5 (submit at run end)

### Nice to have (only if time)
- Simple anti‑spam guardrails
- Share score (copy text)
- 2 attempts max

### Out of scope (wedding version)
- Prestige / long‑term progression
- Huge content trees
- Complex auth or wallets

---

## 4) Development approach

1) Add/adjust config objects first (single source of truth).
2) Implement logic in the store and unit test it.
3) Wire UI with minimal text.
4) Run `npm test` before committing.

Logic belongs in the store; UI calls actions only.

---

## 5) Suggested “wedding mode” strategy

Add a single flag/config:
- `WEDDING_MODE = true`

In wedding mode:
- Disable prestige UI entirely
- Disable offline progress (or ignore saved state during a run)
- Require Start Run to begin timer/scoring
- Reset state at Start Run so everyone starts fair

---

## 6) Leaderboard integration

Prefer Supabase:
- Create `src/services/leaderboard.ts`
- Env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_WEDDING_CODE` (optional)

API:
- `submitScore(name, score, weddingCode)`
- `fetchTopScores(limit=5)`

No complex auth. No personal data beyond a display name.

---

## 7) UI goals (Tap‑Titans style)

- Big center tap arena
- Left: power‑up icons
- Right: generator icons
- Bottom: convert + leaderboard
- Minimal labels (tooltips ok)

Active state: glow ring; disabled: dim.

---

## 8) Testing expectations

Add tests for:
- Start/end of run timer
- Auto submit at 0:00
- Convert rule
- Event scheduling (25–40s range)
- Wedding mode resets state on Start Run
- Leaderboard calls mocked

Keep time deterministic (inject now/seed where needed).

---

## 9) Output expectations

When producing changes:
- Provide a clear diff or full file replacements
- Explain what changed and why
- Confirm tests still pass
