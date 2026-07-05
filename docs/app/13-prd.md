# Product Requirements Document (PRD)

Dokumen ini menjelaskan *apa* yang dibangun dan *bagaimana* mengukur keberhasilannya. Untuk detail bisnis lihat `12-brd.md`.

## Overview Produk

Dashboard registry dan monitoring sumber kajian Islam Sunnah Indonesia. Prinsip utama:
- **Static-first** — data di-generate saat build, tidak ada server-side API
- **Git sebagai database** — semua perubahan bisa di-audit via git history
- **Open by default** — registry dan API publik, tidak perlu autentikasi
- **Komunitas-driven** — kontribusi via Pull Request

**Tech Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Leaflet · GitHub Actions · Netlify

## User Personas

| Persona | Profil | Kebutuhan | Sukses Jika |
|---------|--------|-----------|-------------|
| Pengguna Umum | Pencari sumber kajian aktif | Filter region/platform, status jelas | Temukan ≥ 3 sumber aktif dalam < 2 menit |
| Developer | Builder app kajian | API stabil, skema konsisten | Integrasi API dalam < 1 hari kerja |
| Kontributor | Pengguna aktif Telegram kajian | Alur submit mudah | Submit + feedback dalam < 7 hari |
| Maintainer | Pengelola registry | Tools validasi, workflow promosi | Review + proses kontribusi dalam < 30 menit |

## Feature Requirements per Tab

### F-01: Tab Overview
- Diagram arsitektur layer L0–L3
- Preview 3 endpoint static API dengan contoh response
- Penjelasan pipeline data (registry, spikes, kontribusi)
- Navigasi cepat ke tab lain

### F-02: Tab Plan & Roadmap
- Timeline 6 fase dengan status (selesai/berjalan/planned)
- Milestone dan deliverable per fase
- Animasi entrance saat section masuk viewport

**6 Fase:** Konsolidasi → Vibathon → Parent-Child → Multi-Platform → Kontribusi → Public Dataset

### F-03: Tab Architecture
- Dokumentasi teknis: data flow, validasi, snapshot, versioning
- Dirender dari markdown

### F-04: Tab Live Dashboard *(Fitur Utama)*

**Source List & Filtering:**
- Filter: status · platform · region · search teks bebas · sort (score/nama/subs)
- Badge count per opsi filter
- Kombinasi filter multi-axis

**Visualisasi per Sumber:**
- ScoreRing — donut chart confidence score dengan warna status
- Sparkline — mini chart aktivitas 30 hari (deterministik per source ID)

**Peta Regional (Leaflet):**
- Bubble per region, ukuran ∝ jumlah sumber
- Warna bubble = kondisi kesehatan rata-rata region
- Hover → statistik region (total, aktif, dead)

**Trend Chart:**
- Grafik 30 hari: avg score · active count · dead count
- Tooltip interaktif per hari

**Topic Discovery Panel (Track B):**
- Kandidat topik Telegram yang belum terdaftar
- Status per topik: mapped / ignored / candidate

### F-05: Tab Contribute
- Panduan langkah-langkah kontribusi
- Form intake dengan validasi real-time
- Output JSON yang bisa disalin
- Delivery method: GitHub PR · Email · Netlify Form

**Field wajib form:** name, platform, source_type, url, handle, region, evidence_url, submitted_by

## Health Monitoring

### Telegram (Saat Ini)
- Cron GitHub Actions: 00:01 WIB (17:01 UTC) setiap hari
- Scraping HTML publik `t.me/<handle>` via Cheerio
- Output: `data/latest.json` + `data/health/YYYY-MM-DD.json` + auto-commit jika berubah

**Formula confidence score:**
```
score = 0.25 × keterjangkauan + 0.40 × keterbacaan + 0.35 × kesegaran_berjenjang
```
Sinyal ke-4 (`extraction_quality`, +20% rebalanced ke 20/30/30/20) menyusul di Phase 2.

**Status threshold:**
- `active` — last post < 7 hari, semua check OK
- `stale` — aktif tapi last post 7–30 hari
- `dead` — last post > 30 hari atau tidak bisa diakses

### Platform Masa Depan
Setiap platform baru mengimplementasikan interface `PlatformAdapter` yang sama. Formula confidence score bisa dikustomisasi per platform.

## Static API

| Endpoint | Format | Update |
|----------|--------|--------|
| `/v1/sources.json` | `Source[]` | Per commit |
| `/v1/latest.json` | `LatestSummary` | Harian |
| `/v1/active.json` | `Source[]` (filtered) | Harian |

Semua endpoint: publik, CORS *, Content-Type: application/json, CDN availability ≥ 99.9%.

## Non-Functional Requirements

| Kategori | Target |
|----------|--------|
| FCP | < 1.5 detik (koneksi 4G) |
| TTI | < 3 detik |
| Bundle JS | < 500KB gzipped |
| Dark mode | Background #1A1916, toggle di navbar, disimpan di localStorage |
| Aksesibilitas | WCAG AA contrast, navigasi keyboard, aria-label |
| Responsif | Mobile: filter collapsible; Desktop: full layout |
| Reduced motion | Animasi dinonaktifkan jika `prefers-reduced-motion: reduce` |

## Acceptance Criteria

```
Filter status:
  Given dashboard tampil
  When  pilih filter "active"
  Then  hanya sumber status active tampil, badge count akurat

Health check harian:
  Given GitHub Actions aktif
  When  jam 00:01 WIB
  Then  latest.json + health/YYYY-MM-DD.json terbarui, auto-commit

Form Contribute:
  Given semua field wajib terisi
  When  klik "Submit via GitHub PR"
  Then  browser buka GitHub dengan template PR pre-filled berisi JSON valid

Static API:
  Given build di-deploy ke Netlify
  When  GET /v1/sources.json
  Then  JSON array valid, Content-Type: application/json, response < 500ms
```
