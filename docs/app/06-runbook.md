# Runbook / Troubleshooting

## Checker Gagal
1. Jalankan lokal: `npm run check:telegram`
2. Cek error parsing/fetch
3. Verifikasi channel publik dan format URL

## Data Tidak Tampil di Dashboard
1. Cek `data/latest.json`
2. Jalankan `npm run build`
3. Pastikan loader `loadLatest()` tidak return `null`

## PR Validasi Gagal
1. Jalankan `npm run validate:sources`
2. Cek duplikasi `id`, `url`, `handle+platform`
3. Pastikan `added_at` format `YYYY-MM-DD`

## Recovery Cepat
- Re-run workflow `health-check.yml` manual
- Commit perbaikan data
- Rebuild/deploy ulang
