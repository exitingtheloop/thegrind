// ─── App.tsx — Wedding Mini‑Game UI ────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useGameStore, generatorCost } from './game/state';
import { useGameLoop } from './game/loop';
import { GENERATORS, POWERUPS, MAX_OWNED, getFlavorText } from './game/config';
import type { LeaderboardEntry } from './services/leaderboard';
import {
  fetchConfig,
  fetchMe,
  getLockedName,
  setLockedName,
  getDeviceId,
} from './services/leaderboard';

// ─── Number Formatting ────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'K';
  if (n >= 100) return Math.floor(n).toLocaleString();
  return n.toFixed(1);
}

function fmtTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Tutorial Popup ────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    icon: '💍',
    title: 'Welcome to The Grind!',
    body: "Gab & Nadine's wedding mini‑game. You have 8 minutes to build up the biggest score. Top 3 win prizes!",
  },
  {
    icon: '💪',
    title: 'Tap for Momentum',
    body: 'Tap the big button in the center to earn MOMENTUM — that\'s your score! Tap as fast as you can.',
  },
  {
    icon: '📈',
    title: 'Buy Upgrades',
    body: 'Spend MOMENTUM on upgrades. Some give passive auto-taps, others multiply your tap power. Each upgrade maxes at 10 — explore them all!',
  },
  {
    icon: '💵',
    title: 'Use Power‑ups',
    body: 'Activate power‑ups for temporary boosts — double your taps or get auto‑taps. They cost MOMENTUM but pay off big!',
  },
  {
    icon: '🏆',
    title: 'All‑Time High Score',
    body: 'Your score is your PEAK momentum — the highest it ever reaches during the run. Spending on upgrades lowers your current score, but helps you earn faster and reach a higher peak!',
  },
  {
    icon: '🎲',
    title: 'Random Events',
    body: 'Every 25–40 seconds, a life event pops up — bonuses or setbacks. Roll with it!',
  },
];

function TutorialPopup({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  return (
    <div className="overlay">
      <div className="tutorial-card">
        <div className="tutorial-icon">{current.icon}</div>
        <h2 className="tutorial-title">{current.title}</h2>
        <p className="tutorial-body">{current.body}</p>
        <div className="tutorial-dots">
          {TUTORIAL_STEPS.map((_, i) => (
            <span key={i} className={`dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="tutorial-actions">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          {isLast ? (
            <button className="btn btn-start" onClick={onDismiss}>
              Let's Go! 🎉
            </button>
          ) : (
            <button className="btn btn-start" onClick={() => setStep(step + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Start Screen ──────────────────────────────────────────────

function StartScreen() {
  const [name, setName] = useState('');
  const [nameLocked, setNameLocked] = useState(false);
  const [deadlineLabel, setDeadlineLabel] = useState('');
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [timeUntilDeadline, setTimeUntilDeadline] = useState('');
  const [eventOver, setEventOver] = useState(false);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [myName, setMyName] = useState<string | null>(null);

  const startRun = useGameStore((s) => s.startRun);
  const refreshLeaderboard = useGameStore((s) => s.refreshLeaderboard);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const tutorialSeen = useGameStore((s) => s.tutorialSeen);
  const dismissTutorial = useGameStore((s) => s.dismissTutorial);

  // Fetch config + locked name + me on mount
  useEffect(() => {
    refreshLeaderboard();

    // Check locked name
    const locked = getLockedName();
    if (locked) {
      setName(locked);
      setNameLocked(true);
    }

    // Fetch server config for deadline
    fetchConfig()
      .then((cfg) => {
        if (cfg.deadlineUtc) {
          const deadlineTime = new Date(cfg.deadlineUtc).getTime();
          const serverNow = new Date(cfg.serverTimeUtc).getTime();
          const offset = serverNow - Date.now(); // positive if server is ahead
          setServerOffset(offset);
          setDeadlineMs(deadlineTime);

          // Format deadline in PST for display
          const dl = new Date(cfg.deadlineUtc);
          setDeadlineLabel(
            dl.toLocaleString('en-US', {
              timeZone: 'America/Los_Angeles',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZoneName: 'short',
            }),
          );

          // Check if event is already over
          const correctedNow = Date.now() + offset;
          if (correctedNow >= deadlineTime) {
            setEventOver(true);
          }
        }
      })
      .catch(() => {});

    // Fetch me (check if device already played)
    fetchMe()
      .then((me) => {
        if (me.found && me.name && me.score !== undefined) {
          setMyName(me.name);
          setMyScore(me.score);
          if (!locked) {
            setName(me.name);
            setNameLocked(true);
            setLockedName(me.name);
          }
        }
      })
      .catch(() => {});
  }, [refreshLeaderboard]);

  // Countdown timer to deadline
  useEffect(() => {
    if (deadlineMs === null) return;
    const id = setInterval(() => {
      const correctedNow = Date.now() + serverOffset;
      const remaining = deadlineMs - correctedNow;
      if (remaining <= 0) {
        setEventOver(true);
        setTimeUntilDeadline('0:00');
        clearInterval(id);
      } else {
        const hours = Math.floor(remaining / 3600000);
        const mins = Math.floor((remaining % 3600000) / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        if (hours > 0) {
          setTimeUntilDeadline(`${hours}h ${mins}m ${secs}s`);
        } else if (mins > 0) {
          setTimeUntilDeadline(`${mins}m ${secs}s`);
        } else {
          setTimeUntilDeadline(`${secs}s`);
        }
      }
    }, 500);
    return () => clearInterval(id);
  }, [deadlineMs, serverOffset]);

  const handleStart = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (eventOver) return;
    // Lock the name on first start
    if (!nameLocked) {
      setLockedName(trimmed);
      setNameLocked(true);
    }
    // Pass server-synced deadline so run ends at the global deadline
    const correctedDeadline = deadlineMs !== null
      ? deadlineMs - serverOffset  // convert server-time deadline to local clock
      : undefined;
    startRun(trimmed, correctedDeadline);
  };

  // ── Event Over screen
  if (eventOver) {
    return (
      <div className="screen start-screen">
        <h1 className="game-title">💍 The Grind</h1>
        <p className="subtitle">Wedding Edition — Gab & Nadine</p>

        <div className="event-over-card">
          <h2>⏰ Event Over!</h2>
          {myName && myScore !== null ? (
            <>
              <p className="event-over-name">{myName}</p>
              <p className="event-over-score">
                Your best score: <strong>{fmt(myScore)}</strong>
              </p>
              <p className="event-over-msg">
                Thanks for playing! Winners will be announced soon. 🎉
              </p>
            </>
          ) : (
            <p className="event-over-msg">
              The event has ended. You didn't participate this time — maybe next one! 🥂
            </p>
          )}
        </div>

        {leaderboard.length > 0 && (
          <LeaderboardPanel entries={leaderboard} title="🏆 Final Standings" />
        )}
      </div>
    );
  }

  return (
    <div className="screen start-screen">
      {!tutorialSeen && <TutorialPopup onDismiss={dismissTutorial} />}

      <h1 className="game-title">💍 The Grind</h1>
      <p className="subtitle">Wedding Edition — Gab & Nadine</p>

      {deadlineMs !== null && timeUntilDeadline && (
        <div className="deadline-banner">
          ⏳ Event ends in: <strong>{timeUntilDeadline}</strong>
        </div>
      )}

      <p className="instructions">
        Tap to earn <b>MOMENTUM</b>. Buy upgrades. Hit the highest peak!
        <br />
        {deadlineMs !== null
          ? <>Everyone's run ends at the same time. Top 3 win prizes!</>
          : <>Top 3 win prizes!</>}
      </p>

      <div className="name-entry">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => !nameLocked && setName(e.target.value)}
          maxLength={20}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          disabled={nameLocked}
          autoFocus={!nameLocked}
        />
        {!nameLocked && (
          <p className="name-warning">
            ⚠️ Name can only be set once{deadlineLabel ? `. Play multiple times until ${deadlineLabel}!` : ''}
          </p>
        )}
        {nameLocked && (
          <p className="name-locked-msg">
            🔒 Playing as <strong>{name}</strong>
          </p>
        )}
        <button
          className="btn btn-start"
          onClick={handleStart}
          disabled={!name.trim()}
        >
          ▶ Start Run
        </button>
      </div>

      <button
        className="btn btn-secondary tutorial-btn"
        onClick={() => useGameStore.setState({ tutorialSeen: false })}
      >
        📖 How to Play
      </button>

      {leaderboard.length > 0 && (
        <LeaderboardPanel entries={leaderboard} title="🏆 Current Top 5" />
      )}
    </div>
  );
}

// ─── Run Complete Modal ────────────────────────────────────────

function RunCompleteScreen() {
  const athScore = useGameStore((s) => s.athScore);
  const playerName = useGameStore((s) => s.playerName);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const refreshLeaderboard = useGameStore((s) => s.refreshLeaderboard);

  useEffect(() => {
    refreshLeaderboard();
  }, [refreshLeaderboard]);

  const handlePlayAgain = () => {
    useGameStore.setState({ runStatus: 'idle' });
  };

  return (
    <div className="screen complete-screen">
      <h1>⏰ Run Complete!</h1>
      <p className="final-name">{playerName}</p>
      <div className="final-scores">
        <div className="final-score">
          <span className="label">🏆 ALL‑TIME HIGH</span>
          <span className="value">{fmt(athScore)}</span>
        </div>
      </div>

      <LeaderboardPanel entries={leaderboard} title="🏆 Top 5" />

      <button className="btn btn-start" onClick={handlePlayAgain}>
        Play Again
      </button>
    </div>
  );
}

// ─── Leaderboard Panel ─────────────────────────────────────────

function LeaderboardPanel({
  entries,
  title,
}: {
  entries: LeaderboardEntry[];
  title: string;
}) {
  const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
  return (
    <div className="leaderboard-panel">
      <h3>{title}</h3>
      {entries.length === 0 && <p className="empty">No scores yet</p>}
      <ol className="lb-list">
        {entries.map((e, i) => (
          <li key={e.name + i}>
            <span className="rank">{medals[i] ?? `${i + 1}.`}</span>
            <span className="lb-name">{e.name}</span>
            <span className="lb-score">{fmt(e.score)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Game Screen (mobile‑first, stacked layout) ───────────────

function GameScreen() {
  useGameLoop();

  const momentum = useGameStore((s) => s.momentum);
  const athScore = useGameStore((s) => s.athScore);
  const momentumPerSec = useGameStore((s) => s.momentumPerSec);
  const tapMultiplier = useGameStore((s) => s.tapMultiplier);
  const runEndsAt = useGameStore((s) => s.runEndsAt);
  const generators = useGameStore((s) => s.generators);
  const buffs = useGameStore((s) => s.buffs);
  const events = useGameStore((s) => s.events);
  const tap = useGameStore((s) => s.tap);
  const buyGenerator = useGameStore((s) => s.buyGenerator);
  const activatePowerup = useGameStore((s) => s.activatePowerup);

  // Timer
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, runEndsAt - Date.now()));
  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, runEndsAt - Date.now()));
    }, 200);
    return () => clearInterval(id);
  }, [runEndsAt]);

  // Tap with visual feedback
  const [tapFlash, setTapFlash] = useState(false);
  const handleTap = useCallback(() => {
    tap();
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 100);
  }, [tap]);

  const now = Date.now();

  // Active tab: upgrades vs powerups vs lore
  const [activeTab, setActiveTab] = useState<'upgrades' | 'powerups' | 'lore'>('upgrades');

  return (
    <div className="game-screen">
      {/* ── Top Bar: Timer + Currencies */}
      <div className="top-bar">
        <div className="timer">{fmtTime(timeLeft)}</div>
        <div className="currencies">
          <div className="currency">
            <span className="cur-label">⚡ MOMENTUM</span>
            <span className="cur-value">{fmt(momentum)}</span>
            <span className="cur-rate">{fmt(momentumPerSec)}/s · ×{tapMultiplier.toFixed(1)} tap</span>
          </div>
          <div className="currency ath-currency">
            <span className="cur-label">🏆 ATH SCORE</span>
            <span className="cur-value">{fmt(athScore)}</span>
          </div>
        </div>
      </div>

      {/* ── Event ticker */}
      {events.filter((e) => now < e.endsAt).length > 0 && (
        <div className="event-ticker">
          {events
            .filter((e) => now < e.endsAt)
            .map((e) => (
              <span
                key={e.eventId + e.endsAt}
                className={`event-badge ${e.positive ? 'positive' : 'negative'}`}
              >
                {e.icon} {e.name}: {e.description} ({Math.ceil((e.endsAt - now) / 1000)}s)
              </span>
            ))}
        </div>
      )}

      {/* ── Center: Tap Arena */}
      <div className="tap-arena" onClick={handleTap}>
        <div className={`tap-circle ${tapFlash ? 'flash' : ''}`}>
          <span className="tap-emoji">💪</span>
          <span className="tap-label">TAP!</span>
        </div>
      </div>

      {/* ── Tab switcher */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'upgrades' ? 'active' : ''}`}
          onClick={() => setActiveTab('upgrades')}
        >
          📈 Upgrades
        </button>
        <button
          className={`tab-btn ${activeTab === 'powerups' ? 'active' : ''}`}
          onClick={() => setActiveTab('powerups')}
        >
          ⚡ Power‑ups
        </button>
        <button
          className={`tab-btn ${activeTab === 'lore' ? 'active' : ''}`}
          onClick={() => setActiveTab('lore')}
        >
          📜 Lore
        </button>
      </div>

      {/* ── Scrollable cards */}
      <div className="card-area">
        {activeTab === 'upgrades' && (
          <div className="card-list">
            {GENERATORS.map((g) => {
              const owned = generators[g.id] ?? 0;
              const maxed = owned >= MAX_OWNED;
              const cost = generatorCost(g, owned);
              const canAfford = momentum >= cost && !maxed;
              const typeLabel = g.type === 'autoTap'
                ? `+${g.valuePerUnit}/s auto`
                : `+${g.valuePerUnit}× tap`;
              return (
                <button
                  key={g.id}
                  className={`card ${canAfford ? 'afford' : ''} ${maxed ? 'maxed' : ''}`}
                  onClick={() => buyGenerator(g.id)}
                  disabled={!canAfford}
                >
                  <div className="card-icon">{g.icon}</div>
                  <div className="card-info">
                    <div className="card-name">
                      {g.name}
                      <span className="card-type-badge">{g.type === 'autoTap' ? '🤖' : '✊'}</span>
                    </div>
                    <div className="card-desc">{owned > 0 ? `"${getFlavorText(g, owned)}"` : g.flavorTexts[0]}</div>
                    <div className="card-stats">
                      {typeLabel} · {owned}/{MAX_OWNED}
                    </div>
                  </div>
                  <div className="card-price">
                    {maxed ? (
                      <span className="card-maxed-label">MAX</span>
                    ) : (
                      <>
                        <span className="card-cost">{fmt(cost)}</span>
                        <span className="card-cost-label">⚡</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'powerups' && (
          <div className="card-list">
            {POWERUPS.map((p) => {
              const isActive = buffs.some(
                (b) => b.powerupId === p.id && now < b.endsAt,
              );
              const remaining = isActive
                ? Math.ceil(
                    (buffs.find((b) => b.powerupId === p.id && now < b.endsAt)!
                      .endsAt - now) / 1000,
                  )
                : 0;
              const canAfford = momentum >= p.cost;
              return (
                <button
                  key={p.id}
                  className={`card ${isActive ? 'active-card' : ''} ${canAfford && !isActive ? 'afford' : ''}`}
                  onClick={() => activatePowerup(p.id)}
                  disabled={isActive || !canAfford}
                >
                  <div className="card-icon">{p.icon}</div>
                  <div className="card-info">
                    <div className="card-name">
                      {p.name}
                      {isActive && (
                        <span className="active-timer"> ({remaining}s)</span>
                      )}
                    </div>
                    <div className="card-desc">{p.description}</div>
                  </div>
                  <div className="card-price">
                    <span className="card-cost">{fmt(p.cost)}</span>
                    <span className="card-cost-label">⚡</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'lore' && (
          <div className="lore-panel">
            <p className="lore-intro">Milestones unlocked as you level up each upgrade:</p>
            {GENERATORS.map((g) => {
              const owned = generators[g.id] ?? 0;
              const unlocked = g.flavorTexts.slice(0, Math.max(owned, 0));
              return (
                <div key={g.id} className="lore-section">
                  <h4 className="lore-title">
                    {g.icon} {g.name}
                    <span className="lore-count"> ({unlocked.length}/{g.flavorTexts.length})</span>
                  </h4>
                  {unlocked.length === 0 ? (
                    <p className="lore-locked">Buy your first {g.name} to unlock lore!</p>
                  ) : (
                    <ol className="lore-list">
                      {unlocked.map((text, i) => (
                        <li key={i} className="lore-item">
                          <span className="lore-num">{i + 1}.</span> {text}
                        </li>
                      ))}
                      {owned < g.flavorTexts.length && (
                        <li className="lore-item lore-next">
                          <span className="lore-num">{owned + 1}.</span> ???
                        </li>
                      )}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Page ────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL as string || '/api';

function AdminPage() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem('thegrind_admin_key') || '');
  const [authed, setAuthed] = useState(false);
  const [scores, setScores] = useState<{ name: string; score: number; deviceId: string; createdAt: string }[]>([]);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [deadlineInput, setDeadlineInput] = useState('');
  const [currentDeadline, setCurrentDeadline] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const fetchScores = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/scores?key=${encodeURIComponent(adminKey)}`);
      if (!res.ok) {
        setStatus('❌ Invalid admin key');
        return false;
      }
      const data = await res.json();
      setScores(data.scores || []);
      setTotalSubmissions(data.totalSubmissions || 0);
      setAuthed(true);
      localStorage.setItem('thegrind_admin_key', adminKey);
      return true;
    } catch {
      setStatus('❌ Failed to fetch scores');
      return false;
    }
  };

  const fetchCurrentConfig = async () => {
    try {
      const cfg = await fetchConfig();
      setCurrentDeadline(cfg.deadlineUtc);
      if (cfg.deadlineUtc) {
        // Pre-fill with Pacific datetime (DST-aware)
        const d = new Date(cfg.deadlineUtc);
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Los_Angeles',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        });
        const pp: Record<string, string> = {};
        for (const p of fmt.formatToParts(d)) {
          if (['year', 'month', 'day', 'hour', 'minute'].includes(p.type)) {
            pp[p.type] = p.value;
          }
        }
        const h = pp.hour === '24' ? '00' : pp.hour;
        setDeadlineInput(`${pp.year}-${pp.month}-${pp.day}T${h}:${pp.minute}`);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchScores().then((ok) => {
        if (ok) fetchCurrentConfig();
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAuth = async () => {
    const ok = await fetchScores();
    if (ok) await fetchCurrentConfig();
  };

  const handleSetDeadline = async () => {
    if (!deadlineInput) return;
    setStatus('Setting deadline...');
    try {
      // Input is in Pacific time — convert to UTC (DST-aware)
      // Parse raw components to avoid browser-local timezone interference
      const [y, mo, d, h, mi] = deadlineInput.split(/[-T:]/).map(Number);
      const asUtcMs = Date.UTC(y, mo - 1, d, h, mi);

      // Probe the Pacific offset for this date using Intl
      const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      });
      const pp: Record<string, number> = {};
      for (const p of fmt.formatToParts(new Date(asUtcMs))) {
        if (['year', 'month', 'day', 'hour', 'minute'].includes(p.type)) {
          pp[p.type] = parseInt(p.value);
        }
      }
      const pacAsUtcMs = Date.UTC(
        pp.year, pp.month - 1, pp.day,
        pp.hour === 24 ? 0 : pp.hour, pp.minute,
      );
      // Offset = difference when the same UTC instant is viewed in Pacific
      const offsetMs = asUtcMs - pacAsUtcMs;
      const utcDate = new Date(asUtcMs + offsetMs);

      const res = await fetch(`${API_BASE}/admin/config?key=${encodeURIComponent(adminKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadlineUtc: utcDate.toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCurrentDeadline(data.deadlineUtc);
      setStatus('✅ Deadline set!');
    } catch {
      setStatus('❌ Failed to set deadline');
    }
  };

  const handleReset = async () => {
    if (!confirm('⚠️ DELETE ALL SCORES? This cannot be undone!')) return;
    setStatus('Resetting...');
    try {
      const res = await fetch(`${API_BASE}/admin/scores?key=${encodeURIComponent(adminKey)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus(`✅ Deleted ${data.deletedCount} scores`);
      setScores([]);
      setTotalSubmissions(0);
    } catch {
      setStatus('❌ Failed to reset');
    }
  };

  const handleRefresh = () => {
    fetchScores();
  };

  if (!authed) {
    return (
      <div className="screen admin-screen">
        <h1>🔐 Admin</h1>
        <div className="admin-auth">
          <input
            type="password"
            placeholder="Admin key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
          />
          <button className="btn btn-start" onClick={handleAuth}>
            Login
          </button>
        </div>
        {status && <p className="admin-status">{status}</p>}
        <button className="btn btn-secondary" onClick={() => (window.location.hash = '')}>
          ← Back to Game
        </button>
      </div>
    );
  }

  const deadlineDisplay = currentDeadline
    ? new Date(currentDeadline).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      })
    : 'Not set';

  return (
    <div className="screen admin-screen">
      <h1>🔐 Admin Panel</h1>

      {/* ── Deadline config */}
      <div className="admin-section">
        <h3>⏰ Event Deadline</h3>
        <p className="admin-info">Current: <strong>{deadlineDisplay}</strong></p>
        <div className="admin-row">
          <label className="admin-label">Set deadline (Pacific time):</label>
          <input
            type="datetime-local"
            value={deadlineInput}
            onChange={(e) => setDeadlineInput(e.target.value)}
            className="admin-input"
          />
          <button className="btn btn-start" onClick={handleSetDeadline}>
            Set
          </button>
        </div>
      </div>

      {/* ── Scores */}
      <div className="admin-section">
        <h3>🏆 All Scores ({totalSubmissions} total)</h3>
        <div className="admin-actions">
          <button className="btn btn-secondary" onClick={handleRefresh}>
            🔄 Refresh
          </button>
          <button className="btn btn-danger" onClick={handleReset}>
            🗑️ Reset All Data
          </button>
        </div>
        <div className="admin-scores-table">
          <div className="admin-table-header">
            <span>#</span>
            <span>Name</span>
            <span>Score</span>
            <span>Device</span>
          </div>
          {scores.map((s, i) => (
            <div key={i} className="admin-table-row">
              <span>{i + 1}</span>
              <span>{s.name}</span>
              <span className="lb-score">{fmt(s.score)}</span>
              <span className="admin-device">{s.deviceId?.slice(0, 8) ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {status && <p className="admin-status">{status}</p>}

      <button className="btn btn-secondary" onClick={() => (window.location.hash = '')}>
        ← Back to Game
      </button>
    </div>
  );
}

// ─── App ───────────────────────────────────────────────────────

export default function App() {
  const runStatus = useGameStore((s) => s.runStatus);
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (hash === '#admin') return <AdminPage />;
  if (runStatus === 'idle') return <StartScreen />;
  if (runStatus === 'finished') return <RunCompleteScreen />;
  return <GameScreen />;
}
