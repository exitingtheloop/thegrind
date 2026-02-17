# architecture.md — The Grind Architecture

---

## 1) High-level view

```
┌─────────────────────────────────────────────────────┐
│  Browser (Mobile-first SPA)                         │
│                                                     │
│  React 18 + TypeScript                              │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │ App.tsx   │  │ Hooks    │  │ Services        │   │
│  │ (all UI)  │──│ BGM/SFX  │  │ leaderboard.ts  │   │
│  └────┬─────┘  └──────────┘  └───────┬─────────┘   │
│       │                              │              │
│  ┌────▼─────────────────┐            │              │
│  │ Zustand Store        │            │              │
│  │ state.ts + config.ts │            │              │
│  │ + loop.ts (rAF)      │            │              │
│  └──────────────────────┘            │              │
└──────────────────────────────────────┼──────────────┘
                                       │ /api/*
                              ┌────────▼────────┐
                              │ Azure Functions  │
                              │ .NET 8 Isolated  │
                              │ 5 endpoints      │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │ Azure Table      │
                              │ Storage          │
                              │ scores + config  │
                              └─────────────────┘
```

---

## 2) State model (Zustand store)

**Core numbers**
- `momentum` — current Wedding Funds (spendable currency)
- `athScore` — peak momentum this run (final score, never decreases)
- `generators` — map of generator ID → count owned
- `buffs` — active powerups with `endsAt` timestamp
- `events` — active random events with `endsAt` timestamp

**Derived rates (computed each tick)**
- `autoTapsPerSec` — sum of auto-tap generators
- `tapMultiplier` — product of tap-multiplier generators
- `momentumPerSec` — total passive + auto-tap rate

**Run state**
- `runStatus`: `idle` | `running` | `finished`
- `runEndsAt` — timestamp (from server deadline or fallback duration)
- `playerName` — locked after first run
- `submitted` — whether score was sent to backend

---

## 3) Game loop — tick(now)

`requestAnimationFrame` calls `tick(now)` via `loop.ts`.

Each tick:
1. `dt = (now - lastTick)` in seconds
2. Apply passive gains: `autoTaps * tapMultiplier * dt * eventModifiers`
3. Update `momentum` and `athScore` (peak tracking)
4. Expire finished buffs and events
5. Schedule new random events (25-40s intervals)
6. Check run timer → auto-submit if expired
7. Periodic ATH submission to backend every 5s

---

## 4) Tier system

ATH-based tiers (never downgrade):
- **Tier 1**: ATH 0–499 → `bg-tier1.png`
- **Tier 2**: ATH 500–999 → `bg-tier2.png` + confetti
- **Tier 3**: ATH 1000+ → `bg-tier3.png` + confetti

---

## 5) Backend hardening

- **Deadline gate**: `SubmitScore` rejects submissions with HTTP 410 if `serverTime > deadline + 30s`
- **Admin reset**: DELETE `/api/manage` wipes scores AND sets deadline to 1 min in past
- **Client polling**: `GameScreen` polls `/api/config` every 30s; force-ends run if deadline passed
- **Best-score-per-device**: backend keeps highest score per device ID, not latest

---

## 6) Audio system

- **BGM**: Singleton `Audio` element, starts on first user interaction (click/touch/key), loops at 25% volume
- **SFX**: 6 effects (tap, upgrade, powerup, button click, LB modal, leader alert)
  - Tap: single-instance restart pattern (no overlapping)
  - Others: cloned Audio elements for overlapping support
- **Mute toggle**: floating button (bottom-right), persists across screens

---

## 7) Deployment

- Azure Static Web Apps serves the Vite build
- Azure Functions (linked) serve the API
- GitHub Actions: push to `main` → auto build + deploy
- Vite dev proxy: `/api` → `https://thegrind.azurewebsites.net`
