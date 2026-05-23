# Data Model

## Entity: Source
Minimal field:
- `id`
- `name`
- `platform`
- `url`
- `handle`
- `category[]`
- `region`
- `priority`
- `added_at`

## Entity: Snapshot
Field utama:
- `source_id`
- `checked_at`
- `platform`
- `status`
- `reliability_score`
- `metrics` (subscriber/last_post)

## Konvensi Naming
- File docs UI pakai prefix urutan: `00-...md` s.d. `08-...md`
- Source ID konsisten lintas snapshot
