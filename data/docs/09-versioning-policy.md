# Versioning Policy (Static API v1)

## Tujuan
Menjaga kontrak file statis tetap stabil untuk consumer app lintas tim.

## Ruang Lingkup
- `data/sources.json`
- `data/latest.json`

## Skema Versi
Gunakan format: `vMAJOR.MINOR.PATCH` pada field `version` di `data/latest.json`.

### Aturan perubahan
- **PATCH**: perubahan non-breaking kecil (typo, detail checks, perbaikan metadata).
- **MINOR**: penambahan field baru yang backward-compatible.
- **MAJOR**: perubahan breaking (hapus/rename field, ubah makna field inti).

## Kewajiban sebelum rilis
1. Jalankan validasi sources dan snapshot schema.
2. Pastikan semua `snapshot.source_id` adalah subset dari `sources.id`.
3. Catat perubahan versi + alasan di `docs/app/08-decisions.md`.

## Contoh
- `v1.0.0` → baseline pertama static API.
- `v1.1.0` → tambah field optional baru (non-breaking).
- `v2.0.0` → ubah struktur `checks[]` yang membuat parser lama gagal.
