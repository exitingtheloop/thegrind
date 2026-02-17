# CLAUDE.md — Assistant Guide

This file tells an AI assistant how to work on this repo.

---

## 1) Project overview

**The Grind** — a wedding clicker mini-game for Chris & Nadine's wedding.
Guests scan a QR code, tap to earn Wedding Funds, buy upgrades, and compete
for the Top 5 leaderboard. Runs are time-boxed by a server-synced deadline
set via an admin panel.

---

## 2) Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Vite 6 + React 18 + TypeScript 5.6 |
| State | Zustand 4.5 (single store in `src/game/state.ts`) |
| Backend | Azure Functions .NET 8 Isolated |
| Database | Azure Table Storage (`scores` + `config` tables) |
| Hosting | Azure Static Web Apps + Azure Functions |
| CI/CD | GitHub Actions (auto-deploy on push to main) |
| Audio | HTML5 Audio — BGM loop + 6 SFX |
| Art style | Cozy illustrated, warm parchment/wood theme |
| Fonts | Patrick Hand (headings) + Quicksand (body) |

---

## 3) Non-negotiables

- Keep changes small and reviewable.
- Preserve strict TypeScript (`npx tsc --noEmit`).
- Keep tests passing (`npx vitest run` — 45 tests).
- Logic belongs in the store; UI calls actions only.
- UI is icon-first with minimal text.

---

## 4) Key mechanics

- **MOMENTUM** (Wedding Funds) — primary currency, earned by tapping
- **ATH Score** (All-Time High) — peak momentum during a run, used as final score
- **Generators** — 4 types (auto-tap or tap-multiplier), max 10 each, cost scales ×1.15
- **Power-ups** — 2 types (Payday Hit ×2 tap, Locked-In 10/s auto-tap), 20s duration
- **Events** — 4 random events every 25-40s (±50% CPS or ±25% all gains)
- **Tier backgrounds** — change at ATH 500 / 1000 with confetti on upgrade

---

## 5) Backend endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/config` | GET | Server time + deadline |
| `/api/scores` | GET | Top scores (limit param) |
| `/api/scores` | POST | Submit score (deadline gate + 30s grace) |
| `/api/me` | GET | Check if device already played |
| `/api/manage` | GET | Admin: list all scores (key auth) |
| `/api/manage` | POST | Admin: set deadline (key auth) |
| `/api/manage` | DELETE | Admin: reset all data + expire deadline (key auth) |

---

## 6) Development

```bash
npm run dev          # Vite dev server (proxies /api to Azure)
npx tsc --noEmit     # Type check
npx vitest run       # Run tests
cd api && dotnet build  # Build backend
```

Vite proxy in `vite.config.ts` forwards `/api` to production Azure Functions.
Set deadline on production admin (`/#admin`) for local to also work in "game mode".

---

## 7) File conventions

- `src/game/config.ts` — single source of truth for game constants
- `src/game/state.ts` — Zustand store with all game logic + actions
- `src/game/loop.ts` — requestAnimationFrame game loop
- `src/App.tsx` — all UI components (~1080 lines)
- `src/App.css` — all styles, warm parchment theme (~1220 lines)
- `src/hooks/` — useBackgroundMusic, useSfx
- `src/services/leaderboard.ts` — API calls, device ID, name locking
- `src/assets/` — 45+ art/audio assets
- `api/Functions/` — 5 Azure Functions (.NET 8)
