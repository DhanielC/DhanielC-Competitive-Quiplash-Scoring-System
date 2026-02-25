# Formula Q Championship 2026 — Official Rulebook & Web App

> Competitive Ranked Quiplash 3 — Tournament rules, scoring, and quickstart for the web scoreboard and admin UI.

This repository hosts the Formula Q Championship 2026 web app — a live public stream view and an admin dashboard to manage teams, drafts, scoring, bans, and results for a Competitive Ranked Quiplash 3 tournament.

## Table of Contents
* About
* Quickstart
* Environment Variables
* Using the App
* Rules (summary)
    * The Paddock (Team Dynamics)
    * Championship Point System
    * Three Strikes (Banned Word System)
    * Meta Word Pool & Collision Rule
    * Gameplay Flow & Comms Rules
    * Tiebreakers
* Storage & Sync (Supabase)

---

## About

Formula Q Championship 2026 is a structured, competitive Quiplash 3 tournament for 16 players randomized into 8 two-person teams (Player + Coach). The goal is to accumulate the most Championship Points across three games while managing banned words, strikes, and meta-word bonus mechanics. 

This repository contains the scoreboard and admin interface used by Race Control to run the event, publish to the public stream, and manage scoring in real time.

---

## Quickstart (local)

Install dependencies and run the Vite dev server:

npm install
npm run dev

Open the app in your browser (Vite defaults to http://localhost:5173).

---

## Environment Variables

To fully utilize the app's features, including the admin panel and live syncing, create a `.env` file in your root directory and configure the following variables:

* VITE_ADMIN_PASSWORD: Secures the admin dashboard.
* VITE_SUPABASE_URL: Your Supabase project URL, required for live state syncing.
* VITE_SUPABASE_ANON_KEY: Your Supabase anonymous key.
* VITE_REGISTRATION_FORM_URL: The link attached to the "Register" button in the public sidebar.
* VITE_REGISTRATION_LOCKED: Set to "true" to lock and disable the public registration button.

---

## Using the App

* Public view: Live scoreboard visible to viewers. Shows tournament name, active phase, games, team standings, and the Coach Championship.
* Admin view: Requires the admin password. Manage phases, drag-and-drop scoring, strikes, meta/draft words, settings, and the team roster.
* Pre-game team popup: Click a team card in the Pre-Game view to open a modal with player/coach details and team quotes.

---

## Rules (summary)

### 1. The Paddock (Team Dynamics)
* 16 players randomized into 8 teams.
* Each team consists of a Player (Driver) and a Coach.

### 2. Championship Point System
Points are awarded at the end of each Game based on final in-game placement. Game 3 acts as a multiplier and is worth double points.

### 3. The "Three Strikes" Banned Word System
If a Player includes a currently banned word in their answer, they receive a strike (tracked across all 3 Games):
* 1st Strike: −2 Championship Points.
* 2nd Strike: −6 Championship Points (cumulative).
* 3rd Strike (DNF): 0 points for that Game, resulting in a Disqualified/Did Not Finish status.

### 4. Meta Word Pool & Ban Modes
The admin panel allows you to toggle between two distinct ban systems:
* Original System: Teams share a 16-word pool and ban up to 8 words per game. Words can be specifically assigned to teams as Meta Words.
* New System: Teams ban up to 4 new words per game. These bans carry over and stack, resulting in 4 bans in Game 1, 8 in Game 2, and 12 in Game 3. Meta assignments are disabled in this mode.

Successfully utilizing an active Meta Word grants +1 Bonus Point. However, under the Collision Rule, if two teams use the exact same Meta Word in a single game, neither receives the bonus.

### 5. Tiebreakers
If teams tie in Championship Points after Game 3, the winner is determined by the highest number of Meta Word Bonus Points. In the Coach Championship, ties are broken by the team with the fewest penalty strikes.

---

## Storage & Sync (Supabase)

This app replaces the legacy GitHub Gist polling with instant WebSocket synchronization powered by Supabase Realtime. 

* Live Updates: The app utilizes a WebSocket endpoint to push state changes to all public screens the moment the admin clicks "Save". Zero polling is required.
* Database Schema: The app relies on a `tournament_state` Postgres table.
* Local Fallback: If Supabase environment variables are missing, the app seamlessly falls back to `localStorage`.
* Cross-Tab Sync: A `BroadcastChannel` is implemented to ensure instant cross-tab synchronization within the same browser, supplementing the server setup.

### Supabase Setup

Run the following SQL in your Supabase SQL Editor to initialize the database:

```sql
CREATE TABLE tournament_state (
  id TEXT PRIMARY KEY DEFAULT 'main',
  state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime on the table
ALTER TABLE tournament_state REPLICA IDENTITY FULL;

-- Insert initial empty row
INSERT INTO tournament_state (id, state) VALUES ('main', '{}');

