# Contributing

Dokumen ini adalah sumber utama kontribusi untuk project Vibathon.

## Quick Path

1. Buat issue dari template:
   - **Source Add Request** untuk sumber baru
   - **Source Update Request** untuk update sumber existing
2. Fork repo dan buat branch: `contrib/<ringkas-perubahan>`
3. Tambahkan file JSON kecil di `data/contributions/pending/<slug>.json`
4. Jalankan validasi lokal:
   - `npm run validate:contributions`
   - `npm run validate:sources`
   - `npm run lint`
   - `npm run build`
5. Push branch dan buka Pull Request
6. Isi checklist + evidence pada PR template

## Full Guide

### Tiga Jalur Data

Project ini memakai tiga jalur terpisah:

1. **Registry resmi**: `data/sources.json`
   - Source of truth untuk dashboard dan static API.
   - Umumnya hanya maintainer/script promote yang mengubah file ini.

2. **Discovery/spike**: `data/spikes/*`
   - Hasil eksperimen atau machine-discovered candidates.
   - Contoh: Track B Telegram topic discovery.

3. **Contribution intake**: `data/contributions/pending/*.json`
   - Jalur crowd-source untuk contributor GitHub.
   - Contributor menambahkan file usulan kecil, bukan edit registry besar langsung.
   - Maintainer mereview lalu promote ke `data/sources.json`.

### Contract Contribution Intake

Setiap file pending minimal wajib memiliki:

- `name`
- `platform` (`tg`/`ig`/`web`/`wa`/`yt`)
- `source_type` (`channel`/`group`/`topic`/`site`/`profile`)
- `url` (http/https valid)
- `handle`
- `region`
- `evidence_url` (link bukti publik)
- `submitted_by`

Contoh:

```json
{
  "name": "Kajian Kota Contoh",
  "platform": "tg",
  "source_type": "channel",
  "url": "https://t.me/kajiancontoh",
  "handle": "kajiancontoh",
  "region": "kota-contoh",
  "category": ["kajian", "jadwal"],
  "tags": ["kajian", "jadwal"],
  "evidence_url": "https://t.me/kajiancontoh",
  "submitted_by": "github-username",
  "notes": "Akun publik aktif."
}
```

### Contract Registry Source

Setiap entri source minimal wajib memiliki:

- `id` (unik)
- `name`
- `platform` (`tg`/`ig`/`web`/`wa`/`yt`)
- `source_type` (`channel`/`group`/`topic`/`site`/`profile`)
- `url` (http/https valid)
- `handle`
- `category` (array string, tidak boleh kosong)
- `region`
- `priority` (number)
- `added_at` (format `YYYY-MM-DD`)

### Maintainer Promote Flow

Gunakan script untuk mengurangi copy-edit manual dari pending contribution ke registry resmi.

1. Review semua pending contribution:

   ```bash
   npm run review:contributions
   ```

2. Preview satu file yang akan dipromote. Default mode adalah **dry-run** dan tidak menulis file:

   ```bash
   npm run promote:contribution data/contributions/pending/<slug>.json
   ```

3. Jika preview sudah benar, apply promotion secara eksplisit:

   ```bash
   npm run promote:contribution data/contributions/pending/<slug>.json -- --apply
   ```

4. Jalankan validasi akhir:

   ```bash
   npm run validate:contributions
   npm run validate:sources
   npm run lint
   npm run build
   ```

Saat `--apply`, script akan:

- generate `id` resmi
- append entry ke `data/sources.json`
- update top-level `updated_at`
- memindahkan pending file ke `data/contributions/archive/promoted/`

Untuk Telegram topic, ID dibuat topic-aware, misalnya:

```txt
tg-sijadwalkajian-topic-201
```

### Rules Review

PR akan ditahan bila:

- `id` duplikat
- `url` duplikat
- kombinasi `handle+platform` duplikat
- format URL/tanggal tidak valid
- tidak ada bukti source aktif
- contributor mengubah `data/sources.json` tanpa alasan maintainer

### Governance

- Owner data: lihat `CODEOWNERS`
- Target review awal: **maks. 48 jam**
- Label yang dipakai:
  - `source-add`
  - `source-update`
  - `needs-validation`
  - `needs-proof`
  - `ready-to-merge`

### Safety

- Jangan scrape endpoint yang melarang akses (cek robots/policy)
- Jangan masukkan data private/non-public
- Utamakan source resmi dan berikan catatan jika status belum pasti
