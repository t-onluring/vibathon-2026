# Track B — 3-Day Observation Checklist (B7/B8)

## Tujuan
Memvalidasi kelayakan implementasi authenticated topic freshness sebelum integrasi ke checker utama.

## Periode
- Hari 1
- Hari 2
- Hari 3

## Prasyarat (sekali sebelum Hari 1)
- [ ] Secrets terpasang di GitHub repo:
  - [ ] `TG_API_ID`
  - [ ] `TG_API_HASH`
  - [ ] `TG_SESSION_STRING`
- [ ] Workflow tersedia: `check-telegram-auth-spike.yml`
- [ ] Branch uji: `phase-1.5-auth-spike`

---

## Checklist Harian

### A. Workflow execution
- [ ] Workflow ter-trigger (schedule/manual)
- [ ] Job selesai tanpa timeout
- [ ] Retry tidak melebihi batas

### B. Artifact checks
- [ ] `telegram-topic-freshness.json` ada
- [ ] `telegram-topic-freshness-mapped.json` ada
- [ ] `telegram-topic-freshness-evaluated.json` ada
- [ ] Tidak ada content message mentah di artifact

### C. Semantic checks
- [ ] `run.status` bukan `needs_setup`
- [ ] `run.status` bukan `error`
- [ ] Distribusi status masuk akal (`blocked/error` tidak melonjak abnormal)

### D. Mapping checks
- [ ] `mapped_topics` > 0 (target saat data real sudah masuk)
- [ ] `unmapped_topics` dicatat untuk update rule map

### E. Security checks
- [ ] Log tidak menampilkan secret mentah
- [ ] Tidak ada token/session leakage di output

---

## Gate Decision After Day 3

### GO jika semua terpenuhi:
- [ ] Success rate run >= 95%
- [ ] Secrets stabil (tidak perlu re-bootstrap berulang)
- [ ] Artifact valid 3 hari beruntun
- [ ] Mapping bisa ditingkatkan tanpa ubah arsitektur

### NO-GO jika salah satu terjadi:
- [ ] Auth sering invalid/revoked
- [ ] Run sering `needs_setup` / `error`
- [ ] Data tidak konsisten untuk pengambilan keputusan freshness
- [ ] Risiko operasional/security terlalu tinggi

---

## Output yang wajib disiapkan
- [ ] Gate report: `TRACK-B-GATE-REPORT-YYYY-MM-DD.md`
- [ ] Keputusan final: `GO` / `GO WITH GUARDRAILS` / `NO-GO`
- [ ] Next step yang jelas (integrasi checker utama atau perbaikan spike)

---

## Observation Log

### 2026-06-02 — Day-1 attempt

Findings:
- GitHub Secrets verified present in repo: `TG_API_ID`, `TG_API_HASH`, `TG_SESSION_STRING`.
- Workflow manually dispatched on GitHub Actions: <https://github.com/t-onluring/vibathon-2026/actions/runs/26793452611>
- Run branch/SHA: `main` / `f1ac3216e095dd82e714f23c80502c51782bb0cf`.
- Job conclusion: success.
- Freshness step connected to Telegram MTProto and fetched 79 forum topics.
- Freshness `run.status = blocked` because no `last_post_at` timestamps were resolvable from topic `topMessage` in this run.
- Retry usage: attempt 1/2 succeeded; no retry needed.
- Artifact uploaded successfully:
  - name: `telegram-auth-topic-freshness`
  - artifact ID: `7347257493`
  - download URL: <https://github.com/t-onluring/vibathon-2026/actions/runs/26793452611/artifacts/7347257493>
- Mapping/evaluator results:
  - mapping: `total_topics = 79`, `mapped_topics = 17`, `unmapped_topics = 62`
  - evaluator: `total_topics = 79`, `active = 0`, `stale = 0`, `dead = 0`, `blocked = 79`, `error = 0`
- Secrets were masked as `***` in logs.
- Downloaded artifact inspection found no raw `text` keys, no raw Telegram message payload keys, and no secret literal values.

Day-1 checklist status:
- Workflow execution: completed successfully without timeout or retry.
- Artifact checks: completed; all three expected JSON artifacts were present.
- Semantic checks: completed; `run.status = blocked`, not `needs_setup` or `error`.
- Mapping checks: partial; `mapped_topics = 17`, `unmapped_topics = 62`.
- Security checks: no raw secret values or raw message text observed in inspected logs/artifacts.

Required next action:
- Investigate why topic `topMessage` metadata does not resolve to `last_post_at`, expand `topic-region-map.json` for unmapped regions, then continue Day-2/Day-3 observation.
