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

---

## Entity: ContributionIntake
Representasi usulan contributor pada `data/contributions/pending/*.json`.

### Required fields
- `name: string`
- `platform: "tg" | "yt" | "ig" | "web" | "wa"`
- `source_type: "channel" | "group" | "topic" | "site" | "profile"`
- `url: string`
- `handle: string`
- `region: string`
- `evidence_url: string`
- `submitted_by: string`

### Optional fields
- `category: string[]`
- `tags: string[]`
- `notes: string`

### Conditional fields
- Jika `source_type = "topic"`, wajib ada `parent_id` dan `topic_id`.
- `topic_id` untuk intake topic wajib numerik.

### Promotion
- File intake tidak otomatis masuk API.
- Maintainer mempromosikan intake yang approved ke `data/sources.json`.
- Setelah promote, jalankan validator registry dan snapshot relation.

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

### Confidence score baseline derivation (v1 → Phase 2 prep)
- `confidence_score = 0.25*http_reachable + 0.40*content_parseable + 0.35*freshness_score`
- `http_reachable`, `content_parseable` bernilai `1` jika check `ok=true`, `0` jika `ok=false`.
- `freshness_score` adalah 0.0–1.0 (tiered: `<3h=1.0`, `3–7h=0.8`, `7–14h=0.5`, `14–30h=0.2`, `>30h/null=0`), dari `freshnessScore()/100`.
- Floor `0.25` ketika hanya `http_reachable` yang ok (parse fail) — konsisten lintas platform.
- Phase 2: tambah `extraction_quality` (opsional) yang merebobot ke `0.20/0.30/0.30/0.20`.

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
