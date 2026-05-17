# Docs Conventions

Dokumen ini jadi panduan singkat agar dokumentasi tetap rapi dan konsisten.

## 1) Single source of truth

- Semua dokumentasi proyek disimpan di folder `docs/`.
- File di root repo dipakai untuk entry-point produk/teknis saja (mis. `README.md`).
- Panduan kontribusi resmi ada di: [CONTRIBUTING.md](./CONTRIBUTING.md)

## 2) Struktur folder

- `docs/CONTRIBUTING.md` → panduan kontribusi (quick path + full guide)
- `docs/app/` → **source of truth** konten docs untuk UI (`00-...md` s.d. `08-...md`)
- `docs/roadmap/` → roadmap per fase dan quality gates
- `docs/archive/` → arsip dokumen lama yang tidak ditampilkan di drawer
- `data/docs/` → salinan dokumen yang dirender di UI aplikasi (Plan & Roadmap tab)

## 3) Aturan link

- Gunakan **relative link** untuk link internal repo.
  - Contoh benar: `./roadmap/phase-1-internal-roadmap.md`
  - Contoh benar: `../../README.md`
- Hindari link absolut lokal seperti `file:///...`.
- Hindari path non-relatif seperti `projects/...`.
- Link eksternal tetap pakai `https://...`.

## 4) Aturan update dokumen

Saat update fitur/flow penting:

1. Edit dokumen utama di `docs/app/`.
2. Sinkronkan salinannya ke `data/docs/` (nama file harus sama).
3. Cek ulang semua link internal markdown agar tidak putus.

## 5) Checklist sebelum merge

- [ ] Link internal markdown valid
- [ ] Tidak ada duplikasi dokumen yang membingungkan
- [ ] Dokumen kontribusi hanya di `docs/CONTRIBUTING.md`
- [ ] `data/docs/` sudah sinkron jika ada perubahan konten untuk UI
