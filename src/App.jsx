import { useState, useEffect, useCallback, useRef } from "react";

// ─── RESPONSIVE HOOK ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h, { passive: true });
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Admin password is read from Vite env variable `VITE_ADMIN_PASSWORD`.
// For security, do NOT hardcode secrets in source. Provide a `.env` file instead.
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || "";
// Registration link URL — set in .env as VITE_REGISTRATION_FORM_URL
const REGISTRATION_FORM_URL = import.meta.env.VITE_REGISTRATION_FORM_URL || "";
// Set VITE_REGISTRATION_LOCKED=true in .env to hide the registration button entirely on all public screens
const REGISTRATION_LOCKED_DEFAULT = import.meta.env.VITE_REGISTRATION_LOCKED === "true";
const BASE_POINTS = [12, 10, 8, 6, 4, 2, 1, 0];          // Games 1–3
const GAME4_BASE_POINTS = [12, 10, 8, 6, 4, 0, 0, 0];   // Game 4: only top 5 score
const GAME_MULTIPLIERS = { 1: 1, 2: 1, 3: 2, 4: 1 };
const MAX_TEAMS = 8;
const STORAGE_KEY = "quiplash_v4";

const ALL_PHASES = [
  { id: "pregame", label: "Pre-Game", step: 0, game: null, type: "setup" },
  { id: "draft_1", label: "Game 1 — Draft", step: 1, game: 1, type: "draft" },
  { id: "game_1", label: "Game 1 — Playing", step: 2, game: 1, type: "game" },
  { id: "results_1", label: "Game 1 — Results", step: 3, game: 1, type: "results" },
  { id: "draft_2", label: "Game 2 — Draft", step: 4, game: 2, type: "draft" },
  { id: "game_2", label: "Game 2 — Playing", step: 5, game: 2, type: "game" },
  { id: "results_2", label: "Game 2 — Results", step: 6, game: 2, type: "results" },
  { id: "draft_3", label: "Game 3 — Draft", step: 7, game: 3, type: "draft" },
  { id: "game_3", label: "Game 3 — Playing", step: 8, game: 3, type: "game" },
  { id: "results_3", label: "Game 3 — Results", step: 9, game: 3, type: "results" },
  { id: "draft_4", label: "Game 4 — Draft", step: 10, game: 4, type: "draft" },
  { id: "game_4", label: "Game 4 — Playing", step: 11, game: 4, type: "game" },
  { id: "results_4", label: "Game 4 — Results", step: 12, game: 4, type: "results" },
  { id: "podium", label: "Podium", step: 13, game: null, type: "podium" },
];
// PHASES is derived at runtime — Game 4 phases are filtered out when game4Enabled is false.
// Use getPhases(state) instead of PHASES directly in components that need the filtered list.
const PHASES = ALL_PHASES; // kept for phaseOf() lookup (all IDs must resolve)
function getPhases(state) {
  if (state?.game4Enabled) return ALL_PHASES;
  return ALL_PHASES.filter(p => p.game !== 4);
}

const LIGHT = { bg: "#f5f6f8", surface: "#ffffff", border: "#e2e4e9", text: "#111827", sub: "#6b7280", accent: "#e63946", accent2: "#457b9d", isDark: false };
const DARK = { bg: "#0f0f14", surface: "#17171f", border: "#272736", text: "#f1f1f5", sub: "#8b8ba8", accent: "#f7c948", accent2: "#ff6b35", isDark: true };

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const ICONS = {
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  minus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  drag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="7" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="7" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="17" r="1"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  medal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  ban: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  save: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  external: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`,
  discord: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
};

function Ico({ name, size = 16, color, style: sx = {} }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0, color: color || "currentColor", ...sx }}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }}
    />
  );
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
function mkTeam(id) {
  return {
    id, name: `Team ${id}`, playerName: "", coachName: "",
    teamLogo: null, playerAvatar: null, coachAvatar: null,
    quote: "",           // team motto/quote
    playerQuote: "",     // driver personal quote
    coachQuote: "",      // coach personal quote
    description: "",     // team description/bio
    strikes: [0, 0, 0, 0],       // per-game, reset each game
    bonusPoints: [0, 0, 0, 0],   // meta wins per game
    placements: [null, null, null, null],
    dnf: [false, false, false, false],
  };
}

function mkDefault() {
  return {
    tournamentName: "Competitive Quiplash Championship",
    tournamentLogo: null,
    isDark: true,
    accent: "#f7c948",
    accent2: "#ff6b35",
    teams: Array.from({ length: MAX_TEAMS }, (_, i) => mkTeam(i + 1)),
    currentPhase: "pregame",
    currentGame: 1,
    words: {
      1: { pool: [], banned: [], assignments: {} },
      2: { pool: [], banned: [], assignments: {} },
      3: { pool: [], banned: [], assignments: {} },
      4: { pool: [], banned: [], assignments: {} },
    },
    completedGames: [],
    banSystem: "original", // "original" | "new"
    registrationLocked: REGISTRATION_LOCKED_DEFAULT,
    game4Enabled: false,
  };
}

// ─── SCORING ─────────────────────────────────────────────────────────────────
function buildEffPlacements(orderedIds, dnfSet) {
  const r = {}; let idx = 0;
  for (const id of orderedIds) {
    if (dnfSet.has(id)) r[id] = null;
    else { r[id] = idx; idx++; }
  }
  return r;
}

function gameScore(team, gi) {
  if (team.dnf[gi]) return 0;
  const p = team.placements[gi];
  if (p === null || p === undefined) return 0;
  const pts = gi === 3 ? (GAME4_BASE_POINTS[p] ?? 0) : (BASE_POINTS[p] ?? 0);
  return pts * GAME_MULTIPLIERS[gi + 1];
}

function strikeDed(s) {
  if (s >= 3) return 0; // DNF handled separately
  if (s >= 2) return -6;
  if (s >= 1) return -2;
  return 0;
}

function teamTotal(tm, numGames = 4) {
  let tot = 0;
  for (let g = 0; g < numGames; g++) {
    tot += gameScore(tm, g);
    tot += tm.bonusPoints?.[g] || 0;
    tot += strikeDed(tm.strikes?.[g] || 0);
  }
  return Math.max(0, tot);
}

function teamBonus(tm) { return (tm.bonusPoints || [0, 0, 0, 0]).reduce((a, b) => a + b, 0); }

function rankTeams(teams) {
  return [...teams].sort((a, b) => {
    const d = teamTotal(b) - teamTotal(a);
    return d !== 0 ? d : teamBonus(b) - teamBonus(a);
  });
}

function phaseOf(id) { return ALL_PHASES.find(p => p.id === id) || ALL_PHASES[0]; }

// ─── STORAGE + SYNC (Supabase Realtime) ──────────────────────────────────────
// Requires env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// Falls back to localStorage if env vars are missing (local dev)
//
// Supabase table setup (run once in SQL editor):
//   CREATE TABLE tournament_state (
//     id TEXT PRIMARY KEY DEFAULT 'main',
//     state JSONB NOT NULL,
//     updated_at TIMESTAMPTZ DEFAULT NOW()
//   );
//   ALTER TABLE tournament_state REPLICA IDENTITY FULL;
//   INSERT INTO tournament_state (id, state) VALUES ('main', '{}');

const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const USE_SUPABASE = !!(SB_URL && SB_KEY);

// ─── Supabase REST helpers (no SDK needed, plain fetch) ───────────────────────
function sbHeaders(extra = {}) {
  return {
    "apikey": SB_KEY,
    "Authorization": `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function sbRead() {
  const r = await fetch(
    `${SB_URL}/rest/v1/tournament_state?id=eq.main&select=state`,
    { headers: sbHeaders({ "Accept": "application/json" }), cache: "no-store" }
  );
  if (!r.ok) throw new Error("Supabase read failed");
  const rows = await r.json();
  if (!rows.length) throw new Error("No state row found");
  return rows[0].state;
}

async function sbWrite(state) {
  await fetch(`${SB_URL}/rest/v1/tournament_state?id=eq.main`, {
    method: "PATCH",
    headers: sbHeaders({ "Prefer": "return=minimal" }),
    body: JSON.stringify({ state, updated_at: new Date().toISOString() }),
  });
}

// ─── Supabase Realtime subscription (WebSocket) ───────────────────────────────
// Returns an unsubscribe function.
function sbSubscribe(onUpdate) {
  if (!USE_SUPABASE) return () => { };

  // Supabase Realtime uses a WebSocket endpoint
  const wsUrl = SB_URL.replace("https://", "wss://").replace("http://", "ws://");
  const url = `${wsUrl}/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`;

  let ws;
  let dead = false;
  let heartbeat;

  function connect() {
    if (dead) return;
    ws = new WebSocket(url);

    ws.onopen = () => {
      // Join the realtime channel for our table
      ws.send(JSON.stringify({
        topic: "realtime:public:tournament_state",
        event: "phx_join",
        payload: {
          config: {
            broadcast: { self: false },
            presence: { key: "" },
            postgres_changes: [{
              event: "*",
              schema: "public",
              table: "tournament_state",
              filter: "id=eq.main",
            }],
          },
        },
        ref: "1",
      }));

      // Heartbeat every 30s to keep connection alive
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" }));
      }, 30000);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        // Postgres change event carries the new row in payload.data.record
        if (
          msg.event === "postgres_changes" &&
          msg.payload?.data?.record?.state
        ) {
          onUpdate(msg.payload.data.record.state);
        }
      } catch { }
    };

    ws.onclose = () => {
      clearInterval(heartbeat);
      // Auto-reconnect after 2s if not intentionally closed
      if (!dead) setTimeout(connect, 2000);
    };

    ws.onerror = () => { try { ws.close(); } catch { } };
  }

  connect();

  return () => {
    dead = true;
    clearInterval(heartbeat);
    try { ws?.close(); } catch { }
  };
}

function merge(base, over) {
  const r = { ...base };
  for (const k of Object.keys(over)) {
    if (over[k] !== null && typeof over[k] === "object" && !Array.isArray(over[k]))
      r[k] = merge(base[k] || {}, over[k]);
    else r[k] = over[k];
  }
  return r;
}

// BroadcastChannel: instant cross-tab sync within the same browser (supplements Supabase)
const BC_NAME = "fq_state_v4";

// ─── ADMIN STORE ──────────────────────────────────────────────────────────────
// Loads latest state on mount, writes to Supabase on every change.
// Never listens for realtime updates (admin is the source of truth).
function useAdminStore() {
  const [state, setRaw] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return merge(mkDefault(), JSON.parse(raw));
    } catch { }
    return mkDefault();
  });

  // Load latest from Supabase on mount
  useEffect(() => {
    if (!USE_SUPABASE) return;
    sbRead().then(remote => {
      const merged = merge(mkDefault(), remote);
      setRaw(merged);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { }
    }).catch(() => { });
  }, []);

  const setState = useCallback((fn) => {
    setRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      // 1. Update localStorage immediately (instant local feedback)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { }
      // 2. Broadcast to other tabs in same browser via BroadcastChannel (instant, no server)
      try { new BroadcastChannel(BC_NAME).postMessage(next); } catch { }
      // 3. Write to Supabase — triggers Realtime event on all public screens
      if (USE_SUPABASE) sbWrite(next).catch(() => { });
      return next;
    });
  }, []);

  return [state, setState];
}

// ─── PUBLIC STORE ─────────────────────────────────────────────────────────────
// Loads latest state on mount, then receives instant Realtime pushes from Supabase.
// Zero polling — WebSocket delivers changes the moment admin writes.
function usePublicStore() {
  const [state, setRaw] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return merge(mkDefault(), JSON.parse(raw));
    } catch { }
    return mkDefault();
  });

  // Load latest from Supabase on mount
  useEffect(() => {
    if (!USE_SUPABASE) return;
    sbRead().then(remote => {
      setRaw(merge(mkDefault(), remote));
    }).catch(() => { });
  }, []);

  // Subscribe to Realtime — instant updates whenever admin writes
  useEffect(() => {
    const unsub = sbSubscribe((record) => {
      setRaw(merge(mkDefault(), record));
    });
    return unsub;
  }, []);

  // BroadcastChannel: instant update when admin writes in the same browser (always active)
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = (e) => {
        if (e.data) setRaw(merge(mkDefault(), e.data));
      };
    } catch { }
    return () => { try { bc?.close(); } catch { } };
  }, []);

  // localStorage fallback for local dev (no Supabase)
  useEffect(() => {
    if (USE_SUPABASE) return;
    const h = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setRaw(merge(mkDefault(), JSON.parse(e.newValue))); } catch { }
      }
    };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);

  return state;
}

async function toDataURL(file) {
  return new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
}

function getTheme(state) {
  const base = state.isDark ? { ...DARK } : { ...LIGHT };
  if (state.accent) base.accent = state.accent;
  if (state.accent2) base.accent2 = state.accent2;
  return base;
}

// ─── STYLE UTILS ──────────────────────────────────────────────────────────────
const iSt = (t, ex = {}) => ({ background: t.isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)", border: `1px solid ${t.border}`, borderRadius: 8, padding: "8px 11px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box", ...ex });
const bSt = (bg, color, ex = {}) => ({ background: bg, color, border: "none", borderRadius: 8, padding: "7px 14px", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, ...ex });
const cSt = (t, ex = {}) => ({ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, ...ex });
const Lbl = ({ t, children }) => <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", marginBottom: 4 }}>{children}</div>;

// ─── AVATAR ───────────────────────────────────────────────────────────────────
function Av({ src, name, size = 36, round = false }) {
  const ini = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const br = round ? "50%" : 8;
  if (src && src.length > 10)
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: br, objectFit: "cover", flexShrink: 0 }} />;
  return <div style={{ width: size, height: size, borderRadius: br, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .35, fontWeight: 700, color: "#fff", flexShrink: 0, userSelect: "none" }}>{ini}</div>;
}

function ImgPicker({ t, src, onChange, label, size = 50, round = false }) {
  const ref = useRef();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div onClick={() => ref.current.click()} style={{ cursor: "pointer", position: "relative" }}>
        <Av src={src} name={label} size={size} round={round} />
        <div style={{ position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: t.isDark ? "#111" : "#fff" }}>
          <Ico name="camera" size={10} />
        </div>
      </div>
      <span style={{ fontSize: 10, color: t.sub, textAlign: "center" }}>{label}</span>
      <input ref={ref} type="file" accept="image/*" onChange={async e => { const f = e.target.files[0]; if (f) onChange(await toDataURL(f)); }} style={{ display: "none" }} />
    </div>
  );
}

function StrikePips({ count, size = 9 }) {
  return <div style={{ display: "flex", gap: 3 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: size, height: size, borderRadius: "50%", background: i < count ? "#ef4444" : "rgba(128,128,128,.2)", transition: "background .15s" }} />)}</div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login({ t, onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const [shk, setShk] = useState(false);
  const go = () => { if (pw === ADMIN_PASSWORD) { onLogin(); } else { setErr(true); setShk(true); setTimeout(() => setShk(false), 450); } };
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: t.bg }}>
      <div style={{ ...cSt(t, { padding: 40, width: 320, textAlign: "center" }), animation: shk ? "shake .4s" : "" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: t.accent + "22", border: `1px solid ${t.accent}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: t.accent }}>
          <Ico name="lock" size={22} />
        </div>
        <h2 style={{ margin: "0 0 4px", color: t.text, fontSize: 20, fontWeight: 800 }}>Admin Access</h2>
        <p style={{ margin: "0 0 24px", color: t.sub, fontSize: 13 }}>Quiplash Tournament</p>
        <input type="password" placeholder="Password" value={pw}
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && go()}
          style={{ ...iSt(t, { textAlign: "center", marginBottom: err ? 6 : 12, border: `1px solid ${err ? "#ef4444" : t.border}` }) }}
        />
        {err && <p style={{ margin: "0 0 10px", color: "#ef4444", fontSize: 12 }}>Wrong password</p>}
        <button onClick={go} style={{ ...bSt(t.accent, t.isDark ? "#111" : "#fff", { width: "100%", justifyContent: "center", padding: "10px", fontSize: 14 }) }}>Enter</button>
      </div>
    </div>
  );
}

// ─── PRE-GAME PUBLIC ─────────────────────────────────────────────────────────
function PreGamePublic({ state, t }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px" }}>
      {state.tournamentLogo && <img src={state.tournamentLogo} alt="" style={{ height: 64, objectFit: "contain", marginBottom: 16 }} />}
      <h1 style={{ margin: "0 0 6px", fontSize: "clamp(22px,5vw,52px)", fontWeight: 800, color: t.text, textAlign: "center", letterSpacing: -1 }}>{state.tournamentName}</h1>
      <p style={{ margin: "0 0 40px", fontSize: 15, color: t.sub, fontWeight: 500, textAlign: "center", letterSpacing: 2, textTransform: "uppercase" }}>Participating Teams</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 14, width: "100%", maxWidth: 900 }}>
        {state.teams.map(tm => (
          <div key={tm.id} onClick={() => setSelectedTeam(tm)}
            style={{ ...cSt(t, { padding: 22, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer" }) }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${t.isDark ? "rgba(0,0,0,.5)" : "rgba(0,0,0,.12)"}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "" }}
          >
            <Av src={tm.teamLogo} name={tm.name} size={70} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: t.text }}>{tm.name}</div>
              {tm.playerName && <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{tm.playerName}</div>}
              {tm.coachName && <div style={{ fontSize: 11, color: t.sub, opacity: .7 }}>{tm.coachName}</div>}
            </div>
            {(tm.playerAvatar || tm.coachAvatar) && (
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {tm.playerAvatar && <Av src={tm.playerAvatar} name={tm.playerName} size={30} round />}
                {tm.coachAvatar && <Av src={tm.coachAvatar} name={tm.coachName} size={30} round />}
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedTeam && (
        <div onClick={() => setSelectedTeam(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cSt(t, { maxWidth: 580, width: "100%", overflow: "hidden", position: "relative" }) }}>
            {/* Header band */}
            <div style={{ padding: "24px 24px 20px", borderBottom: `1px solid ${t.border}`, display: "flex", gap: 16, alignItems: "center" }}>
              <Av src={selectedTeam.teamLogo} name={selectedTeam.name} size={72} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: t.text, lineHeight: 1.1 }}>{selectedTeam.name}</div>
                {selectedTeam.description && <div style={{ fontSize: 13, color: t.sub, marginTop: 5, lineHeight: 1.5 }}>{selectedTeam.description}</div>}
                {selectedTeam.quote && (
                  <div style={{ marginTop: 8, fontSize: 12, fontStyle: "italic", color: t.accent, borderLeft: `2px solid ${t.accent}`, paddingLeft: 8 }}>
                    "{selectedTeam.quote}"
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedTeam(null)} style={{ position: "absolute", top: 12, right: 12, background: t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", border: "none", cursor: "pointer", color: t.sub, padding: 6, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico name="x" size={16} />
              </button>
            </div>
            {/* Driver + Coach landscape cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <div style={{ padding: "18px 20px", borderRight: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.sub, textTransform: "uppercase", marginBottom: 10 }}>Driver</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <Av src={selectedTeam.playerAvatar} name={selectedTeam.playerName || "Driver"} size={48} round />
                  <div style={{ fontWeight: 800, fontSize: 16, color: t.text }}>{selectedTeam.playerName || "—"}</div>
                </div>
                {selectedTeam.playerQuote && (
                  <div style={{ fontSize: 12, fontStyle: "italic", color: t.sub, lineHeight: 1.5, padding: "8px 10px", borderRadius: 8, background: t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)", border: `1px solid ${t.border}` }}>
                    "{selectedTeam.playerQuote}"
                  </div>
                )}
              </div>
              <div style={{ padding: "18px 20px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: t.sub, textTransform: "uppercase", marginBottom: 10 }}>Coach</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                  <Av src={selectedTeam.coachAvatar} name={selectedTeam.coachName || "Coach"} size={48} round />
                  <div style={{ fontWeight: 800, fontSize: 16, color: t.text }}>{selectedTeam.coachName || "—"}</div>
                </div>
                {selectedTeam.coachQuote && (
                  <div style={{ fontSize: 12, fontStyle: "italic", color: t.sub, lineHeight: 1.5, padding: "8px 10px", borderRadius: 8, background: t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)", border: `1px solid ${t.border}` }}>
                    "{selectedTeam.coachQuote}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESULTS PUBLIC ─────────────────────────────────────────────────────────────
function ResultsPublic({ state, t, phase }) {
  const gn = phase.game;
  const [showCoach, setShowCoach] = useState(false);
  const getPhaseStats = (tm) => {
    let tot = 0, bon = 0, allS = 0;
    for (let g = 0; g < gn; g++) {
      tot += gameScore(tm, g) + (tm.bonusPoints?.[g] || 0) + strikeDed(tm.strikes?.[g] || 0);
      bon += tm.bonusPoints?.[g] || 0;
      allS += tm.strikes?.[g] || 0;
    }
    return { tot: Math.max(0, tot), bon, allS };
  };
  const ranked = [...state.teams].sort((a, b) => {
    const sA = getPhaseStats(a), sB = getPhaseStats(b);
    if (sB.tot !== sA.tot) return sB.tot - sA.tot;
    return sB.bon - sA.bon;
  });
  const medalColor = ["#f7c948", "#b0b0b0", "#cd7f32"];
  const pt = t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)";
  const completedGames = Array.from({ length: gn }, (_, i) => i);
  return (
    <div style={{ maxWidth: 860, margin: "0 auto 40px", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28, paddingTop: 8 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 20px", borderRadius: 20, background: t.accent + "18", border: `1px solid ${t.accent}44`, marginBottom: 12 }}>
          <Ico name="trophy" size={16} color={t.accent} />
          <span style={{ fontWeight: 800, fontSize: 14, color: t.accent, letterSpacing: .5 }}>GAME {gn} — OFFICIAL RESULTS</span>
        </div>
        <div style={{ fontSize: 13, color: t.sub, marginBottom: 14 }}>Standings after {gn} game{gn > 1 ? "s" : ""} · Points accumulate across all games</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          <button onClick={() => setShowCoach(false)} style={bSt(!showCoach ? t.accent : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", !showCoach ? (t.isDark ? "#111" : "#fff") : t.text, { padding: "6px 16px", fontSize: 12 })}>
            <Ico name="trophy" size={13} /> Championship
          </button>
          <button onClick={() => setShowCoach(true)} style={bSt(showCoach ? (t.accent2 || "#8b5cf6") : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", showCoach ? (t.isDark ? "#111" : "#fff") : t.text, { padding: "6px 16px", fontSize: 12 })}>
            <Ico name="star" size={13} /> Coach Cup
          </button>
        </div>
      </div>
      {!showCoach ? (
        <>
          <div style={cSt(t, { padding: 0, overflow: "hidden", marginBottom: 16 })}>
            {/* Header row */}
            <div style={{ display: "grid", gridTemplateColumns: `44px 1fr ${completedGames.map(() => "56px").join(" ")} 80px 72px 72px`, gap: 8, padding: "10px 16px", borderBottom: `1px solid ${t.border}`, fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase" }}>
              <div>#</div><div>Team</div>
              {completedGames.map(gi => <div key={gi} style={{ textAlign: "center" }}>G{gi + 1}{gi === 2 ? " ×2" : ""}</div>)}
              <div style={{ textAlign: "center" }}>Bonus</div>
              <div style={{ textAlign: "center" }}>Strikes</div>
              <div style={{ textAlign: "right" }}>Total</div>
            </div>
            {/* Team rows */}
            {ranked.map((tm, i) => {
              const stats = getPhaseStats(tm);
              const total = stats.tot;
              const bonus = stats.bon;
              const totalStrikes = stats.allS;
              const isTop3 = i < 3;
              return (
                <div key={tm.id} style={{ display: "grid", gridTemplateColumns: `44px 1fr ${completedGames.map(() => "56px").join(" ")} 80px 72px 72px`, gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, alignItems: "center", background: i === 0 ? t.accent + "10" : i % 2 === 0 ? pt : "transparent" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {isTop3 ? <Ico name="medal" size={20} color={medalColor[i]} /> : <span style={{ fontWeight: 700, fontSize: 14, color: t.sub }}>{i + 1}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <Av src={tm.teamLogo} name={tm.name} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.name}</div>
                      {tm.playerName && <div style={{ fontSize: 11, color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.playerName}</div>}
                    </div>
                  </div>
                  {completedGames.map(gi => {
                    const gs = gameScore(tm, gi);
                    const sd = strikeDed(tm.strikes?.[gi] || 0);
                    const net = Math.max(0, gs + (tm.bonusPoints?.[gi] || 0) + sd);
                    const isDnf = tm.dnf?.[gi];
                    return (
                      <div key={gi} style={{ textAlign: "center" }}>
                        {isDnf
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: "#ef4444", background: "rgba(239,68,68,.12)", padding: "2px 6px", borderRadius: 6 }}>DNF</span>
                          : <span style={{ fontWeight: 700, fontSize: 15, color: gi === gn - 1 ? t.accent : t.text }}>{net > 0 ? net : tm.placements?.[gi] === null || tm.placements?.[gi] === undefined ? <span style={{ color: t.sub, fontSize: 12 }}>—</span> : net}</span>
                        }
                      </div>
                    );
                  })}
                  <div style={{ textAlign: "center", fontWeight: 800, fontSize: 16, color: bonus > 0 ? "#22c55e" : t.sub }}>{bonus > 0 ? `+${bonus}` : "0"}</div>
                  <div style={{ textAlign: "center", fontWeight: 800, fontSize: 16, color: totalStrikes > 0 ? "#ef4444" : t.sub }}>{totalStrikes}</div>
                  <div style={{ textAlign: "right", fontWeight: 900, fontSize: 20, color: i === 0 ? t.accent : t.text }}>{total}</div>
                </div>
              );
            })}
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: t.sub }}>Results are official · Formula Q Championship 2026</p>
        </>
      ) : (
        <CoachChampionshipBoard state={state} t={t} vis={true} limit={gn} />
      )}
    </div>
  );
}

// ─── DRAFT PUBLIC ─────────────────────────────────────────────────────────────
function DraftPublic({ state, t, phase }) {
  const gn = phase.game;
  const banSystem = state.banSystem || "original";
  const pool = state.words?.[1]?.pool || []; // always game 1 pool (shared)
  const banned = state.words?.[gn]?.banned || [];
  const asgn = state.words?.[gn]?.assignments || {};
  const available = pool.filter(w => !banned.includes(w));
  const ranked = gn === 1 ? state.teams : rankTeams(state.teams);
  const isNew = banSystem === "new";

  const [showPoolModal, setShowPoolModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  // For New System: show inherited bans from prior games
  const inheritedBanned = isNew && gn > 1
    ? [...new Set([...(state.words?.[1]?.banned || []), ...(gn > 2 ? (state.words?.[2]?.banned || []) : [])].filter(w => !banned.includes(w)))]
    : [];
  const allBanned = [...banned, ...inheritedBanned];

  const banLimit = isNew ? 4 : 8;
  const maxBanned = isNew ? "4 new bans this game" : "8 max";

  return (
    <div style={{ maxWidth: 960, margin: "0 auto 24px", padding: "0 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: isNew ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>

        {/* Word Pool */}
        <div style={cSt(t, { padding: 16 })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase" }}>Word Pool ({pool.length})</div>
            <button onClick={() => setShowPoolModal(true)} style={bSt(t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", t.sub, { padding: "2px 8px", fontSize: 10, borderRadius: 6 })}>
              <Ico name="plus" size={11} /> Expand
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {pool.length === 0 && <span style={{ color: t.sub, fontSize: 13 }}>No words yet</span>}
            {pool.map(w => {
              const ib = allBanned.includes(w);
              const isInherited = inheritedBanned.includes(w);
              const ia = !ib && Object.values(asgn).includes(w);
              return <span key={w} style={{
                padding: "3px 9px", borderRadius: 16, fontSize: 12, fontWeight: 600,
                background: ib ? "rgba(239,68,68,.1)" : ia ? "rgba(34,197,94,.1)" : t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)",
                color: ib ? "#ef4444" : ia ? "#22c55e" : t.text,
                textDecoration: ib ? "line-through" : "none",
                border: `1px solid ${ib ? "rgba(239,68,68,.25)" : ia ? "rgba(34,197,94,.25)" : t.border}`,
                opacity: isInherited ? .7 : 1
              }}>{w}</span>;
            })}
          </div>
        </div>

        {/* Banned Words */}
        <div style={cSt(t, { padding: 16, borderColor: "rgba(239,68,68,.3)" })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: .5, color: "#ef4444", textTransform: "uppercase" }}>
              <Ico name="ban" size={12} color="#ef4444" /> Banned ({allBanned.length})
            </div>
            <button onClick={() => setShowBanModal(true)} style={bSt("rgba(239,68,68,.1)", "#ef4444", { padding: "2px 8px", fontSize: 10, borderRadius: 6 })}>
              <Ico name="plus" size={11} /> Expand
            </button>
          </div>
          {isNew && inheritedBanned.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 4 }}>Carried Over</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {inheritedBanned.map(w => <span key={w} style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,.06)", color: "rgba(239,68,68,.6)", border: "1px solid rgba(239,68,68,.15)", textDecoration: "line-through" }}>{w}</span>)}
              </div>
            </div>
          )}
          {isNew && banned.length > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 4 }}>New This Game</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {banned.length === 0 && inheritedBanned.length === 0 && <span style={{ color: t.sub, fontSize: 13 }}>None banned</span>}
            {banned.map(w => <span key={w} style={{ padding: "3px 9px", borderRadius: 16, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.25)" }}>{w}</span>)}
          </div>
        </div>

        {/* Meta Draft — Original system only */}
        {!isNew && (
          <div style={cSt(t, { padding: 16 })}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", marginBottom: 10 }}>
              <Ico name="star" size={12} color="#f59e0b" /> Meta Draft
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {ranked.map((tm, i) => {
                const word = Object.entries(asgn).find(([id]) => Number(id) === tm.id)?.[1];
                return (
                  <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: t.sub, width: 14 }}>{i + 1}</span>
                    <Av src={tm.teamLogo} name={tm.name} size={18} />
                    <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.text }}>{tm.name}</span>
                    {word ? <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,.1)", padding: "2px 7px", borderRadius: 10 }}>{word}</span> : <span style={{ fontSize: 11, color: t.sub }}>—</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pool Expand Modal */}
      {showPoolModal && (
        <div onClick={() => setShowPoolModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cSt(t, { padding: 28, maxWidth: 680, width: "100%", maxHeight: "82vh", overflow: "hidden", display: "flex", flexDirection: "column" }) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: t.text }}>Full Word Pool — Game {gn}</div>
                <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{pool.length} words · {allBanned.length} banned</div>
              </div>
              <button onClick={() => setShowPoolModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sub }}><Ico name="x" size={20} /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 8 }}>
                {pool.map(w => {
                  const ib = allBanned.includes(w);
                  const isInherited = inheritedBanned.includes(w);
                  const ia = !ib && Object.values(asgn).includes(w);
                  return (
                    <div key={w} style={{
                      padding: "10px 14px", borderRadius: 10,
                      background: ib ? "rgba(239,68,68,.1)" : ia ? "rgba(34,197,94,.1)" : t.isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)",
                      border: `1.5px solid ${ib ? "rgba(239,68,68,.35)" : ia ? "rgba(34,197,94,.3)" : t.border}`
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: ib ? "#ef4444" : ia ? "#22c55e" : t.text, textDecoration: ib ? "line-through" : "none" }}>{w}</div>
                      <div style={{ fontSize: 10, color: t.sub, marginTop: 3 }}>
                        {ib ? (isInherited ? "Carried over" : "Banned this game") : ia ? "Assigned" : "Available"}
                      </div>
                    </div>
                  );
                })}
                {pool.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: t.sub, padding: "40px 0" }}>No words in pool yet</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ban Expand Modal */}
      {showBanModal && (
        <div onClick={() => setShowBanModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cSt(t, { padding: 28, maxWidth: 560, width: "100%", maxHeight: "82vh", overflow: "hidden", display: "flex", flexDirection: "column", borderColor: "rgba(239,68,68,.3)" }) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: t.text }}>Banned Words — Game {gn}</div>
                <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{isNew ? "New System: +4 per game, stacks across games" : "Original: up to 8 banned per game"}</div>
              </div>
              <button onClick={() => setShowBanModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sub }}><Ico name="x" size={20} /></button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {isNew && inheritedBanned.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", marginBottom: 8 }}>Carried Over From Previous Games ({inheritedBanned.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {inheritedBanned.map(w => (
                      <div key={w} style={{ padding: "7px 13px", borderRadius: 10, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", textDecoration: "line-through", color: "rgba(239,68,68,.6)", fontWeight: 700, fontSize: 13 }}>{w}</div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: .5, color: "#ef4444", textTransform: "uppercase", marginBottom: 8 }}>
                  {isNew ? `Banned This Game (${banned.length}/4)` : `All Banned (${banned.length}/${banLimit})`}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {banned.map(w => (
                    <div key={w} style={{ padding: "7px 13px", borderRadius: 10, background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.3)", color: "#ef4444", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                      <Ico name="ban" size={13} color="#ef4444" />{w}
                    </div>
                  ))}
                  {banned.length === 0 && <span style={{ color: t.sub, fontSize: 13 }}>None banned yet this game</span>}
                </div>
              </div>
              {allBanned.length > 0 && (
                <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 8, background: t.isDark ? "rgba(239,68,68,.05)" : "rgba(239,68,68,.03)", border: "1px solid rgba(239,68,68,.1)" }}>
                  <span style={{ fontSize: 11, color: t.sub }}>Total banned words in effect: </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444" }}>{allBanned.length}</span>
                  <span style={{ fontSize: 11, color: t.sub }}> · Available: </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e" }}>{pool.length - allBanned.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PODIUM ───────────────────────────────────────────────────────────────────
function CoachChampionshipBoard({ state, t, vis, limit = 3 }) {
  const getTotals = (tm) => {
    let bon = 0, allS = 0;
    for (let g = 0; g < limit; g++) {
      bon += tm.bonusPoints?.[g] || 0;
      allS += tm.strikes?.[g] || 0;
    }
    return { bon, allS };
  };

  const sorted = [...state.teams].sort((a, b) => {
    const sA = getTotals(a), sB = getTotals(b);
    if (sB.bon !== sA.bon) return sB.bon - sA.bon;
    return sA.allS - sB.allS;
  });
  const rankColors = ["#f7c948", "#b0b0b0", "#cd7f32"];
  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: t.sub }}>Ranked by Meta Bonus Points · Ties broken by fewest strikes</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "36px 44px 1fr 80px 72px", gap: 10, padding: "0 16px 8px", fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", borderBottom: `1px solid ${t.border}` }}>
        <div>#</div><div></div><div>Coach</div><div style={{ textAlign: "center" }}>Bonus</div><div style={{ textAlign: "center" }}>Strikes</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
        {sorted.map((tm, i) => {
          const stats = getTotals(tm);
          const bon = stats.bon;
          const totalStrikes = stats.allS;
          const isFirst = i === 0;
          return (
            <div key={tm.id} style={{ display: "grid", gridTemplateColumns: "36px 44px 1fr 80px 72px", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: isFirst ? t.accent + "15" : t.surface, border: `1px solid ${isFirst ? t.accent + "44" : t.border}`, opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-20px)", transition: `all .5s ease ${.1 + i * .06}s` }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                {i < 3 ? <Ico name="medal" size={22} color={rankColors[i]} /> : <span style={{ fontWeight: 800, fontSize: 14, color: t.sub, textAlign: "center" }}>{i + 1}</span>}
              </div>
              <Av src={tm.coachAvatar || tm.teamLogo} name={tm.coachName || tm.name} size={40} round />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.coachName || "(No Coach)"}</div>
                <div style={{ fontSize: 11, color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>{tm.name}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: bon > 0 ? "#22c55e" : t.sub, lineHeight: 1 }}>{bon}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: totalStrikes > 0 ? "#ef4444" : t.sub, lineHeight: 1 }}>{totalStrikes}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Podium({ state, t }) {
  const ranked = rankTeams(state.teams);
  const [vis, setVis] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setVis(true), 200); return () => clearTimeout(tm); }, []);
  const trio = [{ tm: ranked[1], rank: 2, h: 200 }, { tm: ranked[0], rank: 1, h: 280 }, { tm: ranked[2], rank: 3, h: 160 }].filter(d => d.tm);
  const medalColor = ["", "#f7c948", "#b0b0b0", "#cd7f32"];
  return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      {state.tournamentLogo && <img src={state.tournamentLogo} alt="" style={{ height: 56, objectFit: "contain", marginBottom: 16, opacity: vis ? 1 : 0, transition: "opacity .8s" }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, opacity: vis ? 1 : 0, transition: "opacity .6s .1s" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(22px,5vw,52px)", fontWeight: 800, color: t.text, textAlign: "center" }}>{showCoach ? "Coach Championship" : "Final Standings"}</h1>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 32, opacity: vis ? 1 : 0, transition: "opacity .6s .2s" }}>
        <button onClick={() => setShowCoach(false)} style={bSt(!showCoach ? t.accent : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", !showCoach ? (t.isDark ? "#111" : "#fff") : t.text, { padding: "6px 16px", fontSize: 12 })}>
          <Ico name="trophy" size={13} /> Team Standings
        </button>
        <button onClick={() => setShowCoach(true)} style={bSt(showCoach ? t.accent2 : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", showCoach ? (t.isDark ? "#111" : "#fff") : t.text, { padding: "6px 16px", fontSize: 12 })}>
          <Ico name="star" size={13} /> Coach Championship
        </button>
      </div>
      {showCoach ? (
        <CoachChampionshipBoard state={state} t={t} vis={vis} />
      ) : (
        <>
          {/* Podium: alignItems flex-end so all 3 platform blocks share the same baseline */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            {trio.map(({ tm, rank, h }, i) => {
              const w = rank === 1 ? 150 : 120;
              return (
                <div key={tm.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: w, opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(60px)", transition: `all .7s cubic-bezier(.34,1.56,.64,1) ${.1 + i * .15}s` }}>
                  {/* Info above the platform */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, marginBottom: 8, width: "100%", padding: "0 4px", boxSizing: "border-box" }}>
                    <Ico name="medal" size={rank === 1 ? 32 : 22} color={medalColor[rank]} />
                    <Av src={tm.teamLogo} name={tm.name} size={rank === 1 ? 68 : 50} />
                    <div style={{ textAlign: "center", width: "100%" }}>
                      <div style={{ fontWeight: 800, fontSize: rank === 1 ? 14 : 12, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.name}</div>
                      {tm.playerName && <div style={{ fontSize: 10, color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.playerName}</div>}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: rank === 1 ? 22 : 17, color: rank === 1 ? t.accent : t.text }}>{teamTotal(tm)} pts</div>
                  </div>
                  {/* Platform block — sits at the bottom, height varies per rank */}
                  <div style={{ width: "100%", height: h, borderRadius: "10px 10px 0 0", background: rank === 1 ? t.accent + "18" : t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.04)", border: `2px solid ${rank === 1 ? t.accent : t.border}`, borderBottom: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: rank === 1 ? 64 : 48, fontWeight: 900, color: t.border, opacity: .3 }}>{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {ranked.length > 3 && (
            <div style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
              {ranked.slice(3).map((tm, i) => (
                <div key={tm.id} style={{ ...cSt(t, { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 5 }), opacity: vis ? 1 : 0, transition: `opacity .4s ease ${.6 + i * .07}s` }}>
                  <span style={{ fontWeight: 700, color: t.sub, width: 18 }}>{i + 4}</span>
                  <Av src={tm.teamLogo} name={tm.name} size={28} />
                  <span style={{ fontWeight: 600, flex: 1, color: t.text }}>{tm.name}</span>
                  <span style={{ fontWeight: 800, color: t.text }}>{teamTotal(tm)} pts</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── GAMEPLAY GUIDE ───────────────────────────────────────────────────────────
function GameplayGuide({ t }) {
  const [active, setActive] = useState(0);
  const pt = t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.04)";
  // Medal badge — must be defined before SECTIONS so JSX content can reference it
  const Medal = ({ n }) => {
    const COLORS = { 1: ["#f7c948", "#7a5c00"], 2: ["#c0c0c0", "#444"], 3: ["#cd7f32", "#5a2d00"] };
    const [bg, fg] = COLORS[n] || [t.isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.1)", t.sub];
    return (
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: bg, color: fg, fontWeight: 900, fontSize: 11, flexShrink: 0, marginRight: 6 }}>{n}</span>
    );
  };

  const SECTIONS = [
    {
      id: "format", icon: "users", label: "Teams & Format", accent: t.accent,
      content: (
        <>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: t.sub, lineHeight: 1.7 }}>16 players divided into <strong style={{ color: t.text }}>8 teams of two</strong> — a Player and a Coach — competing across 3 Games.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[["users", "Player", "Plays the game, types & submits answers.", t.accent], ["star", "Coach", "Strategizes via private call. Must be muted in the main lobby.", "#8b5cf6"]].map(([ic, ttl, desc, col]) => (
              <div key={ttl} style={{ padding: "14px 16px", borderRadius: 12, background: col + "11", border: `1px solid ${col}33` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}><div style={{ color: col }}><Ico name={ic} size={16} /></div><div style={{ fontWeight: 800, fontSize: 14, color: t.text }}>{ttl}</div></div>
                <div style={{ fontSize: 13, color: t.sub, lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 16px", borderRadius: 10, background: pt, border: `1px solid ${t.border}` }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>Tournament Flow</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {["Pre-Game", "→", "Game 1 Draft", "→", "Game 1", "→", "Game 2 Draft", "→", "Game 2", "→", "Game 3 Draft", "→", "Game 3", "→", "Podium"].map((s, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: s === "→" ? 400 : 700, color: s === "→" ? t.sub : t.text }}>{s}</span>
              ))}
            </div>
          </div>
        </>
      )
    },
    {
      id: "points", icon: "trophy", label: "Championship Points", accent: "#f7c948",
      content: (
        <>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: t.sub, lineHeight: 1.6 }}>Points from the final in-game scoreboard. <strong style={{ color: "#f7c948" }}>Game 3 is worth double.</strong></p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>{["Placement", "Game 1 & 2", "Game 3 ×2"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: h === "Placement" ? "left" : "center", fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", borderBottom: `2px solid ${t.border}` }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {[[1, "1st", "12", "24"], [2, "2nd", "10", "20"], [3, "3rd", "8", "16"], [0, "4th", "6", "12"], [0, "5th", "4", "8"], [0, "6th", "2", "4"], [0, "7th", "1", "2"], [0, "8th", "0", "0"]].map(([medal, pl, g12, g3], i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? pt : "transparent" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: t.text }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {medal ? <Medal n={medal} /> : <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: t.isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.07)", color: t.sub, fontWeight: 700, fontSize: 11, marginRight: 6 }}>{i + 1}</span>}
                      {pl}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, fontSize: 18, color: "#22c55e" }}>{g12}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, fontSize: 18, color: "#f7c948" }}>{g3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )
    },
    {
      id: "meta", icon: "ban", label: "Meta Words & Bans", accent: "#ef4444",
      content: (
        <>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: t.sub, lineHeight: 1.6 }}><strong style={{ color: t.text }}>16 Meta Words</strong> available. Using them is optional — normal answers always allowed.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>Banning Process</div>
              {[["Game 1", "4 banned", "12 active"], ["Game 2", "+4 banned", "8 active"], ["Game 3", "+4 banned", "4 active"]].map(([g, ban, act]) => (
                <div key={g} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: pt, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: t.accent, width: 52 }}>{g}</span>
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>{ban}</span>
                  <span style={{ fontSize: 11, color: t.sub, marginLeft: "auto" }}>{act}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>Strike Penalties</div>
              {[["1st", "−2 pts", "#f97316", 1], ["2nd", "−4 pts", "#ef4444", 2], ["3rd", "DNF (0 pts)", "#ef4444", 3]].map(([s, pen, col, n]) => (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: pt, marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: 3 }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < n ? col : "rgba(128,128,128,.2)" }} />)}</div>
                  <span style={{ fontWeight: 700, fontSize: 12, color: col }}>{s} Strike</span>
                  <span style={{ fontSize: 11, color: t.sub, marginLeft: "auto" }}>{pen}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.25)" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#22c55e", marginBottom: 4 }}>✦ Bonus</div>
              <div style={{ fontSize: 13, color: t.sub, lineHeight: 1.5 }}>Win a prompt with an active Meta Word → <strong style={{ color: "#22c55e" }}>+1 Bonus Point</strong></div>
            </div>
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)" }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#ef4444", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><Ico name="ban" size={13} /> Collision Rule</div>
              <div style={{ fontSize: 13, color: t.sub, lineHeight: 1.5 }}>2+ teams use the same Meta Word in one Game → <strong style={{ color: "#ef4444" }}>no bonus</strong> for anyone</div>
            </div>
          </div>
        </>
      )
    },
    {
      id: "comms", icon: "flag", label: "Communication", accent: "#3b82f6",
      content: (
        <>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: t.sub, lineHeight: 1.6 }}>Strict communication rules keep competition fair.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Main Lobby", "Only Players may speak. Coaches must remain completely muted at all times.", "#3b82f6", "users"],
              ["Prompting Phase", "Teams mute the main lobby and move to private calls to strategize with their Coach.", "#8b5cf6", "clipboard"],
              ["Voting Phase", "All teams must return to the main lobby before voting begins.", "#22c55e", "check"],
            ].map(([ttl, desc, col, ic]) => (
              <div key={ttl} style={{ display: "flex", gap: 14, padding: "16px 18px", borderRadius: 12, background: col + "11", border: `1px solid ${col}33` }}>
                <div style={{ color: col, flexShrink: 0, marginTop: 1 }}><Ico name={ic} size={20} /></div>
                <div><div style={{ fontWeight: 800, fontSize: 14, color: t.text, marginBottom: 4 }}>{ttl}</div><div style={{ fontSize: 13, color: t.sub, lineHeight: 1.5 }}>{desc}</div></div>
              </div>
            ))}
          </div>
        </>
      )
    },
    {
      id: "tiebreak", icon: "play", label: "Disconnects & Ties", accent: "#8b5cf6",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "18px 20px", borderRadius: 12, background: "rgba(139,92,246,.1)", border: "1px solid rgba(139,92,246,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Ico name="play" size={18} color="#8b5cf6" /><div style={{ fontWeight: 800, fontSize: 15, color: t.text }}>Disconnection</div></div>
            <div style={{ fontSize: 14, color: t.sub, lineHeight: 1.6 }}>If a Player disconnects, their <strong style={{ color: t.text }}>Coach must immediately take over</strong> on their own device to finish the Game.</div>
          </div>
          <div style={{ padding: "18px 20px", borderRadius: 12, background: "rgba(247,201,72,.08)", border: "1px solid rgba(247,201,72,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Ico name="trophy" size={18} color="#f7c948" /><div style={{ fontWeight: 800, fontSize: 15, color: t.text }}>Team Tiebreaker</div></div>
            <div style={{ fontSize: 14, color: t.sub, lineHeight: 1.6 }}>If teams tie in Championship Points after Game 3 → winner is the team with more <strong style={{ color: "#22c55e" }}>Meta Word Bonus Points</strong>.</div>
          </div>
        </div>
      )
    },
    {
      id: "coach", icon: "star", label: "Coach Championship", accent: "#f59e0b",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ padding: "18px 20px", borderRadius: 12, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Ico name="medal" size={18} color="#f59e0b" /><div style={{ fontWeight: 800, fontSize: 15, color: t.text }}>How to Win</div></div>
            <div style={{ fontSize: 14, color: t.sub, lineHeight: 1.6 }}>The Coach whose team earns the <strong style={{ color: "#f59e0b" }}>most Meta Word Bonus Points</strong> across all 3 Games wins the Coach Championship.</div>
          </div>
          <div style={{ padding: "18px 20px", borderRadius: 12, background: pt, border: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><Ico name="flag" size={18} color="#3b82f6" /><div style={{ fontWeight: 800, fontSize: 15, color: t.text }}>Tiebreaker</div></div>
            <div style={{ fontSize: 14, color: t.sub, lineHeight: 1.6 }}>If Coaches are tied on bonus points → the winner is the Coach whose team received the <strong style={{ color: t.text }}>fewest penalty strikes</strong>.</div>
          </div>
        </div>
      )
    },
  ];

  const winW = useWindowWidth();
  const isMobile = winW < 640;
  const sec = SECTIONS[active];
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1, background: t.bg, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: t.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", color: t.accent, flexShrink: 0 }}>
          <Ico name="book" size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: t.text, letterSpacing: -.3 }}>Gameplay Guide</div>
          <div style={{ fontSize: 11, color: t.sub, fontWeight: 600, letterSpacing: .8, textTransform: "uppercase" }}>Formula Q Championship 2026</div>
        </div>
      </div>
      {/* Mobile: horizontal scrollable tab strip */}
      {isMobile && (
        <div style={{ display: "flex", overflowX: "auto", gap: 4, padding: "8px 10px", borderBottom: `1px solid ${t.border}`, flexShrink: 0, WebkitOverflowScrolling: "touch" }}>
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => setActive(i)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, border: `1px solid ${i === active ? s.accent + "55" : "transparent"}`, background: i === active ? s.accent + "18" : "transparent", color: i === active ? s.accent : t.sub, fontWeight: i === active ? 700 : 500, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, minHeight: 44 }}>
              <Ico name={s.icon} size={13} />{s.label}
            </button>
          ))}
        </div>
      )}
      {/* Body: left nav + content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left nav — desktop only */}
        {!isMobile && (
          <div style={{ width: 190, borderRight: `1px solid ${t.border}`, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0, background: t.isDark ? "rgba(0,0,0,.2)" : "rgba(0,0,0,.02)" }}>
            {SECTIONS.map((s, i) => (
              <button key={s.id} onClick={() => setActive(i)}
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 9, border: `1px solid ${i === active ? s.accent + "55" : "transparent"}`, background: i === active ? s.accent + "18" : "transparent", color: i === active ? s.accent : t.sub, fontWeight: i === active ? 700 : 500, fontSize: 13, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <Ico name={s.icon} size={14} />{s.label}
              </button>
            ))}
          </div>
        )}
        {/* Content panel */}
        <div style={{ flex: 1, padding: isMobile ? "20px 16px" : "26px 32px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: t.text }}>{sec.label}</h2>
          </div>
          {sec.content}
        </div>
      </div>
      {/* Footer nav */}
      <div style={{ padding: "10px 24px", borderTop: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <button onClick={() => setActive(a => Math.max(0, a - 1))} disabled={active === 0}
          style={bSt(t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", t.text, { fontSize: 12, padding: "6px 16px", opacity: active === 0 ? .3 : 1 })}>
          ← Prev
        </button>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {SECTIONS.map((_, i) => <div key={i} onClick={() => setActive(i)} style={{ width: i === active ? 20 : 7, height: 7, borderRadius: 4, background: i === active ? sec.accent : t.border, cursor: "pointer", transition: "all .2s" }} />)}
        </div>
        <button onClick={() => setActive(a => Math.min(SECTIONS.length - 1, a + 1))} disabled={active === SECTIONS.length - 1}
          style={bSt(active === SECTIONS.length - 1 ? (t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)") : sec.accent, active === SECTIONS.length - 1 ? t.text : t.isDark ? "#111" : "#fff", { fontSize: 12, padding: "6px 16px", opacity: active === SECTIONS.length - 1 ? .3 : 1 })}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── CREDITS PAGE ─────────────────────────────────────────────────────────────
function CreditsPage({ t }) {
  const badgeStyle = { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 12, background: t.isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)", border: `1px solid ${t.border}`, color: t.text, textDecoration: "none", fontWeight: 600, fontSize: 13, transition: "background .2s" };
  const linkHover = e => { e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.08)"; };
  const linkLeave = e => { e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.04)"; };
  return (
    <div style={{ padding: "40px 24px", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", background: t.bg }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(24px,5vw,40px)", fontWeight: 900, color: t.text, letterSpacing: -1 }}>App Developer</h1>
        <p style={{ margin: "8px 0 0", color: t.sub, fontSize: 16 }}>The developer behind the FQ Web App</p>
      </div>

      <div style={{ width: "100%", maxWidth: 400, background: t.surface, borderRadius: 20, border: `1px solid ${t.border}`, padding: 32, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,.1)" }}>
        <img src="/dhaniel.png" alt="DhanielP" style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", marginBottom: 20, border: `3px solid ${t.accent}` }} />
        <h2 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: t.text }}>DhanielP</h2>
        <p style={{ margin: "0 0 24px", color: t.sub, fontSize: 14 }}>Lead Developer</p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, width: "100%" }}>
          <a href="https://github.com/DhanielC" target="_blank" rel="noopener noreferrer" style={badgeStyle} onMouseEnter={linkHover} onMouseLeave={linkLeave}>
            <Ico name="github" size={18} /> @DhanielC
          </a>
          <div style={{ ...badgeStyle, cursor: "default" }} onMouseEnter={linkHover} onMouseLeave={linkLeave}>
            <span style={{ color: "#5865F2", display: "flex", alignItems: "center" }}><Ico name="discord" size={18} /></span> hachimi
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PUBLIC SIDEBAR ───────────────────────────────────────────────────────────
function PublicSidebar({ state, t, viewPhaseId, onAdminClick, onPhaseJump, onGuideClick, onCreditsClick, activePage, localDark, setLocalDark }) {
  const [open, setOpen] = useState(false);
  const liveIdx = PHASES.findIndex(p => p.id === state.currentPhase);
  const viewIdx = PHASES.findIndex(p => p.id === (viewPhaseId || state.currentPhase));

  const phaseIcon = (ph) => {
    if (ph.type === "setup") return "flag";
    if (ph.type === "draft") return "clipboard";
    if (ph.type === "game") return "play";
    if (ph.type === "results") return "trophy";
    if (ph.type === "podium") return "star";
    return "play";
  };

  return (
    <>
      {/* Theme toggle — top-left, only visible when drawer is open */}
      {open && (
        <button
          onClick={() => setLocalDark(v => !v)}
          style={{ position: "fixed", top: 14, left: 14, zIndex: 9998, width: 38, height: 38, borderRadius: 10, border: `1px solid ${t.border}`, background: t.isDark ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.88)", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}
        >
          <Ico name={localDark ? "moon" : "sun"} size={17} />
        </button>
      )}

      {/* Toggle button — top right */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: "fixed", top: 14, right: 14, zIndex: 9998, width: 38, height: 38, borderRadius: 10, border: `1px solid ${t.border}`, background: t.isDark ? "rgba(0,0,0,.75)" : "rgba(255,255,255,.88)", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}
      >
        <Ico name={open ? "x" : "menu"} size={18} />
      </button>

      {/* Backdrop */}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 9996, background: "rgba(0,0,0,.35)", backdropFilter: "blur(2px)" }} />}

      {/* Drawer */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 9997, width: 260, background: t.isDark ? "#0d0d12" : "#f0f0f5", borderLeft: `1px solid ${t.border}`, display: "flex", flexDirection: "column", transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform .25s cubic-bezier(.4,0,.2,1)", boxShadow: open ? "-8px 0 32px rgba(0,0,0,.25)" : "none" }}>

        {/* Header */}
        <div style={{ padding: "18px 16px 12px", borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: t.accent, letterSpacing: .5 }}>PHASE NAVIGATOR</div>
            <div style={{ fontSize: 11, color: t.sub, marginTop: 2 }}>Jump to a completed phase</div>
          </div>
          <button onClick={() => setOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sub, padding: 4, display: "flex" }}>
            <Ico name="x" size={16} />
          </button>
        </div>

        {/* Phase list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {PHASES.map((ph, i) => {
            const isViewing = ph.id === (viewPhaseId || state.currentPhase);
            const isLive = ph.id === state.currentPhase;
            const isPast = i < liveIdx;
            const isFuture = i > liveIdx;
            const isClickable = isPast || isLive;
            return (
              <div key={ph.id}
                onClick={() => { if (!isClickable) return; onPhaseJump(ph.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, marginBottom: 2,
                  cursor: isClickable ? "pointer" : "default",
                  background: isViewing ? t.accent + "20" : "transparent",
                  border: `1px solid ${isViewing ? t.accent + "44" : "transparent"}`,
                  opacity: isFuture ? .3 : 1,
                }}
                onMouseEnter={e => { if (isClickable && !isViewing) e.currentTarget.style.background = t.isDark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.05)"; }}
                onMouseLeave={e => { if (!isViewing) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  background: isViewing ? t.accent : isPast ? "#22c55e22" : t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)",
                  border: `2px solid ${isViewing ? t.accent : isPast ? "#22c55e" : t.border}`,
                  color: isViewing ? (t.isDark ? "#111" : "#fff") : isPast ? "#22c55e" : t.sub,
                }}>
                  {isPast && !isViewing ? <Ico name="check" size={10} /> : <Ico name={phaseIcon(ph)} size={10} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: isViewing ? 700 : 500, color: isViewing ? t.accent : isFuture ? t.sub : t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ph.label}</div>
                  {ph.game === 3 && <div style={{ fontSize: 10, color: t.sub }}>×2 pts</div>}
                </div>
                {isLive && <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,.15)", padding: "2px 6px", borderRadius: 8, flexShrink: 0 }}>LIVE</span>}
              </div>
            );
          })}
        </div>
        {/* Footer buttons */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => { onGuideClick(); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1px solid ${activePage === "guide" ? t.accent + "55" : t.border}`, background: activePage === "guide" ? t.accent + "18" : "transparent", color: activePage === "guide" ? t.accent : t.sub, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <Ico name="book" size={15} /> Gameplay Guide
          </button>
          <button onClick={() => { onCreditsClick(); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1px solid ${activePage === "credits" ? t.accent + "55" : t.border}`, background: activePage === "credits" ? t.accent + "18" : "transparent", color: activePage === "credits" ? t.accent : t.sub, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <Ico name="info" size={15} /> Credits
          </button>
          {!REGISTRATION_LOCKED_DEFAULT && REGISTRATION_FORM_URL && (
            <a
              href={state.registrationLocked ? undefined : REGISTRATION_FORM_URL}
              target={state.registrationLocked ? undefined : "_blank"}
              rel="noopener noreferrer"
              onClick={state.registrationLocked ? (e) => e.preventDefault() : () => setOpen(false)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1px solid ${state.registrationLocked ? t.border : "rgba(34,197,94,.3)"}`, background: state.registrationLocked ? "transparent" : "rgba(34,197,94,.08)", color: state.registrationLocked ? t.sub : "#22c55e", fontWeight: 600, fontSize: 13, cursor: state.registrationLocked ? "not-allowed" : "pointer", textDecoration: "none", boxSizing: "border-box", opacity: state.registrationLocked ? .45 : 1 }}>
              <Ico name="external" size={15} /> Register{state.registrationLocked ? " (Locked)" : ""}
            </a>
          )}
          <button onClick={() => { onAdminClick(); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 9, border: `1px solid ${t.border}`, background: "transparent", color: t.sub, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            <Ico name="lock" size={15} /> Admin Panel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── PUBLIC VIEW ─────────────────────────────────────────────────────────────
function PublicView({ state, onAdminClick }) {
  // Local theme override — viewer-controlled, not synced to admin/Supabase
  const [localDark, setLocalDark] = useState(state.isDark);
  const t = (() => {
    const base = localDark ? { ...DARK } : { ...LIGHT };
    if (state.accent) base.accent = state.accent;
    if (state.accent2) base.accent2 = state.accent2;
    return base;
  })();

  // Page routing: "leaderboard" | "guide" | "credits"
  const [activePage, setActivePage] = useState("leaderboard");

  // Local phase override for navigation — doesn't touch global state
  const [viewPhaseId, setViewPhaseId] = useState(null);
  const phase = phaseOf(viewPhaseId || state.currentPhase);
  const [showCoach, setShowCoach] = useState(false);

  // When admin moves to a new phase, snap back to live view
  useEffect(() => { setViewPhaseId(null); }, [state.currentPhase]);

  // Sync body background/color with local theme (overrides global CSS from PublicApp)
  useEffect(() => {
    document.body.style.background = t.bg;
    document.body.style.color = t.text;
    return () => { document.body.style.background = ""; document.body.style.color = ""; };
  }, [t.bg, t.text]);

  const handlePhaseJump = (id) => { setViewPhaseId(id); setActivePage("leaderboard"); };
  const handleGuideClick = () => setActivePage(p => p === "guide" ? "leaderboard" : "guide");
  const handleCreditsClick = () => setActivePage(p => p === "credits" ? "leaderboard" : "credits");

  const sidebarProps = { state, t, viewPhaseId, onAdminClick, onPhaseJump: handlePhaseJump, onGuideClick: handleGuideClick, onCreditsClick: handleCreditsClick, activePage, localDark, setLocalDark };

  if (activePage === "guide") return <><GameplayGuide t={t} /><PublicSidebar {...sidebarProps} /></>;
  if (activePage === "credits") return <><CreditsPage t={t} /><PublicSidebar {...sidebarProps} /></>;
  if (phase.type === "podium") return <><Podium state={state} t={t} /><PublicSidebar {...sidebarProps} /></>;
  if (phase.type === "setup") return <><PreGamePublic state={state} t={t} /><PublicSidebar {...sidebarProps} /></>;
  if (phase.type === "results") return (
    <><PublicSidebar {...sidebarProps} />
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, paddingTop: 32 }}>
        <div style={{ textAlign: "center", padding: "0 20px 20px" }}>
          {state.tournamentLogo && <img src={state.tournamentLogo} alt="" style={{ height: 48, objectFit: "contain", marginBottom: 10 }} />}
          <h1 style={{ margin: "0 0 4px", fontSize: "clamp(16px,3vw,32px)", fontWeight: 800, color: t.text }}>{state.tournamentName}</h1>
        </div>
        <ResultsPublic state={state} t={t} phase={phase} />
      </div>
    </>
  );
  const getPhaseStats = (tm, ph) => {
    const numGames = state.game4Enabled ? 4 : 3;
    if (ph.type === "setup" || ph.id === "draft_1") return { tot: 0, bon: 0, allS: 0 };
    if (ph.type === "game") {
      const gi = ph.game - 1;
      const gs = gameScore(tm, gi);
      const sb = tm.bonusPoints?.[gi] || 0;
      const ss = tm.strikes?.[gi] || 0;
      return { tot: Math.max(0, gs + sb + strikeDed(ss)), bon: sb, allS: ss };
    }
    // Cumulative up to last finished game
    let limit = ph.game;
    if (ph.type === "draft") limit = ph.game - 1;
    if (ph.type === "podium") limit = numGames;
    let tot = 0, bon = 0, allS = 0;
    for (let g = 0; g < Math.min(numGames, limit); g++) {
      tot += gameScore(tm, g) + (tm.bonusPoints?.[g] || 0) + strikeDed(tm.strikes?.[g] || 0);
      bon += tm.bonusPoints?.[g] || 0;
      allS += tm.strikes?.[g] || 0;
    }
    return { tot: Math.max(0, tot), bon, allS };
  };

  const ranked = [...state.teams].sort((a, b) => {
    const sA = getPhaseStats(a, phase);
    const sB = getPhaseStats(b, phase);
    if (sB.tot !== sA.tot) return sB.tot - sA.tot;
    return sB.bon - sA.bon;
  });
  const medalColor = ["#f7c948", "#b0b0b0", "#cd7f32"];
  const isDraft = phase.type === "draft";
  const isGame = phase.type === "game";
  const coachSorted = [...state.teams].sort((a, b) => {
    const sA = getPhaseStats(a, phase);
    const sB = getPhaseStats(b, phase);
    if (sB.bon !== sA.bon) return sB.bon - sA.bon;
    return sA.allS - sB.allS;
  });
  const coachRankColors = ["#f7c948", "#b0b0b0", "#cd7f32"];
  return (
    <>
      <PublicSidebar {...sidebarProps} />
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
        <div style={{ textAlign: "center", padding: "32px 20px 20px" }}>
          {state.tournamentLogo && <img src={state.tournamentLogo} alt="" style={{ height: 58, objectFit: "contain", marginBottom: 12 }} />}
          <h1 style={{ margin: 0, fontSize: "clamp(18px,4vw,42px)", fontWeight: 800, color: t.text, letterSpacing: -1 }}>{state.tournamentName}</h1>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
            {[1, 2, 3, ...(state.game4Enabled ? [4] : [])].map(g => {
              const done = state.completedGames?.includes(g);
              const active = phase.game === g;
              return <div key={g} style={{ padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: done ? t.accent : active ? t.isDark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)" : "transparent", color: done ? (t.isDark ? "#111" : "#fff") : active ? t.accent : t.sub, border: `1.5px solid ${active ? t.accent : done ? t.accent : t.border}` }}>Game {g}{g === 3 ? " (×2)" : ""}{done ? " ✓" : ""}</div>;
            })}
          </div>
          <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: isGame ? "rgba(34,197,94,.1)" : isDraft ? "rgba(59,130,246,.08)" : "transparent", border: `1px solid ${isGame ? "rgba(34,197,94,.3)" : isDraft ? "rgba(59,130,246,.2)" : t.border}` }}>
            {isGame && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.5s infinite" }} />}
            <span style={{ fontSize: 13, fontWeight: 600, color: isGame ? "#22c55e" : isDraft ? "#3b82f6" : t.sub }}>{phase.label}</span>
          </div>
        </div>
        {isDraft && <DraftPublic state={state} t={t} phase={phase} />}
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 16px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10 }}>
            <button onClick={() => setShowCoach(false)} style={bSt(!showCoach ? t.accent : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", !showCoach ? (t.isDark ? "#111" : "#fff") : t.sub, { padding: "5px 13px", fontSize: 11 })}>
              <Ico name="trophy" size={12} /> Teams
            </button>
            <button onClick={() => setShowCoach(true)} style={bSt(showCoach ? t.accent2 : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", showCoach ? "#fff" : t.sub, { padding: "5px 13px", fontSize: 11 })}>
              <Ico name="star" size={12} /> Coach Cup
            </button>
          </div>

          {/* ── TEAMS LEADERBOARD ── */}
          {!showCoach && (
            <>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth: 340 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 72px 68px 56px", gap: 8, padding: "0 12px 8px", fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", borderBottom: `1px solid ${t.border}` }}>
                    <div>#</div><div>Team</div><div style={{ textAlign: "right" }}>Pts</div><div style={{ textAlign: "center" }}>Strikes</div><div style={{ textAlign: "right" }}>Bonus</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    {ranked.map((tm, idx) => {
                      const stats = getPhaseStats(tm, phase);
                      const tot = stats.tot;
                      const bon = stats.bon;
                      const allS = stats.allS;
                      return (
                        <div key={tm.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr 72px 68px 56px", gap: 8, padding: "10px 12px", borderRadius: 10, background: t.surface, border: `1px solid ${idx === 0 ? t.accent + "44" : t.border}`, alignItems: "center" }}>
                          <div style={{ textAlign: "center" }}>
                            {idx < 3 ? <Ico name="medal" size={20} color={medalColor[idx]} /> : <span style={{ fontWeight: 700, color: t.sub, fontSize: 14 }}>{idx + 1}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <Av src={tm.teamLogo} name={tm.name} size={36} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.text }}>{tm.name}</div>
                              <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 2 }}>
                                {tm.playerName && <><Av src={tm.playerAvatar} name={tm.playerName} size={14} round /><span style={{ fontSize: 11, color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.playerName}</span></>}
                                {tm.coachName && <><span style={{ color: t.border, fontSize: 10 }}>|</span><Av src={tm.coachAvatar} name={tm.coachName} size={14} round /><span style={{ fontSize: 11, color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tm.coachName}</span></>}
                              </div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontWeight: 800, fontSize: 22, color: idx === 0 ? t.accent : t.text }}>{tot}</div>
                          <div style={{ textAlign: "center", fontWeight: 900, fontSize: 20, color: allS > 0 ? "#ef4444" : t.sub }}>{allS}</div>
                          <div style={{ textAlign: "right", fontWeight: 700, fontSize: 15, color: bon > 0 ? "#22c55e" : t.sub }}>+{bon}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: t.sub }}>Tiebreaker: Total Bonus Points · Game 3 = ×2 pts{state.game4Enabled ? " · Game 4 = ×1 pts" : ""}</p>
            </>
          )}

          {/* ── COACH CUP — matches Teams table style ── */}
          {showCoach && (
            <>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ minWidth: 340 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 72px 68px 56px", gap: 8, padding: "0 12px 8px", fontSize: 11, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", borderBottom: `1px solid ${t.border}` }}>
                    <div>#</div><div>Coach</div><div style={{ textAlign: "right" }}>Bonus</div><div style={{ textAlign: "center" }}>Strikes</div><div></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    {coachSorted.map((tm, i) => {
                      const stats = getPhaseStats(tm, phase);
                      const bon = stats.bon;
                      const totalStrikes = stats.allS;
                      return (
                        <div key={tm.id} style={{ display: "grid", gridTemplateColumns: "44px 1fr 72px 68px 56px", gap: 8, padding: "10px 12px", borderRadius: 10, background: t.surface, border: `1px solid ${i === 0 ? t.accent + "44" : t.border}`, alignItems: "center" }}>
                          <div style={{ textAlign: "center" }}>
                            {i < 3 ? <Ico name="medal" size={20} color={coachRankColors[i]} /> : <span style={{ fontWeight: 700, color: t.sub, fontSize: 14 }}>{i + 1}</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            <Av src={tm.coachAvatar || tm.teamLogo} name={tm.coachName || tm.name} size={36} round />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.text }}>{tm.coachName || "(No Coach)"}</div>
                              <div style={{ fontSize: 11, color: t.sub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{tm.name}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontWeight: 800, fontSize: 22, color: i === 0 ? t.accent : bon > 0 ? "#22c55e" : t.sub }}>{bon}</div>
                          <div style={{ textAlign: "center", fontWeight: 900, fontSize: 22, color: totalStrikes > 0 ? "#ef4444" : t.sub }}>{totalStrikes}</div>
                          <div />
                        </div>
                      );
                    })}
                  </div>
                  <p style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: t.sub }}>Ranked by Meta Bonus Points · Tiebreaker: Fewest strikes</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ─── ADMIN SHELL ─────────────────────────────────────────────────────────────
function Admin({ state, setState, t, onLogout }) {
  const [tab, setTab] = useState("phase");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const winW = useWindowWidth();
  const isMobile = winW < 640;
  const phase = phaseOf(state.currentPhase);
  const navBg = t.isDark ? "#0d0d12" : "#eaeaf0";
  const tabs = [
    { id: "phase", icon: "play", label: "Phase" },
    { id: "scoring", icon: "trophy", label: "Scoring" },
    { id: "draft", icon: "clipboard", label: "Draft" },
    { id: "teams", icon: "users", label: "Teams" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];

  const SidebarContent = () => (
    <>
      <div style={{ padding: "18px 14px 12px" }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: t.accent, letterSpacing: .5 }}>ADMIN</div>
        <div style={{ fontSize: 11, color: t.sub, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{phase.label}</div>
      </div>
      <div style={{ flex: 1, padding: "4px 8px" }}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => { setTab(tb.id); if (isMobile) setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", borderRadius: 8, border: "none", background: tab === tb.id ? t.accent + "20" : "transparent", color: tab === tb.id ? t.accent : t.sub, fontWeight: tab === tb.id ? 700 : 500, fontSize: 13, cursor: "pointer", marginBottom: 2, textAlign: "left", minHeight: 44 }}>
            <Ico name={tb.icon} size={15} />{tb.label}
          </button>
        ))}
      </div>
      <div style={{ padding: "10px 8px" }}>
        <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer", minHeight: 44 }}>
          <Ico name="logout" size={15} color="#ef4444" />Logout
        </button>
      </div>
    </>
  );

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", background: t.bg, overflow: "hidden", zIndex: 999 }}>
      {/* ── Desktop sidebar (always visible ≥640px) ── */}
      {!isMobile && (
        <div style={{ width: 170, height: "100vh", background: navBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", flexShrink: 0, boxSizing: "border-box" }}>
          <SidebarContent />
        </div>
      )}

      {/* ── Mobile: hamburger button ── */}
      {isMobile && (
        <button onClick={() => setSidebarOpen(o => !o)} style={{ position: "fixed", top: 10, left: 10, zIndex: 10001, width: 40, height: 40, borderRadius: 10, border: `1px solid ${t.border}`, background: t.isDark ? "rgba(0,0,0,.85)" : "rgba(255,255,255,.92)", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}>
          <Ico name={sidebarOpen ? "x" : "menu"} size={18} />
        </button>
      )}

      {/* ── Mobile: backdrop ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }} />
      )}

      {/* ── Mobile: slide-in drawer ── */}
      {isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 10001, width: 220, background: navBg, borderRight: `1px solid ${t.border}`, display: "flex", flexDirection: "column", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform .25s cubic-bezier(.4,0,.2,1)", boxShadow: sidebarOpen ? "8px 0 32px rgba(0,0,0,.25)" : "none" }}>
          <SidebarContent />
        </div>
      )}

      {/* ── Content area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "60px 14px 24px" : 24, display: "flex", flexDirection: "column", minHeight: "100vh", boxSizing: "border-box" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {tab === "phase" && <PhaseTab state={state} setState={setState} t={t} />}
          {tab === "scoring" && <ScoringTab state={state} setState={setState} t={t} />}
          {tab === "draft" && <DraftTab state={state} setState={setState} t={t} />}
          {tab === "teams" && <TeamsTab state={state} setState={setState} t={t} />}
          {tab === "settings" && <SettingsTab state={state} setState={setState} t={t} />}
        </div>
      </div>
    </div>
  );
}


// ─── PHASE TAB ────────────────────────────────────────────────────────────────
function PhaseTab({ state, setState, t }) {
  const phases = getPhases(state);
  const idx = phases.findIndex(p => p.id === state.currentPhase);
  const go = (id) => {
    const ph = phaseOf(id);
    setState(s => {
      let teams = s.teams;
      // When entering a new game's draft, reset that game's strikes & DNF so they don't bleed from the previous game
      if (ph.type === "draft" && ph.game != null) {
        const gi = ph.game - 1;
        teams = s.teams.map(tm => {
          const ns = [...(tm.strikes || [0, 0, 0, 0])];
          const nd = [...tm.dnf];
          ns[gi] = 0; nd[gi] = false;
          return { ...tm, strikes: ns, dnf: nd };
        });
      }
      return { ...s, currentPhase: id, currentGame: ph.game || s.currentGame, teams };
    });
  };
  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 20, color: t.text }}>Phase Control</h2>
      <p style={{ margin: "0 0 20px", color: t.sub, fontSize: 13 }}>Controls what the public stream sees in real time.</p>
      <div style={{ ...cSt(t, { padding: 22, marginBottom: 16, textAlign: "center" }) }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: .5, color: t.sub, textTransform: "uppercase", marginBottom: 4 }}>Currently Showing</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: t.accent, marginBottom: 14 }}>{phaseOf(state.currentPhase).label}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={() => { if (idx > 0) go(phases[idx - 1].id); }} disabled={idx === 0} style={{ ...bSt(t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", t.text, { padding: "9px 22px", opacity: idx === 0 ? .3 : 1 }) }}>← Back</button>
          <button onClick={() => { if (idx < phases.length - 1) go(phases[idx + 1].id); }} disabled={idx === phases.length - 1} style={{ ...bSt(t.accent, t.isDark ? "#111" : "#fff", { padding: "9px 28px", opacity: idx === phases.length - 1 ? .4 : 1 }) }}>Next →</button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {phases.map((ph, i) => {
          const cur = ph.id === state.currentPhase;
          const past = i < idx;
          return (
            <div key={ph.id} onClick={() => go(ph.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: cur ? t.accent + "18" : "transparent", border: `1px solid ${cur ? t.accent + "44" : "transparent"}`, cursor: "pointer" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: cur ? t.accent : past ? "#22c55e22" : t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.06)", border: `2px solid ${cur ? t.accent : past ? "#22c55e" : t.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: cur ? (t.isDark ? "#111" : "#fff") : past ? "#22c55e" : t.sub }}>
                {past ? <Ico name="check" size={10} /> : <span style={{ fontSize: 10, fontWeight: 800 }}>{i + 1}</span>}
              </div>
              <span style={{ fontWeight: cur ? 700 : 500, fontSize: 13, flex: 1, color: cur ? t.accent : t.text }}>{ph.label}</span>
              {cur && <span style={{ fontSize: 10, fontWeight: 700, color: t.accent, background: t.accent + "18", padding: "2px 8px", borderRadius: 10 }}>LIVE</span>}
              {ph.game === 3 && !cur && <span style={{ fontSize: 10, color: t.sub }}>×2</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCORING TAB ─────────────────────────────────────────────────────────────
function ScoringTab({ state, setState, t }) {
  const gameNum = state.currentGame || 1;
  const gIdx = gameNum - 1;
  // Per-game order — each game has its own independent drag ordering
  const [orders, setOrders] = useState(() => {
    const init = {};
    const gamesToInit = state.game4Enabled ? [1, 2, 3, 4] : [1, 2, 3];
    gamesToInit.forEach(g => {
      const gi = g - 1;
      const hasSaved = state.teams.some(tm => tm.placements[gi] !== null && tm.placements[gi] !== undefined);
      if (hasSaved) {
        const sorted = [...state.teams].sort((a, b) => (a.placements[gi] ?? 999) - (b.placements[gi] ?? 999));
        init[g] = sorted.map(tm => tm.id);
      } else {
        const base = gi === 0 ? state.teams : rankTeams(state.teams);
        init[g] = base.map(tm => tm.id);
      }
    });
    return init;
  });
  const order = orders[gameNum] || state.teams.map(tm => tm.id);

  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const dnfSet = new Set(state.teams.filter(tm => (tm.strikes?.[gIdx] || 0) >= 3).map(tm => tm.id));
  const eff = buildEffPlacements(order, dnfSet);

  const onDragStart = (id) => setDragId(id);
  const onDragOver = (e, id) => { e.preventDefault(); setOverId(id); };
  const onDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    setOrders(prev => {
      const cur = [...(prev[gameNum] || order)];
      const fi = cur.indexOf(dragId), ti = cur.indexOf(targetId);
      cur.splice(fi, 1); cur.splice(ti, 0, dragId);
      return { ...prev, [gameNum]: cur };
    });
    setDragId(null); setOverId(null);
  };

  const applyResults = () => {
    const eff2 = buildEffPlacements(order, dnfSet);
    setState(s => ({
      ...s,
      teams: s.teams.map(tm => {
        const pIdx = eff2[tm.id];
        const np = [...tm.placements];
        const nd = [...tm.dnf];
        if (dnfSet.has(tm.id)) { nd[gIdx] = true; np[gIdx] = order.indexOf(tm.id); }
        else { nd[gIdx] = false; np[gIdx] = pIdx; }
        return { ...tm, placements: np, dnf: nd };
      }),
      completedGames: s.completedGames?.includes(gameNum) ? s.completedGames : [...(s.completedGames || []), gameNum],
    }));
  };

  const modStrike = (teamId, delta) => {
    setState(s => ({
      ...s, teams: s.teams.map(tm => {
        if (tm.id !== teamId) return tm;
        const ns = [...(tm.strikes || [0, 0, 0, 0])];
        ns[gIdx] = Math.max(0, Math.min((ns[gIdx] || 0) + delta, 3));
        const nd = [...tm.dnf];
        nd[gIdx] = ns[gIdx] >= 3;
        return { ...tm, strikes: ns, dnf: nd };
      })
    }));
  };

  const modBonus = (teamId, delta) => {
    setState(s => ({
      ...s, teams: s.teams.map(tm => {
        if (tm.id !== teamId) return tm;
        const nb = [...(tm.bonusPoints || [0, 0, 0, 0])];
        nb[gIdx] = Math.max(0, (nb[gIdx] || 0) + delta);
        return { ...tm, bonusPoints: nb };
      })
    }));
  };

  const winW = useWindowWidth();
  const isMobile = winW < 640;

  const getTeam = id => state.teams.find(tm => tm.id === id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: t.text }}>Game {gameNum} Scoring</h2>
          <p style={{ margin: "2px 0 0", color: t.sub, fontSize: 13 }}>
            {gameNum === 3 ? "×2 multiplier" : gameNum === 4 ? "Normal ×1 pts · Top 5 only" : "Base points"} · Drag to set placement · 3 strikes this game = DNF
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[1, 2, 3, ...(state.game4Enabled ? [4] : [])].map(g => (
            <button key={g} onClick={() => setState(s => ({ ...s, currentGame: g }))}
              style={bSt(g === gameNum ? t.accent : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", g === gameNum ? (t.isDark ? "#111" : "#fff") : t.text, { padding: "6px 12px", fontSize: 12, minHeight: 44 })}>
              Game {g}{g === 3 ? " ×2" : ""}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 285px", gap: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 11, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>Final Placement — drag to reorder</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {order.map((tid, i) => {
              const tm = getTeam(tid); if (!tm) return null;
              const isDnf = dnfSet.has(tid);
              const pIdx = eff[tid];
              const rawBase = pIdx !== null ? ((gameNum === 4 ? GAME4_BASE_POINTS : BASE_POINTS)[pIdx] ?? 0) : 0;
              const pts = isDnf ? 0 : rawBase * GAME_MULTIPLIERS[gameNum];
              const sThis = tm.strikes?.[gIdx] || 0;
              return (
                <div key={tid} draggable
                  onDragStart={() => onDragStart(tid)}
                  onDragOver={e => onDragOver(e, tid)}
                  onDrop={() => onDrop(tid)}
                  onDragEnd={() => { setDragId(null); setOverId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: isDnf ? "rgba(239,68,68,.04)" : t.surface, border: `1px solid ${isDnf ? "rgba(239,68,68,.28)" : overId === tid && dragId !== tid ? "rgba(99,102,241,.4)" : t.border}`, cursor: "grab", opacity: dragId === tid ? .4 : 1, userSelect: "none" }}>
                  <span style={{ color: t.sub }}><Ico name="drag" size={16} /></span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: i < 3 ? t.accent : t.sub, width: 20, textAlign: "center" }}>{i + 1}</span>
                  <Av src={tm.teamLogo} name={tm.name} size={30} />
                  <span style={{ fontWeight: 600, flex: 1, fontSize: 13, color: isDnf ? "rgba(239,68,68,.7)" : t.text, textDecoration: isDnf ? "line-through" : "none" }}>{tm.name}</span>
                  <StrikePips count={sThis} />
                  {isDnf ? <span style={{ fontWeight: 700, color: "#ef4444", fontSize: 12, marginLeft: 4 }}>DNF</span> : <span style={{ fontWeight: 700, color: "#22c55e", fontSize: 14, minWidth: 32, textAlign: "right" }}>+{pts}</span>}
                </div>
              );
            })}
          </div>
          <button onClick={applyResults} style={{ ...bSt(t.accent, t.isDark ? "#111" : "#fff", { marginTop: 12, padding: "10px 22px", fontSize: 14 }) }}>
            <Ico name="check" size={15} /> Apply Game {gameNum} Results
          </button>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 11, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>Strikes & Meta Bonus</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {state.teams.map(tm => {
              const sThis = tm.strikes?.[gIdx] || 0;
              const bThis = tm.bonusPoints?.[gIdx] || 0;
              const isDnf = sThis >= 3;
              return (
                <div key={tm.id} style={cSt(t, { padding: "10px 12px", border: `1px solid ${isDnf ? "rgba(239,68,68,.25)" : t.border}` })}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <Av src={tm.teamLogo} name={tm.name} size={22} />
                    <span style={{ fontWeight: 600, fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.text }}>{tm.name}</span>
                    <span style={{ fontWeight: 800, fontSize: 13, color: t.accent }}>{Math.max(0, gameScore(tm, gIdx) + bThis + strikeDed(sThis))}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <StrikePips count={sThis} />
                    <div style={{ flex: 1 }} />
                    <button onClick={() => modStrike(tm.id, -1)} disabled={sThis === 0} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: sThis === 0 ? .3 : 1 }}>
                      <Ico name="minus" size={11} />
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 13, color: isDnf ? "#ef4444" : sThis > 0 ? "#f97316" : t.text, minWidth: 14, textAlign: "center" }}>{sThis}</span>
                    <button onClick={() => modStrike(tm.id, 1)} disabled={sThis >= 3} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: sThis >= 3 ? .3 : 1 }}>
                      <Ico name="plus" size={11} />
                    </button>
                    <span style={{ fontSize: 10, fontWeight: 700, color: isDnf ? "#ef4444" : "#f97316", minWidth: 34, textAlign: "right" }}>{isDnf ? "DNF" : sThis >= 2 ? "−6" : sThis >= 1 ? "−2" : ""}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: t.sub, fontWeight: 600 }}>Meta wins</span>
                    <div style={{ flex: 1 }} />
                    <button onClick={() => modBonus(tm.id, -1)} disabled={bThis === 0} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${t.border}`, background: "transparent", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: bThis === 0 ? .3 : 1 }}>
                      <Ico name="minus" size={11} />
                    </button>
                    <span style={{ fontWeight: 800, fontSize: 15, color: bThis > 0 ? "#22c55e" : t.sub, minWidth: 18, textAlign: "center" }}>{bThis}</span>
                    <button onClick={() => modBonus(tm.id, 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid rgba(34,197,94,.3)", background: "rgba(34,197,94,.1)", color: "#22c55e", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Ico name="plus" size={11} />
                    </button>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", minWidth: 34, textAlign: "right" }}>{bThis > 0 ? `+${bThis}` : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DRAFT TAB ────────────────────────────────────────────────────────────────
function DraftTab({ state, setState, t }) {
  const gameNum = state.currentGame || 1;
  const banSystem = state.banSystem || "original";
  const isNew = banSystem === "new";
  const winW = useWindowWidth();
  const isMobile = winW < 640;

  // Pool always comes from game 1
  const savedPool = state.words?.[1] || { pool: [] };
  const savedLocal = state.words?.[gameNum] || { banned: [], assignments: {} };
  const [pool, setPool] = useState(savedPool.pool || []);
  const [banned, setBanned] = useState(savedLocal.banned || []);
  const [asgn, setAsgn] = useState(savedLocal.assignments || {});
  const [wInput, setWInput] = useState("");
  const [showPoolModal, setShowPoolModal] = useState(false);

  // For New System: bans from previous games are locked/inherited
  const inheritedBanned = isNew && gameNum > 1
    ? [...new Set([...(state.words?.[1]?.banned || []), ...(gameNum > 2 ? (state.words?.[2]?.banned || []) : [])].filter(w => !banned.includes(w)))]
    : [];
  const allBanned = [...banned, ...inheritedBanned];
  const banLimit = isNew ? 4 : 8;

  useEffect(() => {
    const p = state.words?.[1] || {};
    const l = state.words?.[gameNum] || {};
    setPool(p.pool || []);
    setBanned(l.banned || []);
    setAsgn(l.assignments || {});
  }, [gameNum]);

  const save = () => setState(s => {
    const nextWords = { ...s.words };
    const g1 = nextWords[1] || {};
    nextWords[1] = { ...g1, pool };
    const cur = nextWords[gameNum] || {};
    nextWords[gameNum] = { ...cur, banned, assignments: asgn };
    return { ...s, words: nextWords };
  });

  const addWord = () => {
    const w = wInput.trim().toUpperCase();
    if (!w || pool.includes(w) || pool.length >= 16) return;
    setPool(p => [...p, w]); setWInput("");
  };

  const removeWord = (w) => {
    setPool(p => p.filter(x => x !== w));
    setBanned(b => b.filter(x => x !== w));
    setAsgn(a => { const n = { ...a }; Object.keys(n).forEach(k => { if (n[k] === w) delete n[k]; }); return n; });
  };

  const toggleBan = (w) => {
    // Can't touch inherited bans in new system
    if (isNew && inheritedBanned.includes(w)) return;
    if (banned.includes(w)) { setBanned(b => b.filter(x => x !== w)); }
    else if (banned.length < banLimit) {
      setBanned(b => [...b, w]);
      setAsgn(a => { const n = { ...a }; Object.keys(n).forEach(k => { if (n[k] === w) delete n[k]; }); return n; });
    }
  };

  const assignWord = (word, teamId) => {
    setAsgn(prev => {
      const n = { ...prev };
      Object.keys(n).forEach(k => { if (n[k] === word) delete n[k]; });
      if (teamId) n[teamId] = word;
      return n;
    });
  };

  const available = pool.filter(w => !allBanned.includes(w));
  const ranked = gameNum === 1 ? state.teams : rankTeams(state.teams);
  const takenByOther = (word, teamId) => Object.entries(asgn).some(([k, v]) => v === word && Number(k) !== teamId);

  const gridCols = isNew ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20, color: t.text }}>Game {gameNum} Draft Board</h2>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
            <p style={{ margin: 0, color: t.sub, fontSize: 13 }}>{gameNum > 1 ? "Standings order (1st picks first)" : "Registration order"}</p>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: isNew ? "rgba(59,130,246,.1)" : t.accent + "15", color: isNew ? "#3b82f6" : t.accent, fontWeight: 700 }}>
              {isNew ? "New System" : "Original"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {[1, 2, 3].map(g => (
            <button key={g} onClick={() => setState(s => ({ ...s, currentGame: g }))}
              style={bSt(g === gameNum ? t.accent : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", g === gameNum ? (t.isDark ? "#111" : "#fff") : t.text, { padding: "6px 12px", fontSize: 12 })}>
              Game {g}
            </button>
          ))}
          <button onClick={save} style={bSt("#22c55e", "#fff", { padding: "6px 14px", fontSize: 12 })}>
            <Ico name="save" size={13} /> Save & Publish
          </button>
        </div>
      </div>

      {/* New System inherited ban notice */}
      {isNew && inheritedBanned.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(59,130,246,.06)", border: "1px solid rgba(59,130,246,.2)", fontSize: 12, color: t.sub }}>
          <span style={{ fontWeight: 700, color: "#3b82f6" }}>New System: </span>
          {inheritedBanned.length} word{inheritedBanned.length > 1 ? "s" : ""} carried over from prior games and permanently banned: {" "}
          {inheritedBanned.map(w => <span key={w} style={{ fontWeight: 700, color: "#ef4444", marginRight: 4 }}>{w}</span>)}
          · You may ban up to <strong>4 new words</strong> this game.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : gridCols, gap: 14 }}>
        {/* Word Pool */}
        <div style={cSt(t, { padding: 16 })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: t.sub, letterSpacing: .5, textTransform: "uppercase" }}>Word Pool ({pool.length}/16)</div>
            <button onClick={() => setShowPoolModal(true)} style={bSt(t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", t.sub, { padding: "3px 9px", fontSize: 11 })}>
              <Ico name="plus" size={11} /> Expand
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <input value={wInput} onChange={e => setWInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addWord()}
              placeholder="Add word…" style={{ ...iSt(t, { flex: 1, fontSize: 12 }) }} />
            <button onClick={addWord} style={bSt(t.accent, t.isDark ? "#111" : "#fff", { padding: "7px 11px" })}><Ico name="plus" size={13} /></button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {pool.map(w => {
              const ib = banned.includes(w);
              const isInh = inheritedBanned.includes(w);
              const ia = !ib && !isInh && Object.values(asgn).includes(w);
              const isAllBanned = allBanned.includes(w);
              return (
                <div key={w} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 9px", borderRadius: 16, cursor: isInh ? "default" : "pointer", background: isAllBanned ? "rgba(239,68,68,.1)" : ia ? "rgba(34,197,94,.1)" : t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)", border: `1px solid ${isAllBanned ? "rgba(239,68,68,.3)" : ia ? "rgba(34,197,94,.25)" : t.border}`, opacity: isInh ? .6 : 1 }}
                  onClick={() => toggleBan(w)}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isAllBanned ? "#ef4444" : ia ? "#22c55e" : t.text, textDecoration: isAllBanned ? "line-through" : "none" }}>{w}</span>
                  {!isInh && <span onClick={e => { e.stopPropagation(); removeWord(w); }} style={{ fontSize: 10, color: t.sub, cursor: "pointer", marginLeft: 1 }}>×</span>}
                </div>
              );
            })}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 10, color: t.sub }}>
            Click word to toggle ban · {isNew ? `max ${banLimit} new bans` : `max ${banLimit} banned`}
            {isNew && inheritedBanned.length > 0 ? ` (${banned.length}/${banLimit} used)` : banned.length > 0 ? ` (${banned.length}/${banLimit})` : ``}
          </p>
        </div>

        {/* Banned */}
        <div style={cSt(t, { padding: 16, borderColor: "rgba(239,68,68,.25)" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 11, color: "#ef4444", letterSpacing: .5, textTransform: "uppercase", marginBottom: 10 }}>
            <Ico name="ban" size={12} color="#ef4444" /> {isNew ? "Banned This Game" : "Banned"} ({banned.length}/{banLimit})
          </div>
          {isNew && inheritedBanned.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.sub, textTransform: "uppercase", letterSpacing: .4, marginBottom: 5 }}>Locked from prior games</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {inheritedBanned.map(w => <span key={w} style={{ padding: "2px 7px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,.06)", color: "rgba(239,68,68,.55)", border: "1px solid rgba(239,68,68,.15)", textDecoration: "line-through" }}>{w}</span>)}
              </div>
            </div>
          )}
          {banned.length === 0
            ? <p style={{ color: t.sub, fontSize: 13, margin: 0 }}>Click words in the pool to ban them.</p>
            : <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {banned.map(w => <span key={w} onClick={() => toggleBan(w)} style={{ padding: "3px 9px", borderRadius: 16, fontSize: 12, fontWeight: 600, background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.25)", cursor: "pointer" }}>{w} ×</span>)}
            </div>
          }
          <div style={{ marginTop: 12, padding: "9px 11px", borderRadius: 8, background: t.isDark ? "rgba(239,68,68,.05)" : "rgba(239,68,68,.03)", border: "1px solid rgba(239,68,68,.1)" }}>
            <p style={{ margin: 0, fontSize: 11, color: t.sub }}>
              {isNew
                ? `New System: +4 bans stack each game. Total banned: ${allBanned.length}.`
                : "If a team submits a banned word: give them a strike in Scoring."
              }
            </p>
          </div>
        </div>

        {/* Meta Assignments — Original system only */}
        {!isNew && (
          <div style={cSt(t, { padding: 16 })}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 11, color: t.sub, letterSpacing: .5, textTransform: "uppercase", marginBottom: 10 }}>
              <Ico name="star" size={12} color="#f59e0b" /> Meta Assignments
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ranked.map((tm, i) => {
                const cur = Object.entries(asgn).find(([id]) => Number(id) === tm.id)?.[1] || "";
                return (
                  <div key={tm.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 7, background: t.isDark ? "rgba(255,255,255,.02)" : "rgba(0,0,0,.02)" }}>
                    <span style={{ fontSize: 10, color: t.sub, width: 14, fontWeight: 700 }}>{i + 1}</span>
                    <Av src={tm.teamLogo} name={tm.name} size={22} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: t.text }}>{tm.name}</span>
                    <select value={cur} onChange={e => assignWord(e.target.value, e.target.value ? tm.id : null)} style={{ ...iSt(t, { width: 104, fontSize: 11, padding: "4px 6px" }) }}>
                      <option value="">— none —</option>
                      {available.map(w => <option key={w} value={w} disabled={takenByOther(w, tm.id)}>{w}{takenByOther(w, tm.id) ? " ✓" : ""}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Word Pool Expand Modal */}
      {showPoolModal && (
        <div onClick={() => setShowPoolModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(8px)" }}>
          <div onClick={e => e.stopPropagation()} style={{ ...cSt(t, { padding: 28, maxWidth: 700, width: "100%", maxHeight: "82vh", overflow: "hidden", display: "flex", flexDirection: "column" }) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: t.text }}>Word Pool — Game {gameNum}</div>
                <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{pool.length}/16 words · {allBanned.length} banned total · Click to toggle ban</div>
              </div>
              <button onClick={() => setShowPoolModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: t.sub, padding: 4 }}>
                <Ico name="x" size={20} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={wInput} onChange={e => setWInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addWord()}
                placeholder="Add word…" style={{ ...iSt(t, { flex: 1 }) }} />
              <button onClick={addWord} style={bSt(t.accent, t.isDark ? "#111" : "#fff", { padding: "8px 16px" })}>
                <Ico name="plus" size={14} /> Add
              </button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 8 }}>
                {pool.map(w => {
                  const ib = banned.includes(w);
                  const isInh = inheritedBanned.includes(w);
                  const isAllBanned = allBanned.includes(w);
                  const ia = !isAllBanned && Object.values(asgn).includes(w);
                  return (
                    <div key={w} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 13px", borderRadius: 10, cursor: isInh ? "default" : "pointer", background: isAllBanned ? "rgba(239,68,68,.12)" : ia ? "rgba(34,197,94,.1)" : t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)", border: `1.5px solid ${isAllBanned ? "rgba(239,68,68,.4)" : ia ? "rgba(34,197,94,.35)" : t.border}`, opacity: isInh ? .6 : 1 }}
                      onClick={() => toggleBan(w)}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isAllBanned ? "#ef4444" : ia ? "#22c55e" : t.text, textDecoration: isAllBanned ? "line-through" : "none", flex: 1 }}>{w}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {isInh && <span style={{ fontSize: 9, color: "rgba(239,68,68,.5)", fontWeight: 700 }}>LOCKED</span>}
                        {ib && !isInh && <Ico name="ban" size={13} color="#ef4444" />}
                        {ia && <Ico name="star" size={13} color="#22c55e" />}
                        {!isInh && <span onClick={e => { e.stopPropagation(); removeWord(w); }} style={{ fontSize: 14, color: t.sub, cursor: "pointer", lineHeight: 1 }}>×</span>}
                      </div>
                    </div>
                  );
                })}
                {pool.length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: t.sub, fontSize: 14, padding: "40px 0" }}>No words yet. Add some above!</div>}
              </div>
              <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 6, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
                <div style={{ fontSize: 11, color: t.sub, width: "100%", marginBottom: 4, fontWeight: 600 }}>Legend</div>
                <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 12, background: "rgba(239,68,68,.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)" }}>Banned</span>
                {!isNew && <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 12, background: "rgba(34,197,94,.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,.3)" }}>Assigned</span>}
                {isNew && <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 12, background: "rgba(239,68,68,.06)", color: "rgba(239,68,68,.55)", border: "1px solid rgba(239,68,68,.15)" }}>Locked (prev game)</span>}
                <span style={{ padding: "3px 10px", borderRadius: 10, fontSize: 12, background: t.isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)", color: t.text, border: `1px solid ${t.border}` }}>Available</span>
                <span style={{ fontSize: 11, color: t.sub, marginLeft: "auto", alignSelf: "center" }}>Banned: {banned.length}/{banLimit} {isNew ? "(this game)" : "max"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TEAMS TAB ────────────────────────────────────────────────────────────────
function TeamsTab({ state, setState, t }) {
  // Local draft of teams so typing isn't interrupted by any background syncs
  const [localTeams, setLocalTeams] = useState(() => state.teams.map(tm => ({ ...tm })));
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync from parent only when not dirty (user hasn't started editing)
  useEffect(() => {
    if (!dirty) {
      setLocalTeams(state.teams.map(tm => ({ ...tm })));
    }
  }, [state.teams, dirty]);

  const upd = (id, f, v) => {
    setDirty(true);
    setSaved(false);
    setLocalTeams(prev => prev.map(tm => tm.id === id ? { ...tm, [f]: v } : tm));
  };

  const saveAll = () => {
    setState(s => ({ ...s, teams: localTeams }));
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 20, color: t.text }}>Team Roster</h2>
          <p style={{ margin: 0, color: t.sub, fontSize: 13 }}>Click avatar icons to upload photos. Press <strong>Save & Publish</strong> when done.</p>
        </div>
        <button onClick={saveAll} style={bSt(saved ? "#22c55e" : t.accent, t.isDark ? "#111" : "#fff", { padding: "9px 20px", fontSize: 14 })}>
          <Ico name={saved ? "check" : "save"} size={15} /> {saved ? "Saved!" : "Save & Publish"}
        </button>
      </div>
      {dirty && <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, background: "rgba(247,201,72,.1)", border: "1px solid rgba(247,201,72,.3)", fontSize: 12, color: t.accent, fontWeight: 600 }}>⚠ Unsaved changes — click Save &amp; Publish to push to the public view.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
        {localTeams.map(tm => (
          <div key={tm.id} style={cSt(t, { padding: 18 })}>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 12, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ImgPicker t={t} src={tm.teamLogo} onChange={v => upd(tm.id, "teamLogo", v)} label="Team Logo" size={50} />
                <ImgPicker t={t} src={tm.playerAvatar} onChange={v => upd(tm.id, "playerAvatar", v)} label="Player" size={42} round />
                <ImgPicker t={t} src={tm.coachAvatar} onChange={v => upd(tm.id, "coachAvatar", v)} label="Coach" size={42} round />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div><Lbl t={t}>Team Name</Lbl><input value={tm.name} onChange={e => upd(tm.id, "name", e.target.value)} style={iSt(t)} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <div><Lbl t={t}>Driver (Player)</Lbl><input value={tm.playerName} onChange={e => upd(tm.id, "playerName", e.target.value)} style={iSt(t)} /></div>
                  <div><Lbl t={t}>Coach</Lbl><input value={tm.coachName} onChange={e => upd(tm.id, "coachName", e.target.value)} style={iSt(t)} /></div>
                </div>
                <div><Lbl t={t}>Team Description</Lbl><input value={tm.description || ""} onChange={e => upd(tm.id, "description", e.target.value)} placeholder="Short bio or tagline…" style={iSt(t)} /></div>
                <div><Lbl t={t}>Team Quote / Motto</Lbl><input value={tm.quote || ""} onChange={e => upd(tm.id, "quote", e.target.value)} placeholder="Team motto or battle cry…" style={iSt(t)} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <div><Lbl t={t}>Driver Quote</Lbl><input value={tm.playerQuote || ""} onChange={e => upd(tm.id, "playerQuote", e.target.value)} placeholder="Driver's personal quote…" style={iSt(t)} /></div>
                  <div><Lbl t={t}>Coach Quote</Lbl><input value={tm.coachQuote || ""} onChange={e => upd(tm.id, "coachQuote", e.target.value)} placeholder="Coach's personal quote…" style={iSt(t)} /></div>
                </div>
                <details style={{ marginTop: 2 }}>
                  <summary style={{ fontSize: 11, color: t.sub, cursor: "pointer", userSelect: "none" }}>Paste image URLs instead</summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
                    {[["teamLogo", "Logo URL"], ["playerAvatar", "Player URL"], ["coachAvatar", "Coach URL"]].map(([f, ph]) => (
                      <input key={f} value={tm[f] || ""} onChange={e => upd(tm.id, f, e.target.value || null)} style={{ ...iSt(t, { fontSize: 11 }) }} placeholder={ph} />
                    ))}
                  </div>
                </details>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={saveAll} style={bSt(saved ? "#22c55e" : t.accent, t.isDark ? "#111" : "#fff", { padding: "10px 24px", fontSize: 14 })}>
          <Ico name={saved ? "check" : "save"} size={15} /> {saved ? "Saved!" : "Save & Publish"}
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function SettingsTab({ state, setState, t }) {
  const doReset = () => {
    if (!window.confirm("Reset ALL scores, strikes, placements, words, and bonus points?\n\nTeam names and images will be kept.")) return;
    const fresh = {
      ...mkDefault(),
      teams: state.teams.map(tm => ({
        ...mkTeam(tm.id),
        name: tm.name, playerName: tm.playerName, coachName: tm.coachName,
        teamLogo: tm.teamLogo, playerAvatar: tm.playerAvatar, coachAvatar: tm.coachAvatar,
      })),
      tournamentName: state.tournamentName,
      tournamentLogo: state.tournamentLogo,
      isDark: state.isDark,
      accent: state.accent,
      accent2: state.accent2,
      banSystem: state.banSystem || "original",
      game4Enabled: state.game4Enabled || false,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setState(fresh);
  };
  const setLogo = async (e) => { const f = e.target.files[0]; if (!f) return; setState(s => ({ ...s, tournamentLogo: null })); const url = await toDataURL(f); setState(s => ({ ...s, tournamentLogo: url })); };
  return (
    <div style={{ maxWidth: 500 }}>
      <h2 style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 20, color: t.text }}>Settings</h2>
      <p style={{ margin: "0 0 20px", color: t.sub, fontSize: 13 }}>Tournament info, theme, and data reset.</p>
      <div style={cSt(t, { padding: 20, marginBottom: 12 })}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 14 }}>Tournament Info</div>
        <Lbl t={t}>Name</Lbl>
        <input value={state.tournamentName} onChange={e => setState(s => ({ ...s, tournamentName: e.target.value }))} style={{ ...iSt(t), marginBottom: 12 }} />
        <Lbl t={t}>Logo</Lbl>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          {state.tournamentLogo && <img src={state.tournamentLogo} alt="" style={{ height: 38, objectFit: "contain", borderRadius: 6 }} />}
          <label style={{ ...bSt(t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", t.sub, { cursor: "pointer", fontSize: 12 }) }}>
            <Ico name="upload" size={13} /> Upload
            <input type="file" accept="image/*" onChange={setLogo} style={{ display: "none" }} />
          </label>
          {state.tournamentLogo && <button onClick={() => setState(s => ({ ...s, tournamentLogo: null }))} style={bSt("rgba(239,68,68,.1)", "#ef4444", { fontSize: 12 })}>
            <Ico name="x" size={12} /> Remove
          </button>}
        </div>
        <input value={state.tournamentLogo || ""} onChange={e => setState(s => ({ ...s, tournamentLogo: e.target.value || null }))} style={{ ...iSt(t, { fontSize: 11, marginTop: 8 }) }} placeholder="Or paste image URL…" />
      </div>
      <div style={cSt(t, { padding: 20, marginBottom: 12 })}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 14 }}>Appearance</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {[{ v: false, label: "Light", icon: "sun" }, { v: true, label: "Dark", icon: "moon" }].map(opt => (
            <button key={String(opt.v)} onClick={() => setState(s => ({ ...s, isDark: opt.v }))}
              style={bSt(opt.v === state.isDark ? t.accent : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", opt.v === state.isDark ? (t.isDark ? "#111" : "#fff") : t.text, { fontSize: 12, padding: "7px 14px" })}>
              <Ico name={opt.icon} size={13} /> {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[["accent", "Primary Accent"], ["accent2", "Secondary"]].map(([key, lbl]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={state[key] || "#ffffff"} onChange={e => setState(s => ({ ...s, [key]: e.target.value }))} style={{ width: 34, height: 34, borderRadius: 8, border: "none", padding: 2, cursor: "pointer", background: "none" }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: t.sub }}>{lbl}</div>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: t.sub }}>{state[key]}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={cSt(t, { padding: 20, marginBottom: 12 })}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 6 }}>Ban System</div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: t.sub }}>Choose which banning rules to use during drafts. This affects how bans are tracked and displayed.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { v: "original", label: "Original System", desc: "Same 16-word pool, 8 different bans per game. Teams ban up to 8 words each game from the shared pool." },
            { v: "new", label: "New System", desc: "+4 bans per game that stack: Game 1 bans 4, Game 2 bans 4 more (8 total), Game 3 bans 4 more (12 total). No Meta Assignments." },
          ].map(opt => (
            <div key={opt.v} onClick={() => setState(s => ({ ...s, banSystem: opt.v }))}
              style={{ display: "flex", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", border: `1.5px solid ${(state.banSystem || "original") === opt.v ? t.accent : t.border}`, background: (state.banSystem || "original") === opt.v ? t.accent + "10" : "transparent", transition: "all .15s" }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${(state.banSystem || "original") === opt.v ? t.accent : t.border}`, background: (state.banSystem || "original") === opt.v ? t.accent : "transparent", flexShrink: 0, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(state.banSystem || "original") === opt.v && <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.isDark ? "#111" : "#fff" }} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: (state.banSystem || "original") === opt.v ? t.accent : t.text }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: t.sub, marginTop: 2 }}>{opt.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 8, background: t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)", border: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: t.accent }}>Active: </span>
          <span style={{ fontSize: 11, color: t.sub }}>{(state.banSystem || "original") === "original" ? "Original — 8 bans per game, same pool all games" : "New — +4 stacking bans per game, no Meta Assignments"}</span>
        </div>
      </div>
      <div style={cSt(t, { padding: 20, marginBottom: 12 })}>
        <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 4 }}>Registration Link</div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: t.sub }}>Toggle whether the Register button is clickable in the public sidebar. Use <code style={{ fontSize: 11 }}>VITE_REGISTRATION_LOCKED=true</code> in .env to hide it entirely.</p>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[{ v: false, label: "Live", icon: "external", col: "#22c55e" }, { v: true, label: "Locked", icon: "lock", col: "#ef4444" }].map(opt => (
            <button key={String(opt.v)} onClick={() => setState(s => ({ ...s, registrationLocked: opt.v }))}
              style={bSt(opt.v === state.registrationLocked ? opt.col : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)", opt.v === state.registrationLocked ? (t.isDark ? "#111" : "#fff") : t.text, { fontSize: 12, padding: "7px 14px" })}>
              <Ico name={opt.icon} size={13} /> {opt.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)", border: `1px solid ${t.border}`, fontSize: 11, color: t.sub }}>
          <span style={{ fontWeight: 600, color: state.registrationLocked ? "#ef4444" : "#22c55e" }}>{state.registrationLocked ? "Locked" : "Live"}</span>
          {" — "}{state.registrationLocked ? "Register button hidden from public sidebar." : "Register button visible to all viewers."}
          {" "}<span style={{ opacity: .6 }}>Default from .env: VITE_REGISTRATION_LOCKED={String(REGISTRATION_LOCKED_DEFAULT)}</span>
        </div>
      </div>
      {/* ── GAME 4 TOGGLE ── */}
      <div style={cSt(t, { padding: 20, marginBottom: 12 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: t.text }}>Game 4</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ v: false, label: "Disabled" }, { v: true, label: "Enabled" }].map(opt => (
              <button key={String(opt.v)} onClick={() => setState(s => ({ ...s, game4Enabled: opt.v }))}
                style={bSt(
                  opt.v === (state.game4Enabled || false)
                    ? (opt.v ? "#22c55e" : t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)")
                    : (t.isDark ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)"),
                  opt.v === (state.game4Enabled || false) ? (opt.v ? (t.isDark ? "#111" : "#fff") : t.text) : t.sub,
                  { fontSize: 12, padding: "6px 14px" }
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: t.sub }}>Adds a 4th game with <strong style={{ color: t.text }}>normal ×1 points, top 5 only</strong> before the Podium. Positions 6–8 earn 0 pts. When enabled, Game&nbsp;4 phases (Draft, Playing, Results) appear in Phase Control and the Scoring tab.</p>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: t.isDark ? "rgba(255,255,255,.04)" : "rgba(0,0,0,.03)", border: `1px solid ${t.border}`, fontSize: 11, color: t.sub }}>
          <span style={{ fontWeight: 600, color: state.game4Enabled ? "#22c55e" : t.sub }}>{state.game4Enabled ? "Enabled" : "Disabled"}</span>
          {" — "}{state.game4Enabled ? "Game 4 phases are active and visible in Phase Control." : "Game 4 phases are hidden. Only Games 1–3 are used."}
        </div>
      </div>
      <div style={cSt(t, { padding: 20, borderColor: "rgba(239,68,68,.22)" })}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#ef4444", marginBottom: 6 }}>Reset Tournament Data</div>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: t.sub }}>Clears all scores, strikes, placements, words, and bonus points. Team names and images are kept.</p>
        <button onClick={doReset} style={bSt("rgba(239,68,68,.1)", "#ef4444", { border: "1px solid rgba(239,68,68,.28)", fontSize: 13 })}>
          <Ico name="trash" size={14} /> Reset All Scores &amp; Data
        </button>
      </div>
    </div>
  );
}

// ─── ADMIN APP: own store, never polls Gist ──────────────────────────────────
function AdminApp({ onLogout, onPublic }) {
  const [state, setState] = useAdminStore();
  const t = getTheme(state);
  const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box - sizing:border-box;}
        html,body{margin:0;padding:0;overflow-x:hidden;}
        body{background:${t.bg};color:${t.text};font-family:'Inter',system-ui,sans-serif;}
        input,select,button,textarea{font - family:inherit;}
        img{max - width:100%;}
        option{background:${t.surface};color:${t.text};}
        details summary{list - style:none;}
        details summary::-webkit-details-marker{display:none;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:4px;}
        @keyframes shake{0 %, 100 % { transform: translateX(0) }20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        @keyframes pulse{0 %, 100 % { opacity: 1 }50%{opacity:.25}}
        `;
  return (
    <>
      <style>{css}</style>
      <div style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", gap: 3, background: t.isDark ? "rgba(0,0,0,.88)" : "rgba(255,255,255,.94)", padding: "4px 5px", borderRadius: 24, backdropFilter: "blur(12px)", border: `1px solid ${t.border}` }}>
        <button onClick={onPublic} style={{ padding: "5px 13px", borderRadius: 18, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: t.sub }}>Public</button>
        <button style={{ padding: "5px 13px", borderRadius: 18, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: t.accent, color: t.isDark ? "#111" : "#fff" }}>Admin</button>
      </div>
      <Admin state={state} setState={setState} t={t} onLogout={onLogout} />
    </>
  );
}

// ─── PUBLIC APP: own store, polls Gist, never writes ─────────────────────────
function PublicApp({ onAdminClick }) {
  const state = usePublicStore();
  const t = getTheme(state);
  const css = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box - sizing:border-box;}
        html,body{margin:0;padding:0;overflow-x:hidden;}
        body{background:${t.bg};color:${t.text};font-family:'Inter',system-ui,sans-serif;}
        input,select,button,textarea{font - family:inherit;}
        img{max - width:100%;}
        option{background:${t.surface};color:${t.text};}
        details summary{list - style:none;}
        details summary::-webkit-details-marker{display:none;}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:${t.border};border-radius:4px;}
        @keyframes shake{0 %, 100 % { transform: translateX(0) }20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        @keyframes pulse{0 %, 100 % { opacity: 1 }50%{opacity:.25}}
        `;
  return (
    <>
      <style>{css}</style>
      <PublicView state={state} onAdminClick={onAdminClick} />
    </>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(false);
  const [view, setView] = useState("public"); // "public" | "login" | "admin"

  if (view === "admin" && auth)
    return <AdminApp onLogout={() => { setAuth(false); setView("public"); }} onPublic={() => setView("public")} />;

  if (view === "login" && !auth) {
    // Need theme for login screen — use a minimal local state
    const t = DARK; // default dark for login
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          *,*::before,*::after{box-sizing:border-box;}
          html,body{margin:0;padding:0;background:${t.bg};color:${t.text};font-family:'Inter',system-ui,sans-serif;}
          @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
        `}</style>
        <div style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", gap: 3, background: "rgba(0,0,0,.88)", padding: "4px 5px", borderRadius: 24, backdropFilter: "blur(12px)", border: `1px solid ${t.border}` }}>
          <button onClick={() => setView("public")} style={{ padding: "5px 13px", borderRadius: 18, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: t.sub }}>Public</button>
          <button style={{ padding: "5px 13px", borderRadius: 18, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: t.sub }}>Login</button>
        </div>
        <Login t={t} onLogin={() => { setAuth(true); setView("admin"); }} />
      </>
    );
  }

  // Default: public view
  return <PublicApp onAdminClick={() => { if (auth) setView("admin"); else setView("login"); }} />;
}
