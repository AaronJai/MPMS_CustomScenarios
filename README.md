# Scenario Builder MVP (Trend Data Only)

## 1. Core Flow

1. **Select columns** → choose which vitals to include (HR, SpO₂, etCO₂, RR, etc.).
    - Defaults: HR=70, SpO₂=98, RR=14, etCO₂=35.
    - Unused columns remain blank on export.
2. **Edit signal** → click a column → open its graph.
    - Show time axis (default 30 min @ 1 Hz).
    - Drag points to shape the curve.
    - Zoom presets: 1s, 30s, 5m, 10m.
3. **Preview** → stacked mini-charts of other signals.
    - Clicking swaps which one is editable.
4. **Export** → generate CSV/XLSX with the exact UQ headers.
    - Only selected signals filled, others empty.
    - Validates time monotonic + simple ranges.

---

## 2. Screens (~3 total)

1. **Home**
    - New Scenario / Open / Export.
2. **Column Picker**
    - Checklist of available UQ columns.
    - Defaults applied automatically.
3. **Editor**
    - One large graph (active signal).
    - Drag points, add/remove with click.
    - Zoom + pan.
    - Mini-charts below for quick switching.

---

## 3. Must-have Features

- Column selection with sensible defaults.
- Graph editor (drag points, linear interpolation).
- Time axis scroll/zoom.
- Export to Excel/CSV matching UQ format.
- Basic validation (time, value ranges).

## Minimal File Hierarchy
```plaintext
src/
├── App.tsx                 # tiny router/switch between ColumnSelect and Editor
├── main.tsx                # React entry
├── styles.css              # one stylesheet for now
│
├── data/
│   └── columns.ts          # STATIC UQ headers + units + min/max + defaults
│
├── state/
│   └── store.ts            # single Zustand store (selected columns, points, duration, sampleRate)
│
├── views/
│   ├── ColumnSelect.tsx    # checklist UI (choose signals), apply defaults
│   └── Editor.tsx          # one big chart + zoom + add/move/delete points
│
├── components/
│   ├── Graph.tsx           # the editable line chart (draggable control points)
│   └── Toolbar.tsx         # zoom presets, export button
│
├── export.ts               # make CSV/XLSX with exact UQ headers
└── validate.ts             # simple guards (monotonic time, value ranges)
```