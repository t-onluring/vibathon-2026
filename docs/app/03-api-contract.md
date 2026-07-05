# API Contract (Static API v1)

## Scope v1
Kontrak publik v1 publish tiga endpoint statis:
1. `GET /v1/sources.json`
2. `GET /v1/latest.json`
3. `GET /v1/active.json`

`data/health/YYYY-MM-DD.json` tetap boleh ada sebagai arsip internal, tapi bukan kontrak konsumsi utama v1.

---

## 1) Data Input / Registry
### `data/sources.json`
Daftar source master (source of truth).

### Required fields (minimum)
- `id` (immutable)
- `name`
- `platform`
- `source_type`
- `url`
- `handle`
- `region`
- `priority`
- `added_at`

### Conditional required fields
- Jika `source_type = "topic"`, wajib ada:
  - `parent_id`
  - `topic_id`

### Identity policy
- `id` **tidak boleh berubah** setelah dibuat.
- `name` boleh berubah.
- Format ID: `<platform_code>-<canonical_slug>`.

### Allowed `platform_code` baseline
- `tg` (Telegram)
- `yt` (YouTube)
- `ig` (Instagram)
- `web` (Website)
- `wa` (WhatsApp)

---

## 2) Data Output / Snapshot
### `data/latest.json`
Ringkasan health terbaru untuk dashboard + consumer app.

### Top-level fields
- `generated_at`
- `version`
- `total_sources`
- `monitored_sources`
- `by_status`
- `snapshots[]`

### Snapshot required fields
- `source_id`
- `status`
- `last_checked_at`
- `confidence_score`
- `checks[]`

### Confidence score v1 (0..1)
- Range: `0.0` sampai `1.0`
- Interpretasi awal:
  - `>= 0.85` = high trust
  - `0.60..0.84` = medium trust
  - `< 0.60` = low trust
- Rumus baseline v1 (weighted, Phase 2 prep):
  - `http_reachable` = 0.25
  - `content_parseable` = 0.40
  - `freshness_score` = 0.35 (tiered 0.0–1.0 dari `freshnessScore()/100`, bukan binary)
  - Formula: `confidence_score = 0.25*http_reachable + 0.40*content_parseable + 0.35*freshness_score`.
  - Phase 2: tambah `extraction_quality` (opsional) → rebalanced ke `0.20/0.30/0.30/0.20`.
- Catatan: rumus internal boleh berkembang, tapi range + interpretasi ini harus stabil untuk consumer.

### `checks[]` item minimal
- `name`
- `ok`
- `details`

---

## Status & Error Semantics
Status enum v1:
- `active`
- `stale`
- `dead`
- `blocked`
- `error`
- `unmonitored`

Aturan:
- Jika fetch/parse gagal, status minimal `error` dan detail dicatat di `checks[]`.
- `source_id` pada snapshot wajib merefer ke `id` yang ada di `data/sources.json`.

---

## Compatibility & Versioning
- `version` pada `latest.json` mengikuti semantic-style sederhana: `vMAJOR.MINOR.PATCH`.
- **PATCH**: perbaikan non-breaking (contoh: typo, detail checks).
- **MINOR**: tambah field baru yang backward-compatible.
- **MAJOR**: ubah/hapus field kontrak yang breaking.
- Consumer harus tetap aman pada perubahan PATCH/MINOR.

## Non-goals v1
- Tidak wajib DB.
- Tidak wajib endpoint server dinamis.
- Tidak wajib seluruh platform punya fixture real di fase awal (boleh mulai dari `tg` + `web`).

## 3) Published Static Endpoints

Static API v1 dipublish sebagai file JSON statis:
- `GET /v1/sources.json` — salinan registry resmi `data/sources.json`
- `GET /v1/latest.json` — salinan snapshot terbaru `data/latest.json`
- `GET /v1/active.json` — subset source registry dengan snapshot `status = "active"`

`active.json` wajib berisi:
- `generated_at`
- `version`
- `total_sources`
- `sources[]`
