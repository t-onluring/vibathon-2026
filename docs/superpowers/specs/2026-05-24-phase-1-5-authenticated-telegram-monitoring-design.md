# Phase 1.5 Design — Authenticated Strategy + Data-First Web IA

Date: 2026-05-24  
Status: Approved

## 1) Goal
Close Phase 1.5 with a data-first product foundation for developer consumers while keeping topic monitoring realistic under Telegram constraints.

Primary outcomes:
- Stable static API contract and trust semantics (`blocked` vs `error`)
- Region-aware dashboard filtering
- Clear path for authenticated topic freshness monitoring (Phase 1.5 extension spike)

## 2) Constraints and Decisions
- Public Telegram HTML is insufficient for `@sijadwalkajian` topic freshness.
- Current accepted fallback for public scrape: group-level only.
- Deployment preference: free + reliable; keep current hosting posture.
- Product priority: long-term foundation (data-first), audience = developers/API consumers.
- IA priority: 50/50 Contract/Trust and Live Monitor.

## 3) Approaches Considered (Authenticated Path)

### A. MTProto client session (recommended)
Use authenticated session token (service account) to pull topic freshness daily.

Pros:
- Most reliable for topic-level freshness.
- Works where public HTML does not expose topic timeline.

Cons:
- Session bootstrap and secret hygiene required.

### B. Bot API membership strategy
Use bot in group/forum and collect message/topic freshness.

Pros:
- Cleaner operational auth model.

Cons:
- Permissions/coverage limitations for forum topics/history.

### C. Web Telegram UI automation
Automate authenticated web.telegram.org UI scraping.

Pros:
- Fast POC path.

Cons:
- Most brittle and maintenance-heavy.

Recommendation: **A (MTProto session)** for daily freshness target.

## 4) Information Architecture (Web)
Single-page dual-home layout:

1. Top summary bar
   - version, generated_at, total_sources, monitored_sources, status distribution
2. Left (50%): Contract & Trust
   - endpoints, required fields, status semantics, confidence/checks explanation
3. Right (50%): Live Monitor
   - trend, filters, source list, source details
4. Decision strip
   - key incidents/decisions (e.g., fallback events)

## 5) Components and Data Flow

Components:
- `ContractPanel`
- `TrustSemanticsPanel`
- `MonitorPanel`
- `FilterBar` (status/platform/region/search)
- `SourceList` + `SourceDetailDrawer`
- `DecisionStrip`

Data flow:
`data/sources.json` + `data/latest.json` -> normalize layer -> typed view model -> UI panels

Principle: UI is a consumer of contract truth; checker/validators own operational truth.

## 6) Status Semantics (Final)
- `active`: freshness available and healthy
- `stale` / `dead`: freshness available but old
- `error`: fetch/parser/runtime failure
- `blocked`: fetch success but platform surface limits required freshness/timeline
- `unmonitored`: registered source without active checker strategy

Operational rules:
1. `http_fetch=false` -> `error`
2. `http_fetch=true` + freshness unavailable due to platform surface -> `blocked`
3. freshness available -> age-based `active/stale/dead`

## 7) Test Strategy
Minimum Phase 1.5 closeout coverage:
1. Contract schema checks (`version`, `monitored_sources`, `last_checked_at`, `confidence_score`, `checks[]`)
2. Status classification matrix (`error` vs `blocked` vs freshness states)
3. UI filter behavior (status/platform/region/search AND logic)
4. Snapshot-source relation consistency

## 8) Quality Gates (Fallback Closeout)
- Source validation pass: 100%
- Snapshot relation pass: 100%
- Version format pass: valid `vMAJOR.MINOR.PATCH`
- Region filter available for all source regions
- Build/deploy regression: 0

## 9) Rollout Sequence
1. Lock semantics (`blocked` vs `error`)
2. Regenerate `latest.json`
3. Validate all checks + build
4. Publish
5. Observe 2-3 days for distribution stability

## 10) Scope Boundary
In-scope (Phase 1.5 closeout):
- Contract/trust clarity
- Region filter
- Checker baseline and fallback semantics

Out-of-scope (deferred):
- Full topic-level monitoring via authenticated pipeline implementation
- Event extraction (Phase 2)
- OCR/vision (Phase 3)

