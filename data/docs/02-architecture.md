# Architecture

## High-Level
1. `data/sources.json` sebagai input source registry
2. `scripts/check-telegram.ts` melakukan fetch + scoring
3. Output ke `data/latest.json` dan `data/health/YYYY-MM-DD.json`
4. Next.js app membaca data statis saat build/runtime

## Komponen Utama
- Loader: `src/app/lib/data.ts`
- Dashboard: `src/app/components/AppTab.tsx`
- Docs view: `src/app/components/DocsTab.tsx` + `DocsDrawer.tsx`
- Cron: `.github/workflows/health-check.yml`

## Decision Utama
- Simpan data di Git (tanpa DB) untuk simplicity + versioning
- Cron via GitHub Actions untuk operasi harian murah
- Docs app dirender dari `data/docs/`
