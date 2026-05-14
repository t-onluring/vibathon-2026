# HANDOFF — Source List Kajian Sunnah (Vibathon 2026)

> **Generated**: 2026-05-14
> **Project root**: `/var/home/tehaer/projects/HSI_Vibathon/`
> **Codebase**: `codebase/vibathon-2026/`
> **Repo**: [github.com/t-onluring/vibathon-2026](https://github.com/t-onluring/vibathon-2026)
> **Vibathon window**: 14 Mei 09:00 → 16 Mei 09:00 WIB · Showcase 16 Mei 20:00 WIB

---

## 🎯 GOAL

Membangun **Source List Kajian Sunnah Indonesia** sebagai **Layer 1 infrastructure** (open registry sumber kajian + automated reliability monitoring) untuk submisi VIBATHON 2026.

Konsep: bukan aggregator, bukan end-user app — tapi **registry of sources** yang dipakai aggregator/app lain. Inspirasi: Ubuntu mirror list, OPML, Uniswap token list.

End-game multi-phase:
- **Phase 0 (konsolidasi)** — kumpulkan source dari thread Telegram, FP history, WAG Kaskus, HSI ecosystem
- **Phase 1 (Vibathon scope)** — Telegram health checker + dashboard publik
- **Phase 2** — extend ke YouTube/Web/Facebook/Instagram
- **Phase 3** — open contribution (Git PR-based)
- **Phase 4** — public dataset (Hugging Face) + showcase app

Vibathon scope = Phase 1 di-bundle jadi web app deployable.

---

## 🧠 DECISIONS

### Strategic
1. **Layer 1 positioning** — bukan kompetitor portalkajian.online/jadwalkajian.com/forumkajian.com (mereka Layer 2/3), kita data supplier mereka. Win-win, bukan zero-sum.
2. **Reliability score formula** — composite (40% freshness, 25% consistency, 20% volume, 10% engagement, 5% diversity). MVP pakai freshness only (lainnya butuh historical data).
3. **Hormati robots.txt** — portalkajian.online punya `Disallow: /api/` walaupun endpoint public. Outreach via WA admin (`6281392135904`) sebagai partner, bukan target scrape.
4. **Telegram dipilih sebagai platform Phase 1** — paling mudah (`t.me/s/{handle}` HTML, no auth, no API key, no rate-limit ban kalau staggered).

### Technical
5. **Stack**: Next.js 16 + React 19 + Tailwind 4 + TypeScript (sudah scaffolded di Step 1). Static export ke Netlify.
6. **Data store = JSON in Git repo** — no database. `data/sources.json` (manual seed), `data/latest.json` + `data/health/YYYY-MM-DD.json` (cron output, auto-committed).
7. **Cron runner = GitHub Actions** — free, commit hasil balik ke repo dengan `[skip ci]`.
8. **Scraper = `cheerio` + native `fetch`** — Node 20+, zero anti-bot stack needed for `t.me/s/*`.
9. **3x retry + 5s stagger** untuk resilience (Telegram throttling intermittent).
10. **Dual-tab UI** mengikuti pola [thariqs.github.io/html-effectiveness](https://thariqs.github.io/html-effectiveness/):
    - Tab 01 (Plan & Roadmap) — render `.md` dari `data/docs/` pakai `react-markdown`
    - Tab 02 (Live Dashboard) — render `data/latest.json`
11. **Aesthetic palette** — ivory `#FAF9F5`, slate `#141413`, clay `#D97757`, oat `#E3DACC`, olive `#788C5D`. Serif (italic clay accent) untuk headline, sans untuk body, mono untuk eyebrow/tags.
12. **Cron Trigger UX** — 2 mode di Tab 02:
    - **Manual**: button → buka GitHub Actions UI (zero-auth) ATAU instant trigger dengan PAT (disimpan opt-in di localStorage)
    - **Automatic**: hour/minute picker WIB → generate cron UTC expression → copy + link edit YAML

### Pre-event clarification
13. **Confirmed dengan panitia**: code yang dibuat sebelum 14 Mei 09:00 WIB OK dipakai sebagai starter (per user note di chat).

---

## 📂 FILES TOUCHED

### Roadmap docs (di `/var/home/tehaer/projects/HSI_Vibathon/roadmaps/`)
| File | Status | Nature |
|---|---|---|
| `source-list-kajian.md` | created v0.3 | Vision, schema, anti-ban, 5-phase roadmap, existing-players landscape scan |
| `vibathon-steps.md` | created v0.1 | 48h timeline, 5 deliverables, success criteria, pitch |
| `HANDOFF.md` | **this file** | Conversation summary |

### Codebase (di `/var/home/tehaer/projects/HSI_Vibathon/codebase/vibathon-2026/`)

**New — data layer**
- `data/sources.json` — 20 source seed (10 Telegram, 5 web, 5 IG HSI ecosystem)
- `data/latest.json` — auto-generated snapshot
- `data/health/2026-05-11.json` — daily archive
- `data/docs/source-list-kajian.md` + `data/docs/vibathon-steps.md` — copy untuk in-app rendering

**New — scraper**
- `scripts/check-telegram.ts` — orchestrator (5s stagger, write archive + latest)
- `scripts/lib/types.ts` — shared TypeScript types
- `scripts/lib/score.ts` — freshness + reliability formula
- `scripts/lib/fetch-telegram.ts` — fetcher + cheerio parser + 3x retry exponential backoff

**New — UI**
- `src/app/lib/data.ts` — server-side loaders (docs, sources, latest)
- `src/app/components/Masthead.tsx` — eyebrow + serif headline + intro
- `src/app/components/AppShell.tsx` — sticky tab nav + footer (client, holds tab state)
- `src/app/components/DocsTab.tsx` — 3-col docs reader (sidebar + markdown + TOC)
- `src/app/components/AppTab.tsx` — dashboard (stats hero + filter + source cards)
- `src/app/components/CronPanel.tsx` — manual/automatic cron trigger UI

**New — ops**
- `.github/workflows/health-check.yml` — `workflow_dispatch` + cron `1 17 * * *` (UTC = 00:01 WIB), auto-commits snapshot back

**Modified**
- `package.json` — add `cheerio`, `tsx`, `react-markdown`, `remark-gfm` + script `check:telegram`
- `package-lock.json` — install
- `src/app/globals.css` — palette tokens + `.prose-doc` markdown styling
- `src/app/layout.tsx` — metadata Indonesia
- `src/app/page.tsx` — server component, loads data, renders Masthead + AppShell

---

## 📍 CURRENT STATE

### What's working
- ✅ `npm run check:telegram` runs end-to-end, produces valid `latest.json` + dated archive
- ✅ Last successful run summary: `{ active: 3, stale: 0, dead: 6, blocked: 0, error: 1, unmonitored: 10 }`
  - Active: yufidtv (100), muslimorid (100), rodjatv (80)
  - Dead historical: jadwalkajiansunnah, bbgalilmu, kajianislampedia, jadwalkajianID, JadwalKajian_id, syafiqrizabasalamah
  - Error: hsi_abdullahroy (genuinely empty)
- ✅ `npm run build` passes — both routes statically prerendered
- ✅ First commit pushed: `4a2b9e6..e02f9be` on `main`
- ✅ Netlify auto-deploy should be triggered (verify on dashboard)

### What's broken / pending
- ⚠️ **README + contribution docs** sebelumnya belum update (sudah diperbarui: README, CONTRIBUTING, LICENSE)
- ⚠️ **GitHub Actions workflow runtime** masih perlu verifikasi manual run di GitHub UI
- ⚠️ **Netlify URL final** perlu dipastikan dan diisi ke README
- ⚠️ **Demo recording 60–90 detik** belum dibuat

### Repo state
- **Branch**: `main`
- **Latest pushed commit**: `15e6ef7` — implement should-do 8/9/10 + dashboard polish
- **Working tree**: lihat status terbaru via `git status` sebelum lanjut task berikutnya

---

## ⏭️ NEXT STEP

Pilihan ordered berdasarkan urgency:

1. **Verify Netlify deploy** sukses dan isi URL final ke README
2. **Test GitHub Actions workflow_dispatch** — trigger manual via GitHub UI, pastikan auto-commit snapshot kembali jalan
3. **Update `data/docs/HANDOFF.md`** — sinkronkan file ini ke app docs tab
4. **Polish for showcase** — recording 60-90s demo, final QA mobile

### Optional stretch (kalau ada waktu sebelum/selama vibathon)
- Buat dataset publish ke Hugging Face Datasets
- Reverse-engineer 1 APK (Kajian-Yuk paling kecil) untuk hunt source list internal
- Outreach WA portalkajian admin (`6281392135904`) untuk partnership
- Tambah parser untuk YouTube channel (API-based, paling mudah after Telegram)

---

## ⚠️ GOTCHAS

### Next.js 16 specifics
- File `vibathon-2026/AGENTS.md` warn: "**This is NOT the Next.js you know**" — selalu cek `node_modules/next/dist/docs/01-app/` sebelum bikin route/component baru
- Lint rule `react-hooks/set-state-in-effect` sangat strict di Next 16 — `setState` di `useEffect` di-flag bahkan untuk legitimate use case (localStorage hydration)
- Build pakai Turbopack by default — initial build lama (~110s), incremental cepat

### Data & scraping
- Telegram **intermittent throttling** — kadang return error untuk channel yang tadinya OK. Sudah di-mitigate dengan 3x retry exponential backoff (2s, 4s, 8s) tapi tidak 100% reliable
- `t.me/s/{handle}` mengembalikan HTML statis — **kalau channel private/restricted/baru-dibuat**, akan return halaman tanpa `tgme_widget_message_date` → status `error` (bukan `dead`)
- Tidak semua channel expose subscriber count di preview page (`subscribers: null` valid)
- **portalkajian.online** punya `/api/kajian` open dengan 3009 records — TAPI `Disallow: /api/` di robots.txt. JANGAN auto-scrape. Outreach dulu via WA admin `6281392135904`

### GitHub Actions
- Workflow auto-commit butuh `permissions: contents: write` (sudah set di YAML)
- `GITHUB_TOKEN` default tidak bisa trigger workflow lain — tidak masalah karena kita commit dengan `[skip ci]` flag
- Cron schedule di `*.yml` adalah commit-time, **bukan** runtime. Custom hour dari UI hanya generate expression yang user perlu copy & push manual ke YAML

### CronPanel UX caveat
- "Trigger via PAT" pakai **fine-grained PAT** (bukan classic). Scope minimal: `Actions: Read & Write` di repo `t-onluring/vibathon-2026`
- PAT disimpan di **localStorage** kalau user opt-in checkbox. **Jangan pakai di komputer publik**. Tidak ada server-side storage.
- Cron expression generator pakai mapping WIB→UTC dengan offset -7h. Tidak handle DST (Indonesia tidak DST, jadi aman)

### Vibathon submission
- Showcase **16 Mei 20:00 WIB** — produk harus sudah live deployed
- Per overview PDF, "tema" = **method** (vibe-coding 48h), bukan topik produk. Topik bebas
- Confirmed dengan panitia: code pre-event OK sebagai starter (per user 14 Mei chat)

### Repo path quirk
- Workspace root vs codebase root beda — roadmap docs di `/var/home/tehaer/projects/HSI_Vibathon/roadmaps/`, codebase di `/var/home/tehaer/projects/HSI_Vibathon/codebase/vibathon-2026/`
- Untuk in-app rendering, `.md` file harus di-copy ke `vibathon-2026/data/docs/` (Netlify build hanya akses files dalam repo)

### Things NOT to do
- ❌ Jangan auto-scrape `/api/kajian` portalkajian.online (robots disallow)
- ❌ Jangan tambah Supabase/database — explicit non-goal Step 2
- ❌ Jangan tambah auth — explicit non-goal
- ❌ Jangan IG/FB scraping di Phase 1 (Phase 2 priority)
- ❌ Jangan over-engineer — vibathon 48h, scope creep = burnout
