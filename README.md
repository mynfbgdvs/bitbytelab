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
- `public/game.html?id=<id>` — play a game (three.js preview + Socket.io lobby + player sync)
- `public/games.html` — catalog view
- `public/login.html` — login
- `public/register.html` — register

## Project structure

- `server.js` — Express server + Socket.io
- `src/` — lightweight JSON DB + routes + middleware
- `public/` — front-end static pages (index, studio, player)

Customize branding, add a real DB (Mongo/Postgres) or a cloud storage for assets when you're ready. Enjoy! ✨
