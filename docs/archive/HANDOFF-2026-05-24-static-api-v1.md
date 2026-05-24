# HANDOFF — Static API v1 baseline + merged PRs

> **Generated**: 2026-05-24 07:39 GMT+7
> **Repo**: `/var/home/tehaer/projects/HSI_Vibathon/codebase/vibathon-2026`
> **Branch after work**: `main`
> **Purpose**: preserve session context so next session can continue with Step B (topic discovery + scrape validation)

---

## What was completed in this session

### Strategic / docs decisions locked
- Static API v1 publish scope fixed to:
  - `data/sources.json`
  - `data/latest.json`
- Identity policy fixed:
  - `id` immutable
  - `name` mutable
  - format: `<platform_code>-<canonical_slug>`
- Platform codes fixed:
  - `tg, yt, ig, web, wa`
- Snapshot contract fixed:
  - `status`
  - `last_checked_at`
  - `confidence_score`
  - `checks[]`
- Topic governance introduced via `data/topic-registry.json`
- Versioning policy documented via `vMAJOR.MINOR.PATCH`
- UI states documented for loading / healthy / stale / blocked / error / empty

### Files added/updated (high-value)
- `docs/app/03-api-contract.md`
- `docs/app/04-data-model.md`
- `docs/app/06-runbook.md`
- `docs/app/08-decisions.md`
- `docs/app/09-versioning-policy.md`
- `docs/app/10-ui-states-v1.md`
- `data/topic-registry.json`
- `data/sources.json`
- `data/latest.json`
- `scripts/validate-sources.mjs`
- `scripts/check-versioning.mjs`
- `scripts/check-snapshot-relations.mjs`
- `.github/workflows/validate-sources.yml`
- `package.json`

---

## PRs merged

Original stacked PR numbers changed during cleanup/recreation. Final merged PRs are:

1. **PR #2**
   - Docs baseline + docs/app structure + runbook/versioning/UI state docs
2. **PR #5**
   - Data normalization + source validation updates
3. **PR #6**
   - Snapshot v1 schema + CI guards

Reason replacement PRs were needed:
- initial stacked branches were based on stale `github/main`
- had to rebuild clean branches and recreate downstream PRs after base merges

---

## Current repo state

Expected on `main` now:
- static API v1 docs are merged
- source registry normalization is merged
- `latest.json` v1 schema is merged
- CI guards exist for:
  - version format
  - snapshot/source relation

Local checks that passed before merge:
- `npm run validate:sources`
- `npm run check:versioning`
- `npm run check:snapshot-relations`
- `npm run build`

---

## Important known pending items

### Intentional pending
- `topic_id` for `tg-sijadwalkajian-*` children is still placeholder:
  - `REPLACE_WITH_REAL_TOPIC_ID`
- strict numeric validation is not enabled by default yet
  - supported path exists: `STRICT_TOPIC_ID=1`

### Transitional implementation
- `checks[]` in `data/latest.json` is still transitional mapping from legacy snapshot shape
- future work: emit `checks[]` natively from checker runtime

---

## Exact next step

### Step B: Topic ID discovery + scrape validation
This is the next real blocker from roadmap `docs/roadmap/phase-1.5-parent-child-sources.md`.

#### Goal
Verify whether Telegram topic URLs can actually be scraped and whether topic-level monitoring is viable.

#### Required tasks
1. Discover real numeric `topic_id` values for `@sijadwalkajian`
2. Update `data/topic-registry.json`
3. Test these URLs:
   - `https://t.me/s/sijadwalkajian`
   - `https://t.me/sijadwalkajian/{topic_id}`
   - `https://t.me/s/sijadwalkajian/{topic_id}`
4. Verify selectors still work:
   - `.tgme_widget_message_date time[datetime]`
   - `.tgme_channel_info_counter`
5. Decide:
   - if parseable → proceed to topic-level monitoring
   - if not parseable → fallback to group-level only

#### Recommended execution order
- start with browser/manual discovery of topic IDs
- then shell or script verification of HTML shape
- then update registry and enable strict validation later

---

## After Step B, next Step C
Only if Step B succeeds:
- refactor checker into platform strategy pattern
- add telegram group/topic checkers
- rewrite orchestrator
- add region filter and parent/child grouping in dashboard

If Step B fails:
- document fallback decision in `docs/app/08-decisions.md`
- keep `sijadwalkajian` as group-level source only
- defer topic-level monitoring to later phase

---

## Commands worth reusing

```bash
npm run validate:sources
npm run check:versioning
npm run check:snapshot-relations
npm run build
```

Strict topic ID validation when real IDs are ready:

```bash
STRICT_TOPIC_ID=1 npm run validate:sources
```

---

## Notes for next session
- Do **not** spend more time on docs unless Step B changes the technical direction.
- The highest-value next action is discovery/validation, not more schema work.
- If topic scrape fails, make the fallback decision quickly. Do not over-engineer around a broken assumption.
