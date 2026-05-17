# Data Model (sinkron dengan Static API v1)

## Entity: Source
Representasi master source pada `data/sources.json`.

### Required fields
- `id: string` (immutable, unique)
- `name: string`
- `platform: "tg" | "yt" | "ig" | "web" | "wa"`
- `source_type: string` (contoh: `channel`, `group`, `topic`, `site`)
- `url: string`
- `handle: string`
- `region: string`
- `priority: number`
- `added_at: string` (datetime)

### Optional fields
- `category: string[]`

### Conditional fields (wajib untuk topic)
- `parent_id: string`
- `topic_id: string`

### Identity & naming rules
- Format `id`: `<platform_code>-<canonical_slug>`
- `id` tidak berubah walau `name/url` berubah
- Prefix `id` harus match `platform`

---

## Entity: LatestSnapshotDocument
Representasi file `data/latest.json`.

### Required top-level
- `generated_at: string` (datetime)
- `version: string`
- `total_sources: number`
- `monitored_sources: number`
- `by_status: object`
- `snapshots: SnapshotItem[]`

### `by_status` keys
- `active`
- `stale`
- `dead`
- `blocked`
- `error`
- `unmonitored`

---

## Entity: SnapshotItem
Representasi status terbaru per source.

### Required fields
- `source_id: string` (FK ke `Source.id`)
- `status: "active" | "stale" | "dead" | "blocked" | "error" | "unmonitored"`
- `last_checked_at: string` (datetime)
- `confidence_score: number` (0..1, derived)
- `checks: CheckItem[]`

### Confidence score baseline derivation (v1)
- `confidence_score = 0.40*http_fetch + 0.35*content_parse + 0.25*freshness`
- Setiap komponen bernilai `1` jika check `ok=true`, `0` jika `ok=false`.

### `CheckItem`
- `name: string`
- `ok: boolean`
- `details: string`

---

## Validasi Relasi
- Setiap `snapshot.source_id` harus ditemukan di `sources.json`.
- Jika `source_type = "topic"`, `parent_id` harus merujuk source parent yang ada.

---

## Catatan Fase
- Fase awal boleh hanya punya fixture real `tg` + `web`.
- Allowed platform tetap disiapkan untuk ekspansi (`yt`, `ig`, `wa`).
