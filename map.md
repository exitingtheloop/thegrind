# map.md — Repo Map

> Where to find things and where to make changes.

---

## Project root

```
thegrind/
├── src/                    # Frontend source
│   ├── App.tsx             # All UI components (~1080 lines)
│   ├── App.css             # All styles, warm parchment theme (~1220 lines)
│   ├── main.tsx            # React entry point
│   ├── vite-env.d.ts       # Vite type declarations
│   ├── game/
│   │   ├── config.ts       # Game constants, generator/powerup/event defs
│   │   ├── state.ts        # Zustand store — all game logic + actions
│   │   └── loop.ts         # requestAnimationFrame game loop
│   ├── hooks/
│   │   ├── useBackgroundMusic.ts  # Singleton BGM with mute toggle
│   │   └── useSfx.ts             # 6 sound effects (tap, upgrade, etc.)
│   ├── services/
│   │   └── leaderboard.ts  # API calls, device ID, name locking
│   ├── assets/             # 45+ images, GIFs, and audio files
│   └── __tests__/
│       ├── state.test.ts        # 37 store/logic tests
│       └── leaderboard.test.ts  # 8 API tests
├── api/                    # Azure Functions .NET 8 backend
│   ├── Functions/
│   │   ├── Admin.cs        # GET/POST/DELETE /api/manage (key auth)
│   │   ├── GetConfig.cs    # GET /api/config
│   │   ├── GetMe.cs        # GET /api/me
│   │   ├── GetScores.cs    # GET /api/scores
│   │   └── SubmitScore.cs  # POST /api/scores (deadline gate)
│   ├── Models/             # Table Storage entity models
│   ├── Program.cs          # DI + startup
│   ├── host.json           # Functions host config
│   └── api.csproj          # .NET project file
├── .github/workflows/      # CI/CD (GitHub Actions → Azure)
├── vite.config.ts          # Dev server + /api proxy
├── vitest.config.ts        # Test config
├── index.html              # SPA entry
└── *.md                    # Documentation
```

---

## Common edits

| Change | File(s) |
|--------|---------|
| Generator/powerup balance | `src/game/config.ts` |
| Game logic or new actions | `src/game/state.ts` |
| Event timing or effects | `src/game/config.ts` |
| Run duration (fallback) | `src/game/config.ts` (`RUN_DURATION_MS`) |
| UI layout or new screens | `src/App.tsx` |
| Styling | `src/App.css` |
| API calls | `src/services/leaderboard.ts` |
| Backend endpoints | `api/Functions/*.cs` |
| Sound effects | `src/hooks/useSfx.ts` + add `.mp3` to `src/assets/` |
| Background music | `src/hooks/useBackgroundMusic.ts` |
| Art assets | Add to `src/assets/`, import in `App.tsx` |

---

## Commands

```bash
npm run dev              # Vite dev server (port 5173)
npx tsc --noEmit         # Type check
npx vitest run           # Run all 45 tests
cd api && dotnet build   # Build .NET backend
```

---

## Key URLs

| URL | Purpose |
|-----|---------|
| `/` | Game (StartScreen → GameScreen → RunCompleteScreen) |
| `/#admin` | Admin panel (set deadline, view/reset scores) |
| `/api/config` | Server time + deadline |
| `/api/scores` | Leaderboard |
| `/api/me` | Device check |
| `/api/manage` | Admin operations (key auth) |
