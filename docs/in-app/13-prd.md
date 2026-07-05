# Product Requirements Document (PRD)

## Overview

Dashboard registry dan monitoring sumber kajian Islam Sunnah Indonesia.
Static-first, Git sebagai database, publik tanpa autentikasi.

## User Personas

- **Pengguna Umum** — cari sumber kajian aktif berdasarkan region/platform
- **Developer** — consume `/v1/sources.json` untuk integrasi aplikasi
- **Kontributor** — usul sumber baru via form → GitHub PR
- **Maintainer** — review kontribusi, kelola registry, monitor health check

## Fitur per Tab

### Tab Overview
Diagram arsitektur L0–L3, preview 3 endpoint API, penjelasan pipeline data.

### Tab Plan & Roadmap
Timeline 6 fase (Konsolidasi → Vibathon → Parent-Child → Multi-Platform → Kontribusi → Public Dataset) dengan status dan milestone.

### Tab Architecture
Dokumentasi teknis lengkap: data flow, validasi, snapshot, versioning.

### Tab Live Dashboard
Fitur utama. Berisi:
- Daftar sumber + filter (status, platform, region, search, sort)
- ScoreRing (confidence score) + Sparkline (aktivitas 30 hari) per sumber
- Peta regional interaktif (Leaflet) dengan bubble per region
- Trend chart ekosistem 30 hari
- Topic Discovery Panel (Track B kandidat Telegram)

### Tab Contribute
Form intake dengan validasi real-time → generate JSON → pilih delivery (GitHub PR / Email / Netlify Form).

## Health Monitoring

Formula confidence score (semua platform, Phase 2 prep):
```
score = 0.25 × keterjangkauan + 0.40 × keterbacaan + 0.35 × kesegaran_berjenjang
```
Sinyal ke-4 — `extraction_quality` (+20%, rebalanced ke 20/30/30/20) — menyusul di Phase 2.

Status threshold:
- **active** — last post < 7 hari
- **stale** — last post 7–30 hari
- **dead** — last post > 30 hari atau tidak bisa diakses

Berjalan otomatis via GitHub Actions cron 00:01 WIB setiap hari.

## Static API

| Endpoint | Isi | Update |
|----------|-----|--------|
| `/v1/sources.json` | Seluruh registry | Per commit |
| `/v1/latest.json` | Snapshot kesehatan terbaru | Harian |
| `/v1/active.json` | Hanya sumber aktif | Harian |

## Acceptance Criteria Ringkas

- Filter "active" → hanya sumber aktif tampil, badge count akurat
- Cron 00:01 WIB → `latest.json` + `health/YYYY-MM-DD.json` terbarui, auto-commit
- Form Contribute → klik GitHub PR → browser buka template PR pre-filled
- GET `/v1/sources.json` → JSON valid, Content-Type: application/json, < 500ms (CDN)

## Non-Functional

- FCP < 1.5 detik (koneksi 4G)
- Dark mode (background #1A1916), reduced motion support
- Responsif: mobile filter collapsible, desktop full layout
- Bundle JS < 500KB gzipped
