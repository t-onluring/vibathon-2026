# Changelog / Decision Log

## Template Entry (gunakan format ini)
- **Tanggal:** YYYY-MM-DD
- **Konteks:** masalah/trigger keputusan
- **Keputusan:** apa yang dipilih
- **Alternatif ditolak:** opsi lain + kenapa ditolak
- **Dampak:** efek ke data, API, UI, dan operasional
- **Follow-up:** file/task lanjutan

---

## 2026-05-11
- **Konteks:** Menentukan arah awal Vibathon agar cepat jalan dengan resource terbatas.
- **Keputusan:**
  - Pilih Layer-1 positioning (bukan aggregator end-user).
  - Pilih Telegram untuk Phase 1 karena paling feasible.
  - Data store pakai JSON di Git.
  - Cron pakai GitHub Actions.
- **Alternatif ditolak:** DB penuh sejak awal (ditolak: beban operasional tinggi untuk fase awal).
- **Dampak:** setup jadi murah, mudah versioning, dan cepat iterasi.
- **Follow-up:** validasi alur checker + publish data statis.

## 2026-05-14
- **Konteks:** Validasi readiness aplikasi dan checker setelah iterasi awal.
- **Keputusan:**
  - Dashboard dual-tab dipastikan berjalan.
  - Hasil checker dan build tervalidasi.
- **Alternatif ditolak:** menambah fitur baru sebelum stabilisasi (ditolak: risiko regressions).
- **Dampak:** baseline produk stabil untuk lanjut ke kontrak data.
- **Follow-up:** rapikan docs dan workflow kontribusi.

## 2026-05-17 (Docs consolidation)
- **Konteks:** Dokumentasi tersebar dan sulit dijadikan acuan tunggal.
- **Keputusan:**
  - Dokumentasi dikonsolidasi ke `docs/`.
  - Kontribusi dipusatkan ke `docs/CONTRIBUTING.md`.
  - Konvensi docs ditetapkan di `docs/README.md`.
- **Alternatif ditolak:** mempertahankan docs tersebar (ditolak: onboarding lambat).
- **Dampak:** review dan pembelajaran tim lebih terstruktur.
- **Follow-up:** sinkronisasi kontrak vs model data.

## 2026-05-17 (Static API v1 baseline)
- **Konteks:** Ada real user demand dari Telegram untuk consume list source kajian; target implement bertahap dan biaya rendah.
- **Keputusan:**
  - Publish set v1: `data/sources.json` + `data/latest.json`.
  - Identity policy: `id` immutable, `name` boleh berubah.
  - ID convention: `<platform_code>-<canonical_slug>`.
  - Allowed `platform_code` baseline: `tg, yt, ig, web, wa`.
  - Validation payload snapshot wajib: `status`, `last_checked_at`, `confidence_score`, `checks[]`.
  - Topic Telegram dimodelkan parent-child (`source_type=topic`, `parent_id`, `topic_id`) di bawah parent group.
  - Confidence score v1 dibakukan dengan weighted baseline.
  - Topic discovery governance dibakukan lewat `data/topic-registry.json`.
- **Alternatif ditolak:**
  - Menjadikan `url` atau `handle` sebagai ID utama (ditolak: tidak immutable, rawan drift/rename).
  - Memaksa DB/server dinamis dari awal (ditolak: tidak sesuai fase bertahap).
- **Dampak:** consumer app dapat kontrak stabil, tetap ringan secara operasional, dan siap naik level jadi validation layer.
- **Follow-up:**
  - Sinkronkan `docs/app/03-api-contract.md` ↔ `docs/app/04-data-model.md`.
  - Tegakkan test matrix minimal (8 case).
  - Finalisasi contoh `sources.json` parent+topic dengan `topic_id` real.
  - Terapkan UI states v1 untuk trust/error communication.

## 2026-05-24 (Step B topic discovery fallback)
- **Konteks:** Validasi dilakukan untuk `@sijadwalkajian` guna membuktikan apakah topic Telegram bisa di-scrape lewat public web HTML.
- **Keputusan:**
  - Topic-level monitoring untuk `@sijadwalkajian` ditunda.
  - Source aktif yang dipertahankan hanya parent group `tg-sijadwalkajian`.
  - Placeholder topic children Jakarta/Surabaya dikeluarkan dari `data/sources.json` dan `data/latest.json`.
  - `data/topic-registry.json` dikosongkan sampai ada bukti `topic_id` numerik yang didapat dari sumber resmi/app internal.
- **Alternatif ditolak:**
  - Tetap publish topic placeholder (ditolak: memberi kesan support yang belum terbukti).
  - Menebak `topic_id` dari URL publik (ditolak: tidak ada bukti HTML publik yang mengekspos daftar topic atau selector message yang parseable).
- **Dampak:** publish set v1 kembali konsisten dengan kemampuan scraper saat ini; consumer hanya melihat group-level coverage untuk `sijadwalkajian`.
- **Follow-up:**
  - Simpan hasil validasi di `docs/archive/STEP-B-2026-05-24-sijadwalkajian-topic-validation.md`.
  - Jika nanti ada akses app/admin/export yang memperlihatkan `topic_id` real, ulangi discovery dan onboarding topic dari nol.
