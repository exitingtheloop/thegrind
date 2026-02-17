# The Grind — Wedding Mini-Game

A cozy **clicker mini-game** built for Chris & Nadine's wedding. Guests scan a QR code, tap to earn Wedding Funds, buy upgrades, and compete for the Top 5 leaderboard. Runs are time-boxed by a server-synced deadline set via an admin panel.

Built as a weekend hackathon project.

---

## How it works

1. Guest scans the QR code → lands on the game
2. Enters a name (locked after first run)
3. Taps **Start Run** → timer starts (synced to server deadline)
4. Tap to earn **Wedding Funds** (momentum)
5. Buy **Generators** (auto-tap, tap multipliers) and **Power-ups** (burst boosts)
6. Survive random **Life Events** (bills, bonuses, taxes)
7. Your **All-Time High** momentum is your score
8. When the deadline hits, scores are final — top 3 win prizes

---

## Game content

### Generators (4)
| Generator | Type | Effect |
|-----------|------|--------|
| Side Hustle | Auto-tap | +0.25/s per unit |
| Budget System | Auto-tap | +1.5/s per unit |
| Promotion Track | Tap multiplier | +1.5× per unit |
| Family Support | Tap multiplier | +2.5× per unit |

Max 10 each. Cost scales ×1.15 per owned.

### Power-ups (2)
| Power-up | Effect | Duration |
|----------|--------|----------|
| Payday Hit | ×2 tap gains | 20s |
| Locked-In Mode | +10 auto-taps/s | 20s |

### Events (4)
Random events every 25-40 seconds:
- **Unexpected Bonus** → +50% CPS for 15s
- **Raise Approved** → +25% all gains for 20s
- **Unexpected Bill** → −50% CPS for 15s
- **Tax Surprise** → −25% all gains for 20s

### Tier backgrounds
Visual progression based on All-Time High score:
- **Tier 1** (0-499) — starter background
- **Tier 2** (500-999) — upgraded + confetti burst
- **Tier 3** (1000+) — final tier + confetti burst

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Vite 6 + React 18 + TypeScript 5.6 |
| State | Zustand 4.5 |
| Backend | Azure Functions .NET 8 Isolated |
| Database | Azure Table Storage |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |
| Audio | HTML5 Audio — BGM + 6 SFX |

---

## Development

```bash
npm install
npm run dev              # Dev server (proxies /api to Azure)
npx tsc --noEmit         # Type check
npx vitest run           # 45 tests
cd api && dotnet build   # Build backend
```

### Local workflow
The Vite dev server proxies `/api` calls to the production Azure Functions backend. Set a deadline via the admin panel (`/#admin`) on production for local to work in "game mode".

---

## Admin panel

Access at `/#admin`. Requires admin key (query param auth).

Features:
- **Set deadline** — all players share the same end time
- **View scores** — all submissions with device IDs
- **Reset data** — wipes scores + expires deadline

---

## Backend endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/config` | GET | Server time + deadline |
| `/api/scores` | GET | Top scores |
| `/api/scores` | POST | Submit score (deadline-gated) |
| `/api/me` | GET | Check if device already played |
| `/api/manage` | GET/POST/DELETE | Admin operations (key auth) |

---

## Deployment

Push to `main` → GitHub Actions auto-deploys:
- Frontend → Azure Static Web Apps
- Backend → Azure Functions (linked)

---

## Art & audio

- **Visual style**: Cozy illustrated, warm parchment/wood theme
- **Fonts**: Patrick Hand (headings) + Quicksand (body)
- **BGM**: Looping background track, starts on first interaction
- **SFX**: Tap, upgrade purchase, powerup purchase, button click, leaderboard modal, leader alert
- **Assets**: 45+ custom illustrations, GIFs, and audio files in `src/assets/`
