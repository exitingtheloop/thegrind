# architecture.md — Wedding Mini‑Game Architecture

---

## 1) High‑level view

Client (React + TS)
- Renders state
- Calls actions on user input

Game Store (Zustand)
- Single source of truth for:
  - MOMENTUM, TEAMWORK, multipliers
  - Generator ownership + CPS
  - Buffs/powerups
  - Events + ticker log
  - Run timer + run status
  - Derived rates (MOMENTUM/sec)

Services
- `leaderboard.ts`: submit + fetch Top 5
- `save.ts`: optional; recommended to disable offline progress in wedding mode

Backend (Supabase)
- Table `scores` with `{name, score, created_at}`

---

## 2) State model (recommended)

Core numbers
- momentum (Decimal)
- teamwork (Decimal)
- cpt (Decimal)
- cps (Decimal, derived)
- buffs (list with endsAt, multipliers, autoTapsPerSec)
- eventsLog (list with endsAt for ticker)

Run state
- runStatus: idle | running | finished
- runEndsAt: timestamp ms
- lastTick: timestamp ms
- playerName: string
- weddingCodeInput: string
- submitted: boolean

---

## 3) Game loop / tick()

requestAnimationFrame calls `tick(now)`.

tick(now) responsibilities:
1) dt = (now - lastTick) seconds
2) Apply passive gains:
   - base: cps * dt
   - multiply by: teamwork mult × buff mult × event mult
3) Apply auto taps:
   - autoRate = sum(autoTapsPerSec)
   - gain: autoRate * cpt * dt * multipliers
4) Expire buffs/events and clean logs
5) Run timer:
   - if running and now >= runEndsAt:
     - set finished
     - disable actions (or UI guards)
     - submit score once

Derived “MOMENTUM/sec”:
- rate = (cps * multipliers) + (autoRate * cpt * multipliers)

---

## 4) Wedding fairness

Recommended in wedding mode:
- Start Run resets state (no advantage)
- Ignore saved state during run
- Disable offline gains
- Optionally limit attempts

---

## 5) Deployment

Environment variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_WEDDING_CODE (optional)

Deploy to Vercel; display QR code at venue.
