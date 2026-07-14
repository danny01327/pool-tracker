# Pool Boy

A pool test log and balancing assistant based on the [Trouble Free Pool (TFP)](https://www.troublefreepool.com/) method.

## Features

- **Accounts** — sign up/sign in with email + password (via Supabase Auth); each user's data is private.
- **Test logging** — FC, CC, pH, TA, CH, CYA, salt (for SWG pools), TDS, water temp, notes.
- **TFP recommendations** — CYA-linked FC target ranges, plus pH/TA/CH/CYA/salt status and guidance.
- **Dosing calculator** — a wide range of chlorine/pH/TA/CH/CYA/salt/borates products and how much of each to add for your pool volume.
- **Water balance (CSI)** — Calcite Saturation Index (TDS-aware) so you know if water is corrosive or scale-forming.
- **Trends** — charts of FC, pH, CYA, TA, CH (and salt) over time.
- **SLAM tracker** — guided algae-clearing process with daily checks and the three TFP exit criteria (OCLT, CC, water clarity).
- **Multiple pools**, JSON export/import for backup, dark mode, installable as a PWA.

Test history is stored in a Supabase (Postgres) database, scoped to your account via Row Level Security — it syncs across any device you sign into.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql) once to create the tables and security policies.
3. In Project Settings → API, copy the **Project URL** and **anon public** key.
4. Copy `.env.example` to `.env.local` and fill in those two values.
5. For the deployed Netlify site, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables (`netlify env:set NAME value`, or Site configuration → Environment variables in the dashboard) — the build reads them from there.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Deployed on Netlify at **[pool-boy-app.netlify.app](https://pool-boy-app.netlify.app)**. To ship a change:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```
