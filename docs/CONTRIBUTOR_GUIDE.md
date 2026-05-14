# Contributor Guide (Quick Path)

Panduan cepat untuk kontribusi terbuka ke registry source Vibathon.

## 1) Pilih jenis kontribusi

- Tambah source baru → gunakan issue template **Source Add Request**
- Update source existing → gunakan issue template **Source Update Request**

## 2) Siapkan PR

1. Fork repository
2. Buat branch: `contrib/<ringkas-perubahan>`
3. Ubah `data/sources.json`
4. Jalankan validasi lokal:
   - `node scripts/validate-sources.mjs`
   - `npm run lint`
5. Push branch dan buka PR
6. Isi checklist dan evidence pada PR template

## 3) Aturan data minimal

Setiap source wajib punya:
- `id`
- `name`
- `platform`
- `url`
- `handle`
- `category` (array)
- `region`
- `priority`
- `added_at` (YYYY-MM-DD)

## 4) Kenapa PR bisa ditolak?

- `id` duplikat
- `url` duplikat
- kombinasi `handle+platform` duplikat
- URL tidak valid
- data tidak ada bukti/referensi publik

## 5) SLA review

Maintainer menargetkan review awal dalam **maksimal 48 jam**.
