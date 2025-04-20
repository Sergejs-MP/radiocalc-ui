---
## radiocalc-ui/README.md

```markdown
# Radiocalc UI – Vite + React + MUI

Frontend SPA that talks to the FastAPI backend and visualises survival, TCP/NTCP curves, QUANTEC limits, and OAR risk.

---
## Table of Contents
1. [Quick start](#quick-start)
2. [Project layout](#project-layout)
3. [Running in development](#running-in-development)
4. [Environment variables](#environment-variables)
5. [Build & deploy](#build--deploy)

### Quick start
```bash
# inside radiocalc-ui/
npm install
npm run dev           # default http://localhost:5173
````

### Project layout

```
radiocalc-ui/
├── src/
│   ├── App.tsx              # main component
│   ├── components/
│   │   ├── TcpNtcpPlot.tsx
│   │   └── TcpNtcpPlotMulti.tsx
│   ├── data/                # JSON presets & limits
│   └── index.tsx
├── public/
├── vite.config.ts
├── package.json
└── README.md                # you are here
```

### Running in development

- Backend must be running on another port (e.g. 8000).
- Create `.env`:
  ```env
  VITE_API=http://localhost:8000
  ```
- `npm run dev` – opens hmr server; auto‑reloads on save.

### Environment variables

| Variable   | Purpose                     |
| ---------- | --------------------------- |
| `VITE_API` | Base URL of FastAPI backend |

### Build & Deploy

```bash
npm run build           # generates dist/
```

#### Netlify

- Point site to **radiocalc-ui/**, build command `npm run build`, publish `dist/`.
- Add environment var `VITE_API` in Netlify dashboard.

#### GitHub Pages (static)

```bash
npm install -g serve
serve -s dist
```

---

### Feature flags & folders

| Folder                         | Purpose                      |
| ------------------------------ | ---------------------------- |
| `src/data/tumour_presets.json` | default tumour α/β, D50, γ₅₀ |
| `src/data/oar_limits.json`     | QUANTEC limits table         |
| `src/components/*Plot*.tsx`    | Plotly renderers             |

---

### Development notes

- Uses **Material‑UI v5** – theme overrides in `src/theme.ts` (optional).
- Plot colours follow MUI primary (`#2196f3`) and error (`#dc3545`).
- State management is kept in `App.tsx`; no Redux.
- For analytics, call `posthog.capture()` after each successful calc (optional).

```

---
Copy each block into the respective folder (`backend/README.md`, `radiocalc-ui/README.md`) or leave this single collection file at project root if you prefer.

```
