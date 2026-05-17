# Feature Specs

## 1) Source Registry
**Tujuan:** menyimpan daftar sumber terstandar.
**Acceptance:** validasi lulus, tidak ada duplikasi id/url/handle+platform.
**Edge case:** source tidak aktif, URL berubah.

## 2) Telegram Health Checker
**Tujuan:** menilai freshness/reliability secara otomatis.
**Acceptance:** menghasilkan `latest.json` + arsip harian.
**Edge case:** throttling, channel private, parsing gagal.

## 3) Live Dashboard
**Tujuan:** menampilkan status sumber secara cepat.
**Acceptance:** summary status dan list source tampil di UI.
**Edge case:** data kosong, timestamp invalid.

## 4) Open Contribution
**Tujuan:** kontribusi source via PR.
**Acceptance:** checklist kontribusi jelas, CI validasi jalan.
**Edge case:** data tidak lengkap atau bukti tidak cukup.
