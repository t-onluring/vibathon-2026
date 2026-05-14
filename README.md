# Source List Kajian Sunnah Indonesia (Vibathon 2026)

Layer-1 infrastructure untuk ekosistem kajian sunnah Indonesia: **open registry sumber kajian** + **automated health monitoring** (Phase 1: Telegram) agar aggregator/app lain bisa konsumsi data yang lebih reliable.

## Demo

- App (local/dev): `npm run dev` lalu buka `http://localhost:3000`
- Repository: [https://github.com/t-onluring/vibathon-2026](https://github.com/t-onluring/vibathon-2026)
- Netlify URL: _isi URL final deploy di sini_

## Fitur yang sudah jalan

- Registry sumber di `data/sources.json`
- Telegram health checker `scripts/check-telegram.ts`
- Snapshot output:
  - `data/latest.json`
  - `data/health/YYYY-MM-DD.json`
- GitHub Actions cron harian (`00:01 WIB`): `.github/workflows/health-check.yml`
- Dashboard dual-tab:
  - **Plan & Roadmap** (render markdown dari `data/docs/`)
  - **Live Dashboard** (render snapshot + filter + status grouping)

## Menjalankan project

```bash
npm install
npm run dev
```

Build production:

```bash
npm run lint
npm run build
npm run start
```

Jalankan checker manual:

```bash
npm run check:telegram
```

## Struktur penting

- `data/sources.json` — source registry
- `data/latest.json` — latest summary untuk UI
- `data/health/` — arsip snapshot harian
- `scripts/check-telegram.ts` — checker utama
- `src/app/components/` — komponen UI dashboard
- `data/docs/` — dokumen roadmap/steps/handoff untuk tab docs

## Kontribusi

- Panduan utama: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Quick path non-teknis: [docs/CONTRIBUTOR_GUIDE.md](./docs/CONTRIBUTOR_GUIDE.md)
- Gunakan issue templates untuk **Source Add** / **Source Update** lalu buka PR.
- Validator otomatis di PR: `.github/workflows/validate-sources.yml`

Validasi lokal sebelum PR:

```bash
npm run validate:sources
npm run lint
npm run build
```

## License

- Code: [MIT](./LICENSE)
- Data & docs: [CC-BY-SA 4.0](./data/LICENSE)
