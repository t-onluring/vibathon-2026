# Runbook / Troubleshooting

## Template Operasional (gunakan ini untuk section baru)
- **Tujuan:** apa yang ingin diverifikasi/diperbaiki
- **Trigger:** kapan prosedur ini dipakai
- **Langkah Verifikasi:** langkah cek berurutan
- **Expected Result:** indikator sukses
- **Jika Gagal:** tindakan pemulihan

---

## Pre-Release Check (Static API v1)
**Tujuan:** memastikan paket publish v1 valid sebelum merge/deploy.

### Checklist
1. Validasi source registry:
   - Jalankan `npm run validate:sources`
   - Pastikan `id` unique dan immutable
   - Pastikan prefix `id` match `platform`
2. Validasi parent-topic Telegram:
   - `source_type=topic` wajib punya `parent_id` dan `topic_id`
   - `parent_id` harus mengarah ke source parent yang ada
3. Validasi file publish:
   - `data/sources.json` ada dan parseable
   - `data/latest.json` ada dan parseable
4. Validasi schema snapshot v1:
   - wajib ada `status`, `last_checked_at`, `confidence_score`, `checks[]`
5. Validasi relasi snapshot:
   - semua `snapshot.source_id` harus ada di `data/sources.json` (100% subset)
6. Smoke build:
   - Jalankan `npm run build`

**Expected Result:** semua check lulus, dashboard tetap tampil, tidak ada field kontrak yang hilang.

---

## Checker Gagal
1. Jalankan lokal: `npm run check:telegram`
2. Cek error parsing/fetch
3. Verifikasi source publik dan format URL
4. Jika source topic, cek `topic_id` dan `parent_id` benar
5. Jika gagal generate `data/latest.json`, jangan publish file rusak

## Telegram Topic ID Discovery (wajib sebelum onboarding topic baru)
1. Identifikasi topic dari sumber resmi (app/admin) dan catat `topic_id` numerik.
2. Simpan hasil ke `data/topic-registry.json` (`parent_id`, `topic_id`, `region`, `verified_at`, `verified_by`).
3. Bentuk URL topic: `https://t.me/<handle>/<topic_id>`.
4. Uji fetch + parse dengan checker lokal.
5. Jika tidak parseable, tandai `blocked` dan jangan klaim source `active`.
6. Simpan catatan verifikasi di PR (topic, topic_id, timestamp cek).

## Data Tidak Tampil di Dashboard
1. Cek `data/latest.json`
2. Jalankan `npm run build`
3. Pastikan loader `loadLatest()` tidak return `null`
4. Pastikan `source_id` di snapshot ada di `data/sources.json`

## PR Validasi Gagal
1. Jalankan `npm run validate:sources`
2. Cek duplikasi `id`, mismatch `id` prefix vs `platform`
3. Untuk topic: cek `parent_id/topic_id`
4. Pastikan `added_at` sesuai format yang dipakai kontrak proyek

## Recovery Cepat
- Re-run workflow `health-check.yml` manual
- Commit perbaikan data
- Rebuild/deploy ulang
- Jika baru ubah banyak data source, lakukan rollback ke commit data terakhir yang valid

## Last-Good Snapshot Fallback
Jika checker gagal total atau output parsial:
1. Pertahankan `data/latest.json` terakhir yang valid (last-good).
2. Jangan overwrite dengan output rusak/invalid JSON.
3. Tambahkan catatan incident di PR/ops note.
4. Jalankan ulang checker setelah perbaikan dan publish hanya jika validasi lulus.
