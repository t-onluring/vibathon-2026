# Quality Gates — Vibathon Scope

_Last updated: 2026-05-17_

## Document Contract

Setiap phase **wajib** punya blok berikut:
1. Objective
2. Scope
3. Metrics Gate (angka)
4. NO-GO Trigger
5. Release Decision (`GO` / `GO WITH GUARDRAILS` / `NO-GO`)

Format gate wajib tabel agar konsisten lintas phase.

## Hierarchy Reference

Roadmap utama tetap:
- Phase 0: Konsolidasi
- Phase 1: Vibathon Scope (milestone internal: 1.5, 2, 3, 4)
- Phase 2: Multi-Platform
- Phase 3: Open Contribution
- Phase 4: Public Dataset

Dokumen ini fokus ke gates milestone internal pada **Phase 1** dan split hardening **4.1/4.2/4.3**.

## Phase Gates

## Phase 1.5 — Parent-Child Sources

| Metric | Target |
|---|---|
| TG channel/group check coverage | 100% untuk source `tg` bertipe `channel`/`group` |
| Source validation pass | 100% |
| Existing source regression | 0 |
| Region filter availability | semua `region` di `sources.json` bisa difilter di dashboard |
| Health-check runtime increase | <= 20% vs baseline |

**NO-GO:** checker menulis snapshot di luar schema v1, source validation fail > 0, atau region filter tidak bisa mengisolasi source sesuai `region`.

## Phase 2 — Text Event Extraction MVP

| Metric | Target |
|---|---|
| Golden dataset size | >= 200 messages |
| F1 (ustadz/masjid/date) | >= 0.90 |
| F1 (time/tema) | >= 0.80 |
| High-confidence precision | >= 0.92 |
| End-to-end batch latency p95 | < 15 menit |
| Idempotent re-run mismatch | 0 |

Cost guardrail: warning 70%, critical 90%, hard stop 100% budget harian.

**NO-GO:** F1 core field < 0.85, atau schema/API contract break.

## Phase 3 — Vision Extraction

| Metric | Target |
|---|---|
| Image event precision | >= 0.85 |
| Multi-event split accuracy | >= 0.80 |
| Fusion conflict unresolved | < 5% |
| Review queue SLA | < 24 jam |

**NO-GO:** precision < 0.80, atau hallucination spike > 10% pada sample audit.

## Phase 4.1 — Dedup + Forward Intelligence

| Metric | Target |
|---|---|
| Dedup precision | >= 0.90 |
| False merge rate | < 2% |
| False split rate | < 5% |
| Provenance completeness | 100% records |

**NO-GO:** false merge > 5% atau dedup precision < 0.88.

## Phase 4.2 — Near Real-time Ingestion

| Metric | Target |
|---|---|
| Message-to-API latency p95 | < 30 menit |
| Ingestion success rate | >= 99% |
| Backlog age p95 | < 30 menit |
| Failed cycle streak | < 2 |

**NO-GO:** 2 cycle ingestion gagal beruntun, atau latency p95 > 45 menit selama > 2 jam.

## Phase 4.3 — API Hardening + Verification

| Metric | Target |
|---|---|
| API availability | >= 99.5% |
| 5xx error rate | < 1% |
| 429 rate (normal load) | < 3% |
| OpenAPI parity | 100% published endpoints |
| Verification turnaround | < 24 jam |
| Consumer onboarding | >= 2 app integration pass |

**NO-GO:** breaking contract drift, atau 5xx > 2% selama 30 menit.

## Traceability

| Gate Group | Sumber Keputusan |
|---|---|
| 1.5 scrape/validation/runtime | Phase 1.5 parent-child rollout decision |
| Phase 2 F1/latency/idempotency | Text extraction MVP acceptance criteria |
| Phase 3 precision/split/conflict | Vision extraction safety-cost decision |
| 4.1 dedup precision/merge | Cross-source dedup hardening decision |
| 4.2 latency/ingestion/backlog | Near real-time reliability decision |
| 4.3 API/error/openapi | Public API hardening readiness decision |

## Alert Thresholds & Escalation

- **SEV1**: stop auto-publish, owner ping immediate.
- **SEV2**: continue with guardrails, owner ping < 1 jam.
- **SEV3**: log + triage mingguan.

Minimum monitoring metrics:
- Ingestion success rate
- Extraction success rate
- Confidence distribution
- Dedup conflicts
- Latency p50/p95
- Daily cost
- Publish vs hold vs review queue
- API error rate + 429 rate

## Validation Checklist

- [ ] Hierarki phase utama vs subphase konsisten
- [ ] Tidak ada angka threshold yang konflik antar section
- [ ] Semua phase mandatory punya NO-GO trigger
- [ ] Semua istilah status menggunakan kata tegas (hindari ambigu)
- [ ] Cross-link ke dokumen roadmap internal tersedia

## Related Docs

- [Phase 1 Internal Roadmap (MD)](./phase-1-internal-roadmap.md)
- [Phase 1 Internal Roadmap (HTML)](./phase-1-internal-roadmap.html)
