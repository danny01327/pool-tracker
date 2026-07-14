# Pool Tracker

A local-first pool test log and balancing assistant based on the [Trouble Free Pool (TFP)](https://www.troublefreepool.com/) method.

## Features

- **Test logging** — FC, CC, pH, TA, CH, CYA, salt (for SWG pools), water temp, notes.
- **TFP recommendations** — CYA-linked FC target ranges, plus pH/TA/CH/CYA/salt status and guidance.
- **Dosing calculator** — how much chlorine, acid, soda ash, baking soda, calcium chloride, CYA, salt, or borates to add for your pool volume.
- **Water balance (LSI)** — Langelier Saturation Index so you know if water is corrosive or scale-forming.
- **Trends** — charts of FC, pH, CYA, TA, CH (and salt) over time.
- **SLAM tracker** — guided algae-clearing process with daily checks and the three TFP exit criteria (OCLT, CC, water clarity).
- **Multiple pools**, JSON export/import for backup, installable as a PWA.

All data is stored only in the browser (localStorage) — nothing is sent to a server.

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
