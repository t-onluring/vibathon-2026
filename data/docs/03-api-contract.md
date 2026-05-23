# API Contract

## Data Input
### `data/sources.json`
- Berisi daftar source dan metadata dasar.

## Data Output
### `data/latest.json`
Ringkasan terbaru untuk dashboard.
Field utama:
- `generated_at`
- `total_sources`
- `monitored`
- `by_status`
- `snapshots[]`

### `data/health/YYYY-MM-DD.json`
Arsip harian snapshot health.

## Status & Error
- Status umum: `active`, `stale`, `dead`, `blocked`, `error`, `unmonitored`
- Jika gagal fetch/parse, source masuk `error` dengan catatan `error`.
