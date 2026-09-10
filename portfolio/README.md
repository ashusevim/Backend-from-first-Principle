# Devfolio — Developer Portfolio Builder

A local-first portfolio builder made specifically for developers. No account, no
database — data lives in the browser until you export it.

## Run it

```bash
cd portfolio
npm install
npm run dev      # http://localhost:3100
```

## What it does

- **Builder** (`/builder`) — profile, about, skills, projects, experience,
  education, certifications, socials, design — with instant live preview
- **4 templates** — Minimal, Developer, Modern, Terminal. One shared data model,
  switching never loses content
- **GitHub import** — avatar, bio + cherry-picked repositories via the public API
- **Resume import** — best-effort PDF/TXT parsing, always review-before-publish
- **Export** — standalone `index.html`, hostable project `ZIP`, clean print/PDF,
  and `portfolio.json` backup/restore
- **Local-first** — autosaves to localStorage, survives refresh, reset anytime

## Architecture

```text
src/
├── app/            # /, /builder, /templates, /preview, /about
├── components/
│   ├── builder/    # editor panels + live preview shell
│   ├── templates/  # the 4 templates + shared shell/registry
│   ├── landing/    # hero preview
│   └── ui/         # shadcn-style primitives, toast, dialog
├── hooks/          # use-portfolio (state + autosave)
├── lib/            # storage, github, resume, export-html, export-zip, design
├── types/          # portfolio schema (Zod) + validation
└── data/           # realistic sample portfolio
```

Key invariants:

- `Portfolio` (in `src/types/portfolio.ts`) is the single source of truth.
- `parsePortfolio()` repairs partial/malformed data — imports never crash the app.
- Export HTML is dependency-free and works offline; the ZIP writer is
  dependency-free too (stored entries, validated with system `unzip`).

## Smoke tests

```bash
npx -y tsx scripts/smoke.mts   # schema repair, exports, zip, resume parsing
```

## Stack

Next.js 14 · TypeScript · Tailwind · Zod · lucide-react. No database, no auth,
no analytics dashboard — by design.
