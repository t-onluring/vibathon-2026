# Phase 1 Internal Roadmap — Vibathon Scope

_Last updated: 2026-05-17_

## Position in Main Roadmap

Dokumen ini menjelaskan milestone internal **Phase 1 (Vibathon Scope)**.

Top-level roadmap tetap:
- Phase 0: Konsolidasi
- Phase 1: Vibathon Scope
- Phase 2: Multi-Platform
- Phase 3: Open Contribution
- Phase 4: Public Dataset

## Milestones inside Phase 1

## 1.5 — Parent-Child Sources

Tujuan:
- Menutup baseline parent-child source tanpa memaksakan topic scrape yang belum terbukti
- Menyediakan region filter dan checker strategy refactor untuk source yang memang bisa dipantau

Output:
- `source_type`, `parent_id`, `topic_id` sebagai model data
- TG channel/group health check orchestration + fallback group-level only untuk forum yang topic HTML-nya tidak parseable
- Region-aware dashboard filtering

## 2 — Text Event Extraction MVP

Tujuan:
- Mengubah plain text message Telegram jadi event terstruktur

Output:
- Ingestion + parser + event store
- Structured fields: ustadz, masjid, tanggal, waktu, tema, lokasi
- API konsumsi internal/public snapshot

## 3 — Vision Extraction

Tujuan:
- Menangani poster gambar yang tidak tercover text parser

Output:
- OCR/vision extraction
- Multi-event poster splitting
- Caption-image fusion + confidence policy

## 4 — Full Pipeline Hardening

Tujuan:
- Menjadikan pipeline siap skala produksi

Split eksekusi:
- **4.1** Dedup + forward intelligence
- **4.2** Near real-time ingestion reliability
- **4.3** API hardening + verification workflow

## Status Guidance (for UI badge)

- `DONE`: milestone sudah production-stable
- `CURRENT`: fokus eksekusi sprint berjalan
- `NEXT`: milestone berikutnya setelah CURRENT

## Cross-links

- [Quality Gates](./quality-gates.md)
- [Phase 1 Internal Roadmap (HTML)](./phase-1-internal-roadmap.html)
