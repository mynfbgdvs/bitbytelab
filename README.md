# Techy Website

A small Node.js + static front-end app for a tech-focused company. This repo contains a minimal backend (`server.js`) using Express and a modern static front-end in `public/` (`index.html`, `styles.css`, `app.js`).

## Quick start ✅

1. Install dependencies

```bash
npm install
```

2. Run in development (optional: requires `nodemon`)

```bash
npm run dev
```

3. Start normally

```bash
npm start
```

## Endpoints 🔧

- `GET /api/status` — health check (returns JSON)
- `POST /api/contact` — accepts JSON `{ name, email, message }` and persists to `messages.json`
- `POST /api/auth/register` — register: `{name,email,password}` -> `{token}`
- `POST /api/auth/login` — login: `{email,password}` -> `{token}`
- `GET /api/games` — list games
- `GET /api/games/:id` — get a game
- `POST /api/games` — create a game (requires `Authorization: Bearer <token>`) with `{title, data}`
- `GET /api/assets` — list uploaded assets
- `POST /api/assets/upload` — upload asset (requires `Authorization: Bearer <token>`) with form field `file`

## Front-end pages

- `public/studio.html` — simple Creator Studio (upload assets, create block levels, save to catalog)
- `public/studio_blockly.html` — Scratch-like block editor supporting **2D** and **3D** game scripting (uses Blockly)
- `public/game.html?id=<id>` — play a game (three.js preview + Socket.io lobby + player sync; detects 2D/3D game types)
- `public/games.html` — catalog view
- `public/login.html` — login
- `public/register.html` — register

## Project structure

- `server.js` — Express server + Socket.io
- `src/` — lightweight JSON DB + routes + middleware
- `public/` — front-end static pages (index, studio, player)

Customize branding, add a real DB (Mongo/Postgres) or a cloud storage for assets when you're ready. Enjoy! ✨

---

## Dependency updates (Dependabot) ✅

This repository includes Dependabot configuration at `.github/dependabot.yml` which will:
- Open weekly PRs to update `npm` dependencies and `github-actions` workflows.
- Limit to 10 open PRs at a time to avoid flooding the repo.

When a Dependabot PR opens, review, run CI locally (or rely on Actions), then merge. You can configure auto-merge rules via Settings or a dedicated workflow if you want automated merges for minor/patch updates.

## Triggering GitHub Actions (how-tos) ▶️

You can trigger the workflows in the repo in several ways:

1. Push to the source branch
   - The promotion workflows are triggered by pushes to specific branches:
     - push to `upload` → runs `promote_upload_to_alpha` workflow
     - push to `alpha` → runs `promote_alpha_to_beta` workflow
     - push to `beta` → runs `promote_beta_to_latest` workflow
   - Example: create a commit and `git push origin upload`.

2. Manually from GitHub UI
   - Go to the **Actions** tab, select the workflow (e.g., "Promote Alpha → Beta"), and click **Run workflow**. This works because the workflows include `workflow_dispatch` triggers.

3. Using the GitHub CLI (`gh`)
   - Install the GitHub CLI and authenticate (`gh auth login`).
   - List workflows: `gh workflow list`.
   - Trigger a workflow: `gh workflow run "Promote Alpha → Beta" --ref alpha` (adjust workflow name and ref as needed).

4. Trigger via REST API
   - You can call the workflow dispatch endpoint with a PAT: `POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches` with body `{ "ref": "alpha" }`.

Notes:
- Automatic promotion workflows create and attempt to merge PRs. If a merge conflict occurs the workflow's merge step will fail and manual resolution is required.
- Dependabot PRs will be created automatically; you can also trigger Dependabot updates manually from the GitHub UI if needed.

If you'd like, I can add an auto-merge workflow for Dependabot minor/patch updates (requires repository configuration to allow it).