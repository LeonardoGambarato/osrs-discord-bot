# OSRS Discord Commerce System

A production-ready backend system built on Discord for Old School RuneScape service communities. Handles real user transactions, wallet management, and automated service pricing through a fully interactive Discord interface.

---

## What it does

Users interact with the bot through slash commands, buttons, and select menus to:

- Browse and purchase OSRS services with dynamic skill-level pricing (levels 1–99)
- Manage a personal wallet — check balance, deposit, and track transaction history
- Receive automated order confirmations and status updates

Admins operate a separate control layer with user lookup, balance adjustments, and a full audit log of every transaction.

---

## Architecture decisions

**PostgreSQL for financial data**
Wallets and transaction records are stored relationally to guarantee consistency. Each operation is structured to prevent double-spending and maintain a reliable audit trail.

**Firebase for auxiliary storage**
Used for fast-read operations that don't require relational integrity — configuration, catalog data, and session state.

**JavaScript throughout**
Strict typing across the entire codebase. Financial logic and pricing calculations are fully typed to catch errors at compile time rather than in production.

**Modular command architecture**
Each Discord command is an isolated module with its own handler, validation, and database interaction. Adding new commands or pricing rules doesn't touch existing logic.

---

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Language | JavaScript |
| Discord interface | Discord.js v14 |
| Primary database | PostgreSQL |
| Auxiliary storage | Firebase |
| Version control | Git |

---

## Core features

- **Wallet engine** — persistent per-user balance with full transaction history
- **Dynamic pricing** — skill-level based calculation (1–99) with custom rules per service
- **Interactive UI** — slash commands, button components, and select menus
- **Purchase flow** — end-to-end automated order processing
- **Admin panel** — real-time user management, balance control, and logging

---

## Project structure

```
src/
├── commands/       # Slash command handlers (one file per command)
├── components/     # Button and select menu interaction handlers  
├── database/       # PostgreSQL queries and Firebase client
├── services/       # Business logic (pricing engine, wallet operations)
├── utils/          # Shared helpers and validators
└── index.ts        # Bot entry point and event registration
```

---

## Setup

```bash
# Clone the repository
git clone https://github.com/leonardogambarato/osrs-discord-system

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Fill in: DISCORD_TOKEN, DATABASE_URL, FIREBASE_CONFIG

# Run in development
npm run dev

# Build for production
npm run build && npm start
```

---

## Environment variables

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DATABASE_URL=
FIREBASE_API_KEY=
FIREBASE_PROJECT_ID=
```

> Never commit your `.env` file. A `.env.example` with empty values is included.

---

Built with Node.js · TypeScript · Discord.js · PostgreSQL · Firebase
