# Vibathon 2026 — Steps Plan

> **Status**: 🟡 Draft v0.1
> **Last updated**: 2026-05-11
> **Maintainer**: tehaer
> **Type**: Live document
> **Codebase**: [vibathon-2026](file:///var/home/tehaer/projects/HSI_Vibathon/codebase/vibathon-2026)
> **Related roadmap**: [source-list-kajian.md](file:///var/home/tehaer/projects/HSI_Vibathon/roadmaps/source-list-kajian.md)

---

## 📜 Changelog

| Date | Version | Change | By |
|---|---|---|---|
| 2026-05-11 | v0.1 | Initial step 2 plan | tehaer + Amp |
| 2026-05-14 | v0.2 | Added Phase 3 open-contribution (PR-based) flow and CI validation guardrail | tehaer + Craft Agent |

---

## 🎯 Steps Goal

> **Dari landing page statis → working MVP demo: "Source List Kajian Sunnah Indonesia" Layer 1 dengan Telegram health check otomatis + dashboard publik.**

Step 2 = **Phase 1 dari roadmap Source List** (lihat [source-list-kajian.md → Phase 1](file:///var/home/tehaer/projects/HSI_Vibathon/roadmaps/source-list-kajian.md)) tapi di-bundle untuk konteks vibathon (deliverable shippable + demoable).

---

## 🧩 Step 1 Recap (yang sudah ada)

- ✅ Next.js 16.2.6 + React 19 + Tailwind 4 + TS scaffolding
- ✅ Landing page dengan deskripsi VIBATHON
- ✅ Netlify deploy config (`netlify.toml` + `@netlify/plugin-nextjs`)
- ✅ Repo git initialized
- ⚠️ Note: `AGENTS.md` warns Next.js 16 = breaking changes from training data → **selalu cek `node_modules/next/dist/docs/` sebelum coding**

---

## 🚀 Step 2 Deliverables

### D1 — Backend: Telegram Health Checker (cron)
- [x] Script `scripts/check-telegram.ts` (Node TS)
  - Input: list of TG channels dari `data/sources.json` (di-commit di repo)
  - Untuk tiap channel: fetch `https://t.me/s/{handle}` → parse HTML
  - Extract: `subscribers, last_post_date, last_post_preview`
  - Output: append snapshot ke `data/health/YYYY-MM-DD.json`
- [x] **GitHub Actions cron** (`.github/workflows/health-check.yml`)
  - Schedule: daily `00:01 WIB` (`17:01 UTC`)
  - Auto-commit hasil ke branch `data` (atau push langsung ke main)
- [x] Compute `reliability_score` (rumus dari roadmap utama)
- [x] Output juga `data/latest.json` (denormalized, mudah di-fetch dari frontend)

**Stack**: Node 20 + `cheerio` (HTML parse) + native `fetch`. Zero external service.

### D2 — Frontend: Dashboard Publik
- [x] Replace landing page placeholder dengan **dashboard kajian source**
- [x] Sections:
  - Hero: "Source List Kajian Sunnah Indonesia — Live Health Monitor"
  - Stats summary: total sources, % active, last check timestamp
  - **Top 10 most reliable** (cards: nama, platform, score, last update, link)
  - **Recently stale** (yang turun dari active)
  - "How it works" 3-step diagram
  - Footer: link ke GitHub repo + roadmap doc
- [x] Fetch `data/latest.json` di build time (Static Site Generation, no DB needed)
- [x] Responsive mobile-first
- [x] Filter sederhana: by platform (TG / Web / IG)

### D3 — Data Seed (Phase 0 mini)
- [x] `data/sources.json` minimal **20 sources** untuk demo:
  - 10 Telegram channel (mix active/stale untuk tunjukin variansi score)
  - 5 website (portalkajian, jadwalkajian, forumkajian, cintasedekah, hsi.id)
  - 5 IG handle (HSI ecosystem, untuk Phase 2 placeholder, mark `not_yet_monitored`)
- [x] Kolom: `id, name, platform, url, handle, category, region, priority, added_at`

### D4 — Documentation
- [x] Update `README.md` dengan:
  - Project pitch (1 paragraf)
  - Demo screenshot
  - Link ke deployed Netlify URL
  - Link ke roadmap doc
  - Cara contribute (submit source via PR ke `data/sources.json`)
- [x] `CONTRIBUTING.md` minimal
- [x] `LICENSE` — MIT (code) + CC-BY-SA (data)

### D5 — Demo & Showcase
- [ ] Deploy ke Netlify (auto dari push ke main)
- [ ] 1 manual run cron sebelum demo (commit hasil pertama)
- [ ] Recording 60-90 detik untuk showcase vibathon

---

## ⏱️ 48-hour Timeline

```diagram
╭──────────────────────────────────────────────────────────╮
│ HOUR 0-4    │ Phase 0: Data seed                         │
│             │ - Bikin data/sources.json (20 entries)     │
│             │ - Validate URL semua source manual         │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 4-12   │ D1: Telegram health checker script        │
│             │ - cheerio parsing experiment              │
│             │ - score computation                       │
│             │ - test local untuk 10 channel              │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 12-16  │ D1 cont: GitHub Actions cron               │
│             │ - workflow yml                             │
│             │ - test trigger manual                      │
│             │ - SLEEP                                    │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 16-28  │ D2: Frontend dashboard                     │
│             │ - hero + stats + top10 + stale sections    │
│             │ - fetch latest.json di SSG                 │
│             │ - responsive Tailwind                      │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 28-36  │ D2 cont: polish + filter UI + dark mode    │
│             │ - SLEEP                                    │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 36-42  │ D4: README, CONTRIBUTING, license, polish  │
│             │ D5: deploy + verify Netlify                │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 42-46  │ D5: demo recording + showcase prep         │
│             │ - 60-90s screen capture                    │
│             │ - bullet pitch                             │
├─────────────┼────────────────────────────────────────────┤
│ HOUR 46-48  │ Buffer: bug fix, deploy verify, submit     │
╰─────────────┴────────────────────────────────────────────╯
```

**Realistic note**: 48 jam tanpa tidur = recipe burnout. Plan above includes 2x sleep block (4h each).

---

## 🛠️ Tech Stack Decisions

| Concern | Pick | Why |
|---|---|---|
| Framework | Next.js 16 (already scaffolded) | Step 1 sudah pakai, no migration cost |
| Styling | Tailwind 4 (already in) | Same |
| Hosting | Netlify (already configured) | Same |
| Data store | **Plain JSON in repo** | No DB needed for MVP. Vercel/Netlify SSG just works. Versioned via Git automatically. |
| Cron runner | GitHub Actions | Free, no infra, commits result back to repo |
| Scraper | `cheerio` + native `fetch` | Lightweight, zero anti-bot needed for `t.me/s/*` |
| Auth | None | Public read-only data. Admin = git push. |
| Icons | `lucide-react` (add) | Free, tree-shakable |
| Charts | None for MVP | Just badge + cards. Charts Phase 3+ |

**Explicit non-goals untuk Step 2** (tahan godaan):
- ❌ Supabase / database
- ❌ Auth / user accounts
- ❌ IG / FB scraping (Phase 2)
- ❌ Submit form (Phase 3, pakai PR dulu)
- ❌ Notif Telegram bot
- ❌ Map view
- ❌ Search (filter platform cukup)

---

## 📂 Proposed File Structure

```
vibathon-2026/
├── data/
│   ├── sources.json          ← committed source list (20 entries)
│   ├── latest.json           ← latest snapshot (auto-updated by cron)
│   └── health/
│       └── 2026-XX-XX.json   ← daily archive
├── scripts/
│   ├── check-telegram.ts     ← scraper
│   └── compute-score.ts      ← reliability score formula
├── src/
│   └── app/
│       ├── page.tsx          ← dashboard (replace placeholder)
│       ├── layout.tsx
│       ├── components/
│       │   ├── SourceCard.tsx
│       │   ├── StatsHero.tsx
│       │   └── PlatformFilter.tsx
│       └── lib/
│           └── data.ts       ← load latest.json at build
├── .github/
│   └── workflows/
│       └── health-check.yml  ← daily cron
├── README.md                 ← rewrite
├── CONTRIBUTING.md           ← new
├── LICENSE                   ← MIT
└── data/LICENSE              ← CC-BY-SA 4.0
```

---

## ✅ Success Criteria (Definition of Done)

Step 2 dianggap sukses kalau:

1. ✅ `https://<netlify-url>/` accessible, render dashboard live
2. ✅ Minimal 20 source ter-list, minimal 10 punya health metric terupdate
3. ✅ GitHub Actions cron sudah jalan minimal 1x manual run sukses
4. ✅ README jelas + ada link kontribusi via PR
5. ⏳ Deploy ke Netlify auto dari push ke main (perlu verifikasi URL final)
6. ⏳ Demo recording 60-90s siap di-submit ke vibathon (belum dibuat)
7. ✅ Score computation TERLIHAT (variansi: ada yang skor tinggi, ada yang rendah)
8. ✅ Mobile-friendly (di-test via Chrome DevTools responsive mode)

**Stretch goals** (kalau masih ada waktu):
- 🌟 Subscribe RSS feed buat tiap source biar lengkap
- 🌟 Embed historical chart (sparkline 7-hari last_post freshness)
- 🌟 Webhook ke Telegram channel demo @kajian_health_daily
- 🌟 OG image generator per source (untuk shareable card)

---

## ⚠️ Risks Spesifik Step 2

| Risk | Mitigation |
|---|---|
| Next.js 16 breaking changes (warning di AGENTS.md) | Selalu konsultasi `node_modules/next/dist/docs/` sebelum bikin route/component baru. Tanyakan AI assistant pakai context dari folder itu. |
| `t.me/s/{handle}` HTML berubah breaking parser | Snapshot HTML sample dulu di test fixture, parser pakai selector defensive |
| Telegram rate limit | Stagger 1 channel per 5 detik, max 20 channel di MVP = 100s total — aman |
| GitHub Actions auto-commit conflict | Pakai `[skip ci]` di commit message + push ke branch terpisah `data` kalau perlu |
| Netlify build fail karena data/health mass commit | Exclude folder dari build trigger di `netlify.toml` |
| Burnout 48h non-stop | Hardcoded 2x sleep block 4 jam masing-masing |
| Scope creep ke Phase 2 (IG scraping) | TAHAN. Tulis di backlog, jangan kerjakan. |

---

## 🎤 Pitch (untuk showcase 60s)

> Setiap pengelola jadwal kajian Indonesia menghadapi masalah yang sama: source kajian tersebar di puluhan IG, FB, Telegram, WAG — dan kita tidak tahu mana yang masih aktif kecuali cek manual satu-satu.
>
> Source List Kajian adalah **Layer 1 infrastructure** untuk ekosistem kajian sunnah Indonesia: open registry of sources + automated health monitoring.
>
> Diinspirasi dari konsep mirror list Ubuntu, kita pelihara daftar sumber kajian dengan **reliability score** yang dihitung otomatis tiap hari dari aktivitas mereka.
>
> Hasilnya bisa dipakai siapa saja: aggregator yang mau bikin app regional, pengelola FP yang cari source baru, peneliti yang mau monitor track-record ustadz, atau developer yang mau bikin notif personal.
>
> Demo ini Phase 1 — Telegram health check + dashboard publik. Roadmap lengkap mencakup IG, FB, web, partnership dengan player existing seperti portalkajian.online.
>
> **Bukan kompetitor portalkajian. Kita justru data supplier mereka.**

---

## 🔗 Open Questions Step 2

- [ ] Repo nama final? (`vibathon-2026` keep or rename to `kajian-source-list`?)
- [ ] Domain: pakai netlify subdomain atau beli `.id` / `.org`?
- [ ] Submit demo recording: format MP4 / link YouTube?
- [ ] Vibathon submission deadline tanggal pasti?
- [ ] Apakah perlu pre-vet kontak admin portalkajian sebelum vibathon (biar di pitch bisa bilang "in talks for partnership")?

---

## 🎯 TL;DR Action Order

1. **Hour 0**: Bikin `data/sources.json` (20 entries) — copy dari section "Existing Players" roadmap utama
2. **Hour 4**: Script Telegram checker + score
3. **Hour 12**: GitHub Actions cron
4. **Hour 16**: Dashboard UI
5. **Hour 36**: README + deploy
6. **Hour 42**: Demo recording
7. **Hour 48**: Submit + sleep
