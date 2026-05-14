# Contributing

Terima kasih sudah mau kontribusi 🙌

## Cara kontribusi tercepat

1. Fork repo
2. Buat branch baru
3. Ubah data di `data/sources.json`
4. Jalankan validasi lokal:
   - `npm run lint`
   - `npm run build`
5. Buat Pull Request

## Format source data

Setiap entri source minimal punya:

- `id`
- `name`
- `platform`
- `url`
- `handle`
- `category`
- `region`
- `priority`
- `added_at`

## Aturan

- Jangan scrape endpoint yang dilarang robots.txt.
- Jangan masukkan data private/non-public.
- Utamakan source resmi dan sertakan catatan jika status belum pasti.

## Issue labels (saran)

- `source-add`
- `source-update`
- `bug-scraper`
- `ui`
