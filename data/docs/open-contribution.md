# Open Contribution (Phase 3)

Dokumen ini menjelaskan cara kontribusi publik berbasis Git PR untuk registry source.

## Jalur kontribusi

1. Buat issue dari template:
   - **Source Add Request**
   - **Source Update Request**
2. Fork repo, buat branch `contrib/<ringkas-perubahan>`
3. Ubah `data/sources.json`
4. Jalankan validasi:
   - `npm run validate:sources`
   - `npm run lint`
   - `npm run build`
5. Buka PR dan lengkapi checklist + evidence

## Contract data wajib

- `id` unik
- `url` valid dan tidak duplikat
- kombinasi `handle+platform` unik
- `added_at` format `YYYY-MM-DD`
- field minimum lengkap sesuai CONTRIBUTING

## Guardrail otomatis

PR akan menjalankan workflow:
- `.github/workflows/validate-sources.yml`

Jika validasi gagal, PR tidak boleh merge.

## SLA review

Target review awal maintainer: **maksimal 48 jam**.
