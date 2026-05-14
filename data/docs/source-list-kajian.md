# Source List Kajian Sunnah Indonesia — Roadmap & Plan

> **Status**: 🟡 Draft v0.3
> **Last updated**: 2026-05-11
> **Maintainer**: tehaer , main idea from Kuro
> **Type**: Live document — update setiap ada progress / decision baru
> **Repo target**: TBD (saran: `github.com/<org>/kajian-source-list`)

---

## 📜 Changelog

| Date | Version | Change | By |
|---|---|---|---|
| 2026-05-11 | v0.1 | Initial draft from brainstorm session | tehaer + Amp |
| 2026-05-11 | v0.2 | Koreksi: `t.me/c/sijadwalkajian/192` adalah thread Telegram (catatan bertahap), BUKAN Google Sheet. Belum ada source list terstruktur sama sekali. | tehaer + Amp |
| 2026-05-11 | v0.3 | Tambah section "Existing Players & Status" — hasil reverse-engineer portalkajian.online (`/api/kajian` 3009 records, robots disallow) + verify 3 channel Telegram (2 stale, 1 active). Justifikasi konkret konsep reliability score. | tehaer + Amp |

---

## 🎯 Vision (Why)

> **Source List Kajian = OPML/registry untuk ekosistem kajian sunnah Indonesia.**
> Bukan aggregator. Bukan end-user app. Tapi **infrastructure layer** yang dipakai aggregator dan app lain.

### Problem statement
1. **Single point of failure**: pengelola FP Jadwal Kajian sakit → backup mulai dari nol karena tidak ada dokumentasi source list
2. **Effort tinggi, scale rendah**: Kuro menghabiskan banyak waktu repost manual H-1, tidak scalable kalau volume bertambah
3. **Source tersebar tanpa quality signal**: 100+ kanal kajian (IG, FB, TG, WA, web) tanpa tahu mana yang masih aktif dan reliable
4. **No common dataset**: tiap komunitas/developer mau bangun aplikasi kajian = re-invent the wheel mulai dari source discovery

### End game
- **Layer 1 (kita)**: Source registry + reliability metrics (open data)
- **Layer 2 (orang lain)**: Aggregator yang konsumsi Layer 1 → raw kajian data
- **Layer 3 (orang lain)**: Apps regional, dashboard manajemen ustadz, notif pribadi, dst

```diagram
╭─────────────────────────────────────────╮
│ Layer 3: APLIKASI END-USER              │  ← FP Jadwal Kajian, App,
│ (konsumsi konten kajian)                │     portalkajian.online, dll
╰─────────────────┬───────────────────────╯
                  ▲
╭─────────────────┴───────────────────────╮
│ Layer 2: DATA AGGREGATOR                │  ← Scraper, normalizer,
│ (raw data kajian terstruktur)           │     deduplicator
╰─────────────────┬───────────────────────╯
                  ▲
╭─────────────────┴───────────────────────╮
│ Layer 1: SOURCE LIST  ⭐ FOKUS PROYEK   │  ← Registry of trusted
│ (registry sumber + metadata reliability)│     sources + health metrics
╰─────────────────────────────────────────╯
```

### Inspirasi
- **Ubuntu**: `/etc/apt/sources.list` — mirror list dengan priority
- **NPM**: registry mirror (npmjs.org, taobao mirror)
- **RSS era**: OPML — portable feed list export/import
- **Crypto**: token list (Uniswap trusted token registry)
- **Cybersecurity**: threat intelligence feeds (AlienVault OTX, MISP)

---

## 🧱 Core Concepts

### 1. Source = entity yang mempublikasi info kajian
- Platform: Instagram, Facebook, Telegram, WhatsApp group, Website, YouTube, TikTok
- Owner: ustadz pribadi, masjid, komunitas, aggregator (e.g., Jadwal Kajian Kaskus "Merger")
- Setiap source punya **unique ID**, **metadata statis**, dan **metric dinamis (reliability)**

### 2. Reliability Score = composite metric, bukan boolean
```
reliability_score (0-100) =
    40% × freshness_score      // last_post_age (decay)
  + 25% × consistency_score    // posting interval std deviation
  + 20% × volume_score         // posts per month (capped)
  + 10% × engagement_score     // followers growth rate
  +  5% × diversity_score      // posting time/day spread

freshness_score:
  last_post < 3 days  → 100
  3-7 days            → 80
  7-14 days           → 50
  14-30 days          → 20
  > 30 days           → 0
```

### 3. Open by default
- License: **CC-BY-SA 4.0** (data) + **MIT** (code)
- Format: human-readable (YAML/JSON in Git) + machine-queryable (JSON API)
- Versioned: setiap snapshot punya tanggal, dapat di-diff

---

## 🌐 Existing Players & Status (Landscape Scan 2026-05-11)

> **Why this matters**: Sebelum bangun sendiri, petakan dulu apa yang sudah ada. Ini juga jadi **first batch source** untuk Sheet di Phase 0.

### A. Web Aggregators

| Name | URL | Tipe | API Public? | Partnership Status | Priority |
|---|---|---|---|---|---|
| **portalkajian.online** | https://portalkajian.online | Next.js + Vercel + ImageKit | ✅ `/api/kajian` (3,009 records, JSON) — **TAPI** `Disallow: /api/` di robots.txt | 🟡 needs outreach (WA admin: `6281392135904`) | high |
| **jadwalkajian.com** | https://jadwalkajian.com | Web + Android app | TBD | TBD | high |
| **forumkajian.com** | https://forumkajian.com | Web + Android app suite | TBD | Email: `info@forumkajian.com` | high |
| **cintasedekah.org** | https://cintasedekah.org | Aggregator info Islami (kajian + lainnya) | TBD | TBD | medium |

**Key finding portalkajian.online** (reverse-engineered):
- 34 fields per record termasuk `lat/lng, isOnline, khususAkhwat, isKidsFriendly, recurring_kajian_id`
- Image hosting via ImageKit CDN
- Schema sangat matang — practically a finished kajian DB
- ⚠️ **Robots.txt eksplisit `Disallow: /api/`** → admin tidak ingin di-scrape. Hormati. Outreach dulu.

### B. Telegram Channels (Verified Live)

| Channel | Subs | Last Update | Status | Priority | Catatan |
|---|---|---|---|---|---|
| `@jadwalkajiansunnah` | TBD | **2026-02-09** | 🟢 active | high | Adopt sebagai primary TG source untuk Phase 1 |
| `@jadwalkajianID` | 4,350 | 2023-10-30 | 🔴 stale | archived | >2 tahun no update — JANGAN jadi rujukan |
| `@JadwalKajian_id` | 582 | 2021-06-16 | ⚫ dead | archived | >4 tahun no update |
| `@sijadwalkajian` (Kuro's group) | — | — | private group | — | Source thread `t.me/c/sijadwalkajian/192` (catatan bertahap Kuro) |

**🚨 INSIGHT KRITIS**: `@jadwalkajianID` punya 4.35K subscribers (terlihat besar & kredibel), tapi **mati sejak 2 tahun lalu**. Tanpa health check otomatis, mustahil tahu kecuali manual cek satu-satu. **Ini exact reason kenapa proyek ini ada.**

### C. Android Apps (Pending Reverse-Engineering)

| App | Package / Developer | Last Update | Catatan |
|---|---|---|---|
| **Kajian-Yuk** | `com.exomatik.kajian_yuk` | TBD | Search by city, filter ustadz |
| **Info Kajian Sunnah** | `com.thohirdev.infokajiansunnah` (Forum Kajian) | 2026-04-24 | 1K+ downloads, multi-fitur (audio, ebook, jadwal sholat) |
| **Jadwal Kajian Sunnah Indonesia** | Web Desain Indonesia | 2025-04-03 | v10.06 |

**Strategi**: APK reverse-engineering (apktool) → bongkar endpoint API mereka → kemungkinan besar punya source list internal yang bisa di-cross-reference (atau jadi kandidat partnership).

### D. Community / WhatsApp / Existing Operational

| Source | Platform | Status | Catatan |
|---|---|---|---|
| **WAG Jadwal Kajian Kaskus "Merger"** | WhatsApp Group | 🟢 active | Source paling reliable dari pengalaman operasional Kuro. Invite link: TBD (Kuro fill in) |
| **FP Jadwal Kajian** | Facebook Page | 🟡 maintained by Kuro | Downstream consumer, bukan source. Sering repost dari WAG Kaskus |
| **HSI ecosystem (hsi.id)** | Multi-platform | 🟢 active | 16+ official divisi (HSI AbdullahRoy, Berbagi, Mahazi, Umrah, dll) — official IG handles ada di hsi.id |

### E. Strategic Positioning

```diagram
╭───────────────────────────────────────────────────────────╮
│ KOMPETITOR? Tidak. Kita beda layer.                       │
├───────────────────────────────────────────────────────────┤
│ portalkajian, jadwalkajian, forumkajian = Layer 2/3       │
│   (aggregator + end-user app)                             │
│                                                           │
│ Source List Kajian (kita) = Layer 1                       │
│   (registry of sources + reliability metrics)             │
│                                                           │
│ → Mereka konsumen potensial data kita                     │
│ → Kita konsumen potensial source list mereka              │
│ → Win-win via partnership, bukan zero-sum                 │
╰───────────────────────────────────────────────────────────╯
```

### F. Outreach Action Items (untuk Phase 0)

- [ ] WA admin **portalkajian.online** (`6281392135904`) — perkenalkan visi Layer 1, eksplor partnership
- [ ] Email **forumkajian.com** (`info@forumkajian.com`) — sama
- [ ] Cek kontak admin **jadwalkajian.com** + **cintasedekah.org**
- [ ] Konfirmasi invite link **WAG Kaskus Merger** (Kuro punya akses)
- [ ] Crawl resmi list divisi **hsi.id** → official social media handles
- [ ] Reverse-engineer 1 APK (mulai dari **Kajian-Yuk** — paling kecil & cepat)

---

## 🗂️ Data Schema (Draft)

### Source entry (`sources/{platform}/{handle}.yaml`)
```yaml
id: ig-hsi-abdullahroy
name: HSI AbdullahRoy
platform: instagram          # instagram | facebook | telegram | whatsapp | website | youtube | tiktok
url: https://instagram.com/hsi.abdullahroy
handle: hsi.abdullahroy
category: [kajian, hsi-official]
region: nasional             # nasional | jakarta | bandung | yogya | ...
language: id
priority: high               # high | medium | low | archived
tags: [aqidah, manhaj, hsi]
maintainer: hsi-it
verified: true
added_at: 2024-01-15
notes: "Akun resmi HSI Media"
```

### Health snapshot (`health/{date}/{source-id}.json`)
```json
{
  "source_id": "ig-hsi-abdullahroy",
  "checked_at": "2026-02-01T00:01:00+07:00",
  "metrics": {
    "posts": 312,
    "followers": 15735,
    "following": 55,
    "last_post_at": "2026-01-30T14:22:00+07:00"
  },
  "delta_from_yesterday": {
    "posts": 1,
    "followers": 12,
    "last_post_age_hours": 33.6
  },
  "status": "active",
  "reliability_score": 87
}
```

---

## 🛡️ Anti-Ban Strategy (Critical for 100+ sources)

| Platform | Method | Rate Limit | Tools |
|---|---|---|---|
| **Telegram** ⭐ start here | Public preview `t.me/s/{channel}` (HTML, no auth) | 1 req/min/channel safe | `curl` + cheerio/BeautifulSoup |
| **YouTube** | YouTube Data API v3 (10k quota/day = ~1k channel checks) | Generous | googleapis SDK |
| **Website / Blog** | RSS feed atau HTTP HEAD `Last-Modified` | Hourly OK | feedparser |
| **Facebook Page** | Graph API (butuh page token) atau fetchrss.com | Generous w/ API | Graph API |
| **Instagram** | `instaloader` (profile only, no media) ATAU Apify ($) | 1 req/source/HARI max | instaloader, Apify |
| **WhatsApp group** | HTTP HEAD `chat.whatsapp.com/xxx` (link alive check only) | Hourly OK | curl |
| **TikTok** | TBD — paling defensive, skip Phase 1-2 | — | — |

### Universal rules
- **Stagger**: 100 sources / 6 hours = 1 source per ~3 menit
- **Rotate UA + residential proxy** kalau IG > 50 sources
- **Cache aggressive**: skip detail re-fetch kalau metric tidak berubah
- **Respect robots.txt + Retry-After**
- **Fail gracefully**: 3x error → mark `blocked`, exponential backoff

---

## 🚦 Roadmap (Phased, Resumable)

> Filosofi: setiap phase **bisa pause kapan saja tanpa kehilangan progress**. Hindari over-commit.

### Phase 0 — Konsolidasi (1-2 minggu, solo) 🟡 IN PROGRESS
**Goal**: existing knowledge (tersebar di thread Telegram, ingatan Kuro, history posting FP) → structured data, repo siap dibagikan.

> **Catatan kondisi awal**: Belum ada source list terstruktur. Yang ada hanya catatan bertahap di thread Telegram `t.me/c/sijadwalkajian/192` + tacit knowledge Kuro dari operasional FP Jadwal Kajian. Phase 0 ini = ekstraksi dari nol.

- [ ] **Bikin Google Sheet baru** sebagai working canvas (template kolom: `id, name, platform, url, handle, category, region, priority, notes, added_at, source_of_info`)
- [ ] **Mining existing knowledge** ke sheet:
  - [ ] Scrape/copy isi thread Telegram `t.me/c/sijadwalkajian/192` (manual atau export Telegram Desktop → JSON)
  - [ ] Tambah source dari history posting FP Jadwal Kajian (yang sering Kuro pakai untuk repost H-1)
  - [ ] Tambah aggregator komunitas yang sudah teridentifikasi (e.g., WAG Jadwal Kajian Kaskus "Merger")
  - [ ] Tambah official channel HSI ecosystem (dari hsi.id list divisi)
- [ ] Tag priority manual (high/medium/low/archived) berdasarkan pengalaman Kuro
- [ ] Pisahkan kategori: source aktif vs archived
- [ ] Buat repo GitHub publik (saran nama: `kajian-source-list`)
  - README dengan visi
  - Link ke Google Sheet sebagai source of truth sementara
  - LICENSE (CC-BY-SA untuk data, MIT untuk code)

**Exit criteria**: ada 1 sheet baru + 1 repo public dengan minimal 50 sources tertag.

---

### Phase 1 — MVP Health Check (1 weekend, hackathon-able) ⏳ PLANNED
**Goal**: working demo health check otomatis untuk 1 platform.

**Pilihan platform pertama: Telegram** (paling mudah, paling reliable, no auth needed).

- [ ] Script Python: `health_check_telegram.py`
  - Input: list of telegram channels (dari Google Sheet via gspread, atau YAML)
  - Untuk tiap channel: fetch `https://t.me/s/{channel}` → parse HTML
  - Extract: subscribers count, last post date, last post preview
  - Output: append row ke sheet `health_log` (tanggal, source_id, metrics)
- [ ] Setup GitHub Actions cron: daily `00:01 WIB` (`17:01 UTC`)
- [ ] Compute `reliability_score` per source (rumus di atas)
- [ ] Generate report harian: `reports/YYYY-MM-DD.md` (top 10 paling aktif, top 10 stale, dead sources)
- [ ] Notif ke Telegram channel `@kajian_health_daily` (opsional)

**Exit criteria**: 7 hari berturut-turut auto-run sukses, ada history snapshot, score terhitung.

---

### Phase 2 — Multi-platform (gradual, async) 🔮 FUTURE
**Goal**: extend ke YouTube, Website, IG, FB.

Urutan pengerjaan (dari termudah → tersulit):
- [ ] **YouTube**: API key + cron + channel list. ~2 hari kerja.
- [ ] **Website RSS**: feedparser + HTTP HEAD untuk yang tidak ada RSS. ~1 hari.
- [ ] **Facebook Page**: Graph API + page token. ~3 hari (paling birokratis).
- [ ] **Instagram**: instaloader local (Phase 2a) atau Apify subscription (Phase 2b). ~3-5 hari.
- [ ] **WhatsApp group**: HEAD check + manual review. ~1 hari.

**Exit criteria**: 4+ platform tercover, 100+ source termonitor, dashboard sederhana.

---

### Phase 3 — Open Contribution 🔮 FUTURE
**Goal**: orang lain bisa kontribusi tanpa Kuro jadi bottleneck.

- [ ] Migrasi: Google Sheets → YAML/JSON di Git repo (Apps Script auto-sync)
- [ ] Brief kolaborasi 1 halaman (publish ke Telegram group `t.me/c/1669133660/665`)
- [ ] CONTRIBUTING.md: cara submit source baru via PR
- [ ] Form submit publik (Google Form atau Telegram bot) untuk reporter non-tech
- [ ] Issue templates di GitHub: `[source-add]`, `[source-update]`, `[bug-scraper]`
- [ ] Label `good-first-issue` untuk dev kontributor
- [ ] Tier kontributor jelas (Reporter, Curator, Developer, Sponsor, Consumer)

**Exit criteria**: ada minimal 3 kontributor non-Kuro yang sudah merge PR.

---

### Phase 4 — Showcase & Public Dataset 🔮 FUTURE
**Goal**: bukti konsep — orang lain pakai datanya.

- [ ] Publish dataset ke **Hugging Face Datasets** (versioned, parquet/CSV)
- [ ] JSON API statis via **GitHub Pages**: `https://<org>.github.io/api/sources.json`
- [ ] Daily release di GitHub Releases: `health-YYYY-MM-DD.zip`
- [ ] Build 1 contoh app konsumen: web sederhana "Kajian Aktif Hari Ini" (filter: reliability_score > 70)
- [ ] Dokumentasi schema: `schema.json` + `CHANGELOG.md` + integration guide

**Exit criteria**: dataset publik downloadable, 1 demo app live, ada minimal 1 third party yang pakai.

---

## 👥 Tier Kontributor

| Tier | Kontribusi | Effort | Skill |
|---|---|---|---|
| **Reporter** | Submit source baru via Form/bot | 1 menit | None |
| **Curator** | Review submission, set priority, tag region | 30 min/minggu | Domain knowledge |
| **Developer** | Maintain scraper per platform | Variable | Coding |
| **Sponsor** | Bayar Apify/proxy/server | $ | None |
| **Consumer** | Pakai data, kasih bug feedback | Variable | Variable |

---

## 🛠️ Tooling Decision Log

| Decision | Choice | Rationale | Date |
|---|---|---|---|
| Source storage (Phase 0-1) | Google Sheets | Low friction, non-tech friendly, easy share | 2026-05-11 |
| Source storage (Phase 3+) | YAML/JSON in Git | Versioned, PR-able, machine-readable | 2026-05-11 |
| Cron runner | GitHub Actions | Free 2000 min/month, no infra needed | 2026-05-11 |
| Code language (scraper) | Python | Library kaya (instaloader, BS4, feedparser) | 2026-05-11 |
| Dashboard (later) | TBD — Supabase + simple Next.js? | — | — |
| Anti-bot proxy (IG) | TBD — Apify vs residential proxy | Decide saat Phase 2a | — |

---

## ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Burnout (energi moody) | High | Critical | Phase kecil, exit per phase, tidak commit deadline ketat |
| IG/FB rate limit ban | Medium | High | Telegram dulu, IG paling akhir, pakai Apify kalau mampu |
| Source admin keberatan dipantau | Low | Medium | Hanya pakai metric publik (follower, last post). Tidak scrape isi private |
| Bus factor 1 (cuma Kuro) | High | High | Phase 3 priority — onboarding kontributor ASAP |
| Google Sheet jadi messy | Medium | Medium | Migrasi ke Git repo di Phase 3 |

---

## 🔗 Connection to HSI Vibathon 2026

Repo `HSI_Vibathon/codebase/vibathon-2026` bisa jadi **Layer 3 showcase**:

- **Theme pitch**: "Source List Kajian Sunnah Indonesia: Open Registry & Health Monitor"
- **48h MVP scope**: implement Phase 1 (Telegram health check) + landing page sederhana yang display top 20 source paling aktif
- **Differentiator vs portalkajian.online**: kita Layer 1 (infrastructure), mereka Layer 3 (end-user). **Komplementer, bukan kompetitor**.
- **Demo flow**:
  1. Show Google Sheet input (50 sources)
  2. Trigger GitHub Action manual
  3. Tampilkan dashboard hasil: ranked by reliability
  4. Show how someone could consume the JSON API

---

## 📝 Open Questions / Decisions Pending

- [ ] Repo name & GitHub org? (`kajian-id`? `kajian-sunnah-id`? individual account dulu?)
- [ ] Cek harian vs mingguan? (sementara: harian 00:01 WIB)
- [ ] Notification channel: Telegram public, RSS, atau Discord?
- [ ] Apakah perlu API key untuk consumer di Phase 4? (saran: tidak, free tier rate-limited via CDN)
- [ ] Bagaimana handle source duplikat (akun cabang regional dari ustadz nasional)?
- [ ] Lisensi data: CC-BY-SA 4.0 vs CC0? (saran: BY-SA, biar derivative tetap open)

---

## 📚 References

- Brainstorm thread asal: `t.me/c/sijadwalkajian/192`
- Komunitas kontributor: `t.me/c/1669133660/665`
- Existing Layer 3 example: https://portalkajian.online/
- HSI ecosystem: https://hsi.id/
- Inspiration: Ubuntu apt sources, OPML, Uniswap token list

---

## 🎯 TL;DR — Action Items Minggu Ini

1. **Buat Google Sheet baru** dengan template kolom standar (~15 menit)
2. **Mining isi thread Telegram** `t.me/c/sijadwalkajian/192` → Sheet (~1-2 jam, manual copy atau export JSON via Telegram Desktop)
3. **Buat repo GitHub publik** + README visi + link ke Sheet (~15 menit)
4. **Tulis brief kolaborasi 1 halaman** (~1 jam) — tahan dulu publish sampai Phase 1 ada demo
5. **Phase 1 prototype**: Telegram health checker + GitHub Actions cron (~1 weekend, AI-assisted)
6. **Tunda IG/FB scraping** sampai Phase 1 stabil 7 hari
