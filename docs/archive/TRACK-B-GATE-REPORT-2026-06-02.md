# Track B Gate Report — 2026-06-02

## Summary
- Window: Day 1 attempt only
- Workflow: `check-telegram-auth-spike.yml`
- Expected branch: `phase-1.5-auth-spike`
- Run branch/SHA: `main` / `f1ac3216e095dd82e714f23c80502c51782bb0cf`
- Verdict: `GO WITH GUARDRAILS` pending a valid 3-day observation window

## 1) Run Reliability
- Total GitHub workflow runs verified: 1
- Successful GitHub workflow runs verified: 1
- Success rate: 100%
- Timeout count: 0
- Retry-triggered runs: 0
- Notes: Run `26793452611` completed successfully. The freshness step succeeded on attempt 1/2.

## 2) Auth Stability
- `needs_setup` count: 0 in GitHub run
- `error` count: 0 in GitHub run
- Session re-bootstrap needed? no
- Notes: GitHub Secrets are present and the regenerated MTProto session connected successfully.

## 3) Artifact Integrity
- freshness artifact present for valid Day-1 run: yes
- mapped artifact present for valid Day-1 run: yes
- evaluated artifact present for valid Day-1 run: yes
- No message content leakage confirmed: yes
- Notes: Artifact `telegram-auth-topic-freshness` uploaded with ID `7347257493`. Downloaded artifact inspection found no raw `text` keys, no raw Telegram message payload keys, and no secret literal values.

## 4) Mapping Quality
- Day 1: total/mapped/unmapped = 79/17/62
- Day 2: total/mapped/unmapped = pending
- Day 3: total/mapped/unmapped = pending
- Top unmapped topic titles:
  1. Kajian Yogyakarta
  2. Kajian Bandung
  3. Kajian Depok
- Mapping update required? yes

## 5) Status Semantics Sanity
- Day 1 status summary: freshness `run.status = blocked`; evaluator summary: `total_topics = 79`, `blocked = 79`, all other counts `0`
- Day 2 status summary: pending
- Day 3 status summary: pending
- Any abnormal spikes in `blocked`/`error`? `blocked = 79` is expected from the current spike limitation: no `last_post_at` timestamps resolved from topic `topMessage`.

## 6) Security & Compliance
- Secret exposed in logs: not observed locally
- Access anomaly detected: none observed locally
- Rate-limit/flood signals: none observed locally
- Actions taken: Inspected GitHub Actions logs and downloaded artifacts for run `26793452611`; secret values were masked as `***`.

## 7) Decision

### Recommendation
`GO WITH GUARDRAILS`

### Rationale
- The script chain is operational for the no-secret/bootstrap path.
- GitHub Secrets are present, the regenerated MTProto session works, and the workflow produced all required artifacts.
- Topic metadata is reachable, but the current freshness implementation does not resolve `last_post_at`; status remains platform/implementation `blocked`.
- Promotion to main checker should wait for three consecutive fresh workflow artifacts with non-`needs_setup`, non-`error` status.

### Guardrails
- Keep the auth spike workflow isolated.
- Do not replace group-level fallback until a valid 3-day observation window passes.
- Treat this report as Day-1 preflight, not Day-1 evidence.

## 8) Follow-up Tasks
1. Investigate timestamp resolution for forum topics; `topMessage` did not yield `last_post_at` in Day-1.
2. Expand `topic-region-map.json` for high-priority unmapped topics.
3. Continue Day-2/Day-3 observation and compare whether `blocked = 79` remains stable.
