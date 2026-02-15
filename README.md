# Happily Ever After: The Grind — Wedding Mini‑Game

A fast, funny **8‑minute clicker/idle mini‑game** for wedding guests to play **before the reception** (e.g., during the grazing table). Guests compete for a **Top 5 leaderboard**; **Top 3** win extra wedding favors.

Designed to be **fun in 5–10 minutes** — not something people keep playing during the reception.

---

## What guests do

- Scan a QR code
- Enter a name
- Press **Start Run**
- Tap to generate **MOMENTUM**
- Spend MOMENTUM on **Upgrades**
- Convert some MOMENTUM into **TEAMWORK** to multiply all gains
- Survive random life events (bills, taxes…)
- At **0:00**, the run ends, score is submitted, leaderboard updates

---

## Game rules (wedding version)

### Run timer
- **One run = 8:00** (hard stop)
- At **0:00**:
  - Disable interactions
  - Auto‑submit score
  - Show results + Top 5 leaderboard

### Currencies
- **MOMENTUM** (score; big number)
- **TEAMWORK** (multiplier currency)

### Multiplier
TEAMWORK multiplies *all* MOMENTUM gains.

Recommended formula:
- `MULT = 1 + TEAMWORK * 0.0001`
- (+10,000 teamwork ≈ +1.0 multiplier)

### Tap
Tap generates MOMENTUM:
- `tapGain = CPT * MULT * (powerup/event multipliers)`
Base:
- `CPT = 1`

### Convert button
- **Convert 10% MOMENTUM → TEAMWORK**
- Strategic: converting early boosts long‑term gains.

---

## Content (keep it tiny)

### Generators (4)
Generators produce passive MOMENTUM/sec (**CPS**). Cost scales geometrically.

| Generator | Fantasy | Base Cost | Base CPS |
|---|---|---:|---:|
| Side Hustle | “Sell stuff / freelance” | 25 | 0.25 |
| Promotion Track | “Raise / upskill” | 150 | 1.5 |
| Budget System | “Autopay / savings” | 500 | 6 |
| Family Support | “Parents help / hand‑me‑downs” | 2500 | 25 |

Scaling:
- `cost = baseCost * 1.15^owned`

### Power‑ups (2)
Short bursts; icon‑driven.

1) **Payday Hit**
- Effect: `×2 tap gains` for **20s**

2) **Locked‑In Mode**
- Effect: `auto‑taps 10/sec` for **20s**

### Events (4)
Randomly trigger every **25–40 seconds**.

Positive:
- **Unexpected Bonus** → `+50% CPS` for **15s**
- **Raise Approved** → `+25% all gains` for **20s**

Negative:
- **Unexpected Bill** → `−50% CPS` for **15s**
- **Tax Surprise** → `−25% all gains` for **20s**

---

## Leaderboard (Top 5)

### Requirements
- Live Top 5
- Auto‑submit at end of run
- Optional **wedding code** required to submit

### Suggested backend (fast)
**Supabase** (simple Postgres table + RLS).

Table: `scores`
- `id` uuid (pk)
- `name` text
- `score` numeric
- `created_at` timestamp default now()

Client behavior:
- Submit `{ name, score, wedding_code }`
- Fetch Top 5: `ORDER BY score DESC LIMIT 5`

Light guardrails (optional):
- One submission per name every 2 minutes
- Or “best score wins” per name
- Wedding code prevents random spam

---

## Recommended tech stack (fastest for hackathon night)

This stack is ideal for VS Code + Copilot/Claude and fast iteration:

- **Vite + React + TypeScript**
- **Zustand** state store
- **Big number / Decimal** helper
- **Vitest** for tests
- **Tailwind** for layout polish (optional)

You *can* change the stack, but this is the fastest path to a working demo.

---

## Local development

```bash
npm i
npm run dev
npm test
npm run build
```

---

## Wedding deployment checklist

- Deploy to **Vercel** (or Netlify)
- Print a QR code that opens the game
- Put the **wedding code** on a small card near the QR code
- Optional: run on a single iPad kiosk in “kiosk mode”

---

## Tiny roadmap

1) Reskin: MOMENTUM / TEAMWORK + labels
2) Hard‑stop 8‑minute run + Start/End screens
3) Reduce content: 4 generators, 2 powerups, 4 events
4) Leaderboard Top 5 + submit on run end
5) UI polish: Tap‑Titans style icon layout (minimal text)
