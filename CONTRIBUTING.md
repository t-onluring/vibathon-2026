# Contributing

Terima kasih sudah mau kontribusi 🙌

## Open Contribution Flow (PR-based)

1. Buat issue dari template:
   - **Source Add Request** untuk sumber baru
   - **Source Update Request** untuk update sumber existing
2. Fork repo dan buat branch: `contrib/<ringkas-perubahan>`
3. Edit `data/sources.json`
4. Jalankan validasi lokal:
   - `npm run validate:sources`
   - `npm run lint`
   - `npm run build`
5. Push branch dan buka Pull Request
6. Isi checklist + evidence pada PR template

## Contract Data Source

Setiap entri source minimal wajib memiliki:

- `id` (unik)
- `name`
- `platform` (`telegram`/`instagram`/`facebook`/`whatsapp`/`website`/`youtube`)
- `url` (http/https valid)
- `handle`
- `category` (array string, tidak boleh kosong)
- `region`
- `priority` (`high`/`medium`/`low`/`archived`)
- `added_at` (format `YYYY-MM-DD`)

## Rules Review

PR akan ditahan bila:
- `id` duplikat
- `url` duplikat
- kombinasi `handle+platform` duplikat
- format URL/tanggal tidak valid
- tidak ada bukti source aktif

## Governance

- Owner data: lihat `CODEOWNERS`
- Target review awal: **maks. 48 jam**
- Label yang dipakai:
  - `source-add`
  - `source-update`
  - `needs-validation`
  - `needs-proof`
  - `ready-to-merge`

## Safety

- Jangan scrape endpoint yang melarang akses (cek robots/policy)
- Jangan masukkan data private/non-public
- Utamakan source resmi dan berikan catatan jika status belum pasti
