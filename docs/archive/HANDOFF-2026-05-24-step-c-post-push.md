# HANDOFF — Step C baseline after local GitLab push

> **Generated**: 2026-05-24 08:58 GMT+7
> **Repo**: `/var/home/tehaer/projects/HSI_Vibathon/codebase/vibathon-2026`
> **Last pushed commit on local GitLab (`origin/main`)**: `da3581d` (`Lock Step B topic fallback`)
> **Purpose**: preserve the post-push state and the new local Step C baseline so the next session can continue without rediscovering schema/runtime drift

---

## 1) What is already pushed
Local GitLab `origin/main` already contains:
- Step B fallback decision
- removal of `tg-sijadwalkajian-{jakarta,surabaya}` placeholders
- empty `data/topic-registry.json`
- Step B validation report
- Step B fallback handoff

Reference handoff:
- `docs/archive/HANDOFF-2026-05-24-step-b-fallback.md`

---

## 2) What Step C discovered locally (NOT pushed yet)
There was a real runtime/schema drift after the Step B push:

### Critical drift found
1. `scripts/check-telegram.ts` still filtered `platform === "telegram"`
   - but `data/sources.json` now uses platform codes like `tg`, `web`, `ig`
   - result: checker processed **0 Telegram sources**

2. Checker still emitted **legacy snapshot shape**
   - `monitored`
   - `checked_at`
   - `reliability_score`

3. Contract/docs/validators already expect **Static API v1 shape**
   - `version`
   - `monitored_sources`
   - `last_checked_at`
   - `confidence_score`
   - `checks[]`

### Why this matters
The repo could pass some checks while `check:telegram` still rewrote `data/latest.json` into the old schema.

---

## 3) Step C local changes completed
These changes are in the **local working tree** right now and validated, but not committed/pushed yet.

### Runtime / checker
- `scripts/check-telegram.ts`
  - refactored to use `tg` platform code
  - monitors only supported TG source types: `channel` + `group`
  - treats unsupported source types as `unmonitored`
  - emits Static API v1 top-level + snapshot fields
- `scripts/lib/types.ts`
  - aligned with v1 snapshot schema
- `scripts/lib/score.ts`
  - moved score output to `confidence_score` (`0..1`)
  - weighted from `http_fetch`, `content_parse`, `freshness`

### App / types
- `src/shared/types.ts`
  - aligned with current source registry contract (`tg|yt|ig|web|wa`, numeric `priority`, `source_type`, topic fields)
- `src/app/lib/data.ts`
  - normalizes latest snapshot data to v1 shape
  - keeps backward compatibility for legacy fields during transition
- `src/app/components/AppTab.tsx`
  - updated platform filters/icons to `tg/web/ig/yt/wa`
  - updated score usage from `confidence_score`
  - updated archived heuristic to numeric priority
- `src/app/components/Masthead.tsx`
- `src/app/components/OverviewTab.tsx`
  - now read `monitored_sources`
- `src/app/components/ArchitectureTab.tsx`
  - copy updated from `reliability_score` → `confidence_score`

---

## 4) Fresh checker result after Step C
`npm run check:telegram` now actually checks live TG sources.

### Current top-level snapshot
- `version`: `v1.0.0`
- `total_sources`: `30`
- `monitored_sources`: `20`
- `active`: `10`
- `dead`: `7`
- `error`: `3`
- `unmonitored`: `10`

### Notable current error cases
- `tg-muslimorid`
  - fetch failed entirely
- `tg-hsi-abdullahroy`
  - page fetched, but no parseable metrics exposed
- `tg-sijadwalkajian`
  - members parsed (`49`) but no last-post timestamp exposed
  - currently lands in `error` with `confidence_score=0.75`

This is important because `tg-sijadwalkajian` remains **group-level only**, but even group-level freshness is still not parseable from current public HTML.

---

## 5) Validation status for the local Step C work
All passed locally after the refactor:

```bash
npm run check:telegram
npm run validate:sources
npm run check:snapshot-relations
npm run check:versioning
npm run build
```

---

## 6) Current uncommitted files
Expected modified files:
- `data/latest.json`
- `scripts/check-telegram.ts`
- `scripts/lib/score.ts`
- `scripts/lib/types.ts`
- `src/app/components/AppTab.tsx`
- `src/app/components/ArchitectureTab.tsx`
- `src/app/components/Masthead.tsx`
- `src/app/components/OverviewTab.tsx`
- `src/app/lib/data.ts`
- `src/shared/types.ts`

New untracked runtime artifact:
- `data/health/2026-05-24.json`

Unrelated untracked path (do not commit accidentally unless intended):
- `.serena/`

---

## 7) Exact next step for next session
### Recommended next action
Review Step C local diff, then:
1. commit the Step C schema/runtime alignment
2. push to local GitLab `origin/main`
3. optionally mirror to GitHub remote

### Suggested commit scope
One commit is okay if you want it atomic:
- checker strategy baseline + schema v1 alignment + UI reader fixes

### Focus after that
After Step C is committed/pushed, the next highest-value task is:
- decide whether `tg-sijadwalkajian` should stay `error`, become `blocked`, or get a special group-level partial-check policy when only subscriber/member count is available but no post freshness exists

That decision affects trust semantics more than code structure now.
