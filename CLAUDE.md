# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Met Accounting v2 is a full-stack metallurgical accounting system for a CIL (Carbon-In-Leach) gold processing plant. It tracks daily data entry, mass balance calculations, gold recovery, and reconciliation across 8 sampling points from ROM Feed through to Smelted Gold Bar.

**Stack:** React Router 7 (SSR), React 19, MongoDB (Mongoose 9), TypeScript, TailwindCSS v4, Vite 7, Playwright

## Commands

- `npm run dev` - Dev server with HMR (port 5173)
- `npm run build` - Production build
- `npm start` - Serve production build via react-router-serve
- `npm run typecheck` - TypeScript validation + type generation
- `npm run seed` - Seed MongoDB with 7 days of demo data (runs `tsx scripts/seed-demo.ts`)
- `npx playwright test` - Run E2E test suite
- `npx playwright test tests/app.spec.ts --grep "test name"` - Run a single test

## Architecture

### Server-Client Boundary

Files with `.server.ts` suffix are server-only (auth, db, models, services). The `~/*` path alias maps to `./app/*`.

### Routing

Routes are defined in `app/routes.ts` using React Router's `route()` helper. All authenticated routes use the `_auth.tsx` layout wrapper which calls `requireAuth(request)` and renders a sidebar + outlet.

```
/login, /logout          - Public auth routes
/                        - Dashboard (_auth.dashboard.tsx)
/data-entry              - Tonnage & assay entry (_auth.data-entry.tsx)
/mass-balance            - Feed/product/tailings balance (_auth.mass-balance.tsx)
/recovery                - Gold recovery tracking (_auth.recovery.tsx)
/monthly                 - Monthly rollup & CSV export (_auth.monthly.tsx)
```

### Data Flow

1. **Route loaders** call services, serialize Mongoose docs with `JSON.parse(JSON.stringify(doc))`, and return data
2. **Route actions** process form submissions, call services, return `{success, message}` or `{error}`
3. **Services** (`app/lib/services/*.server.ts`) contain business logic and database operations
4. **Models** (`app/lib/models/*.server.ts`) define Mongoose schemas with computed fields

### Authentication

Cookie-based sessions with JWT tokens. `auth.server.ts` provides `requireAuth(request)` (throws redirect to /login), `getUserFromSession(request)` (returns null), `login()`, `logout()`, and `createUserSession()`. A shared access password (`ACCESS_PASSWORD` env var, default: `met2024`) allows login with any username.

User roles: `admin`, `met_accountant`, `plant_manager`, `lab_technician`.

### Precision & Calculations

All metallurgical math uses `Decimal.js` via `app/lib/utils/precision.ts` (20 decimal places, ROUND_HALF_UP). Key functions: `calcDryTonnes`, `calcContainedMetal`, `calcWeightedAvgGrade`, `calcRecovery`. Precision constants are in `app/lib/config/constants.ts`.

### Data Status Workflow

ProcessingData records progress through: `draft` -> `preliminary` -> `final` -> `locked`.

### Key Models

- **ProcessingData** - Wet/dry tonnes per sampling point per period (pre-save calculates dryTonnes)
- **Assay** - Grade (g/t) linked to ProcessingData, with verification workflow
- **MassBalance** - Aggregated feed/product/tailings with unaccounted metal calculation
- **Recovery** - Gold recovery % vs budget target (default 87%)
- **Reconciliation** - Flags discrepancies exceeding threshold (default 2%)

## Environment Variables

Required in `.env`: `MONGODB_URI`, `SESSION_SECRET`, `JWT_SECRET`. See `.env` for all variables.

## Testing

Playwright E2E tests in `tests/app.spec.ts` cover auth, navigation, data entry, mass balance, recovery, and monthly reports. Tests expect the seed data (Feb 21-27, 2026) and run against `http://localhost:5173`. Default login: `admin` / `admin123`.
