# Formula Q Championship 2026 — Official Rulebook & Web App

> Competitive Ranked Quiplash 3 — Tournament rules, scoring, and quickstart for the web scoreboard and admin UI.

This repository hosts the Formula Q Championship 2026 web app — a live public stream view and an admin dashboard to manage teams, drafts, scoring, bans, and results for a Competitive Ranked Quiplash 3 tournament.

## Table of Contents
- About
- Quickstart
- Using the App
- Rules (summary)
  - The Paddock (Team Dynamics)
  - Championship Point System
  - Three Strikes (Banned Word System)
  - Meta Word Pool & Collision Rule
  - Gameplay Flow & Comms Rules
  - Game-by-Game Breakdown
  - Tiebreakers
- Contributing
- License

## About

Formula Q Championship 2026 is a structured, competitive Quiplash 3 tournament for 16 players randomized into 8 two-person teams (Player + Coach). The goal is to accumulate the most Championship Points across three games while managing banned words, strikes, and meta-word bonus mechanics.

This repository contains the scoreboard and admin interface used by Race Control to run the event, publish to the public stream, and manage scoring in real time.

## Quickstart (local)

Install dependencies and run the Vite dev server:

```bash
npm install
npm run dev
```

Open the app in your browser (Vite defaults to http://localhost:5173).

## Using the App

- Public view: Live scoreboard visible to viewers. Shows tournament name, active phase, games, and standings.
- Admin view: Requires admin access. Manage phases, scoring, strikes, meta/draft words, and team roster.
- Pre-game team popup: Click a team card in the Pre-Game view to open a modal with player/coach details.

## Rules (summary)

### 1. The Paddock (Team Dynamics)
- 16 players → randomized into 8 teams.
- Each team has two roles:
  - Player (Driver): Submits answers on stream and interacts in the main lobby.
  - Coach (Pit Wall): Strategizes privately with the Player in a private channel.
- Match length: 3 Games. Goal: accumulate the most Championship Points across the 3 Games.

### 2. Championship Point System

Points are awarded at the end of each Game based on final in-game placement. Game 3 is double points.

| Placement | Game 1 & 2 | Game 3 (×2) |
|---:|:---:|:---:|
| 1st | 12 | 24 |
| 2nd | 10 | 20 |
| 3rd | 8  | 16 |
| 4th | 6  | 12 |
| 5th | 4  | 8  |
| 6th | 2  | 4  |
| 7th | 1  | 2  |
| 8th | 0  | 0  |

### 3. The "Three Strikes" Banned Word System

- At tournament start Race Control reveals a Master 16 Meta Words list.
- Before each Game, the lobby bans 4 words for that Game.
- If a Player includes a currently banned word in their answer, they receive a strike (tracked across all 3 Games):
  - Strike 1 (Slip-Up): −2 Championship Points at the end of the Game.
  - Strike 2 (Repeat Offender): −4 Championship Points at the end of the Game.
  - Strike 3 (DNF): 0 points for that Game (team disqualified for that Game — they receive zero even if they placed 1st).

Strikes accumulate across Games.

### 4. Meta Word Pool & "The Collision Rule"

- The Meta Words remaining after bans form the Active (Free-for-All) Pool.
- Teams may optionally include Active Meta Words in answers to earn bonus points; Teams are not restricted to using only the 16 Meta Words.
- Bonus: Successfully using a unique Active Meta Word in a winning answer awards +1 Bonus Championship Point for that Game.
- Collision Rule: If two or more teams use the exact same Active Meta Word in the same Game, the word is considered a collision — no bonus is awarded for that specific word.

### 5. Official Gameplay Flow & Comms Rules

Comms Rule: In the Main Lobby voice channel only Players may speak. Coaches must remain muted in public channels and may only speak privately with their Player in their Team Room.

Gameplay steps per Game:
1. Briefing (Main Lobby): Race Control displays Master 16 and current bans.
2. Ban Vote (Main Lobby): Each team votes to ban 4 active Meta Words for the Game.
3. Prompting Phase (Team Rooms): Players + Coaches go to private channels to brainstorm and submit answers.
4. Presentation Phase (Main Lobby): Teams return, answers are shown on-stream, and votes are cast.
5. Checkered Flag: Race Control tallies placements, applies strike penalties, and awards bonus Meta Word points.

### 6. The Track (Game-by-Game Breakdown)

- Game 1 (Open Straight): 0 initial bans. Teams vote to ban 4 words → 12 Active words remain.
- Game 2 (Chicane): The 4 words banned in Game 1 remain banned. Teams ban 4 more → 8 Active words remain.
- Game 3 (Hairpin — Double Points): The 8 previously banned remain banned. Teams ban 4 more → 4 Active words remain. Game 3 points are doubled.

### 7. Tiebreakers

If two teams are tied on Championship Points after Game 3, the tie is broken by the number of Meta Word Bonus Points scored across the tournament (team with more bonus points wins the tie).

## App specifics & conventions

- The app persists state to localStorage (key: `quiplash_v4`).
- Game 3 multiplier and strike deductions follow the rulebook above and are implemented in the scoring helpers.
- Public vs Admin: Admin controls phases, scoring, draft, and team management. Use the Admin button on the public page to log in.

## Contributing

Contributions, improvements, and issue reports are welcome. Please open an issue describing the change or fork and submit a pull request.

## License

This repo does not include a license by default. Add a `LICENSE` file (for example, `MIT`) if you want to make the code permissively reusable.

---

# Competitive Quiplash Scoring System

A lightweight React + Vite scoring system web app template — the codebase for the "Scoring System" project. It includes a minimal React setup powered by Vite, ESLint, and a small app scaffold in `src/`.

## Key Features

- Modern front-end stack: React + Vite for fast dev server and builds
- ESLint configuration for consistent code style
- Tiny, easy-to-extend starter structure for building scoring or dashboard apps

## Prerequisites

- Node.js 18+ and npm (or yarn)
- Git (for cloning and version control)

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Run the development server (Hot Module Replacement enabled)

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

4. Preview the production build locally

```bash
npm run preview
```

## Available NPM Scripts

- `dev` — start Vite dev server
- `build` — build production assets
- `preview` — preview the production build locally
- (add `lint` or `test` if you add tooling later)

## Project Structure (high level)

- `index.html` — app entry HTML
- `package.json` — scripts & dependencies
- `vite.config.js` — Vite config
- `src/` — React source files
	- `src/main.jsx` — app bootstrap
	- `src/App.jsx` — main app component
	- `src/assets/` — images/icons

## How to contribute

1. Fork the repo and create a feature branch
2. Make changes and run the dev server locally
3. Open a pull request with a clear description of the change

If you want help with CI, tests, or adding TypeScript, I can add them.

## Troubleshooting

- If you see authentication errors when pushing, configure `gh auth login`, use an SSH key, or create a GitHub Personal Access Token and configure your git credential manager.

## License

Specify your project license here (e.g., MIT) or contact the repo owner for details.

---

If you'd like, I can also:

- Add a short usage example or demo data
- Add a contributor guide or issue templates
- Add CI workflow for builds and previews

Tell me which of these you'd like next.
