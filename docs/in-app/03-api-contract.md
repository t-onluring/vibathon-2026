# API Contract

## Static API v1
Endpoint publik dipublish sebagai file JSON statis:
- `GET /v1/sources.json` — salinan registry resmi `data/sources.json`
- `GET /v1/latest.json` — salinan snapshot terbaru `data/latest.json`
- `GET /v1/active.json` — subset source registry dengan snapshot `status = "active"`

## Data Input
### `data/sources.json`
- Source of truth untuk source registry.
- Field minimum: `id`, `name`, `platform`, `source_type`, `url`, `handle`, `region`, `priority`, `added_at`.
- Jika `source_type = "topic"`, wajib ada `parent_id` dan `topic_id`.

## Data Output
### `data/latest.json`
Ringkasan terbaru untuk dashboard dan static API.
Field utama:
- `generated_at`
- `version`
- `total_sources`
- `monitored_sources`
- `by_status`
- `snapshots[]`

### `public/v1/active.json`
Subset source yang status snapshot-nya `active`.
Field utama:
- `generated_at`
- `version`
- `total_sources`
- `sources[]`

## Status & Error
- Status umum: `active`, `stale`, `dead`, `blocked`, `error`, `unmonitored`.
- Jika gagal fetch/parse, source masuk `error` dengan detail di `checks[]`.
- `source_id` pada snapshot wajib merefer ke `id` di `data/sources.json`.
