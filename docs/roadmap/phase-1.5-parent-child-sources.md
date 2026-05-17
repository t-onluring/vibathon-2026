# Phase 1.5: Parent-Child Sources + @sijadwalkajian

## Summary

Extend the source data model with `source_type`, `parent_id`, and `topic_id` fields to support Telegram Forum supergroups (like @sijadwalkajian) with per-city topic children. Add region filter to the Live Dashboard. Refactor health checker into pluggable Strategy Pattern for future platform extensibility.

## Context

- @sijadwalkajian is a Telegram Forum supergroup with 10+ city-based topics (Jakarta, Bogor, Surabaya, etc.)
- Current data model is flat — no parent-child, no per-topic monitoring
- L3 consumer apps need `region` filtering to build city-specific kajian finders
- Health checker is currently hardcoded for Telegram channels only
- **PR #1 merged** (camagenta): added 9 new Telegram sources with per-city regions (yogyakarta, gresik, balikpapan, surabaya) — region filter is already needed pre-Phase 1.5
- **Source count**: 20 local → 29 after PR pull → 39 after this phase

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data model | Parent-child (`parent_id` + `topic_id`) | Best L3 API consumption, independent health checking per topic |
| Meta topic handling | Exclude General + Dapur Satu Data Kajian | General is empty (system msgs only), Dapur is operational/internal — neither is a kajian source for L3 consumers. Use `tags` (Option C) if added later. |
| Backward compatibility | All new fields optional | Existing 20 sources need zero changes |
| Group score formula | `max(own_freshness, avg(children_scores))` with zero-child fallback | Prevents misleading scores when children error |

## Sub-phases

Split into 2 sub-phases to reduce blast radius per PR:

- **1.5a** — Steps 0–3, 9–10: Discovery spike + type extension + data entries + validation (pure data layer)
- **1.5b** — Steps 4–8: Checker refactor + orchestrator + UI (runtime changes)

---

## Steps

### Step 0: Validate Telegram topic URL scraping (BLOCKER)

Must complete before any implementation. If topic URLs don't return parseable HTML via Cheerio, the entire topic-level monitoring design needs revision.

Test targets:
- `https://t.me/s/sijadwalkajian` (group level — subscriber count)
- `https://t.me/sijadwalkajian/{topic_id}` (topic deep link)
- `https://t.me/s/sijadwalkajian/{topic_id}` (topic public preview — may not exist)

Validate that existing Cheerio selectors work:
- `.tgme_widget_message_date time[datetime]` for last post date
- `.tgme_channel_info_counter` for subscriber counts

Also: Discover actual numeric `topic_id` values for each city topic.

Fallback if topic URLs don't work: Monitor group-level only (1 source instead of 10), defer topic-level to Phase 2 when Bot API approach can be evaluated.

### Step 0.5: Pull PR #1 + normalize contributor data

Prerequisite: Pull merged PR #1 (camagenta's 9 new sources) into local.

Fix issues introduced by PR #1:
- Normalize IDs to lowercase: `tg-KajianustadzAfifi` → `tg-kajianustadzafifi`, `tg-NgangsuKawruh` → `tg-ngangsu-kawruh`
- Fix indentation: last 2 entries use 6-space indent, normalize to 2-space (project standard)
- Run `validate-sources.mjs` to confirm clean state

### Step 1: Extend Source type with parent-child fields

**File:** `src/shared/types.ts`

```typescript
export type SourceType = "channel" | "group" | "topic";

export interface Source {
  // ... existing fields unchanged ...
  source_type?: SourceType;
  parent_id?: string;
  topic_id?: string;
}

export function isTopicSource(s: Source): s is Source & {
  source_type: "topic"; parent_id: string; topic_id: string;
} {
  return s.source_type === "topic" && !!s.parent_id && !!s.topic_id;
}
```

### Step 2: Add @sijadwalkajian entries to sources.json

**File:** `data/sources.json`

Add 1 parent group + 9 city topic children (10 entries total).

Excluded: General (system messages only), Dapur Satu Data Kajian (operational/internal).

Cities: Jakarta, Bogor, Tangerang, Tangerang Selatan, Bekasi, Semarang, Surabaya, Pekanbaru, Jambi.

### Step 3: Update scripts/lib/types.ts

Re-export new `SourceType` type and `isTopicSource` guard.

### Step 4: Refactor health checker into Strategy Pattern

New files:
- `scripts/lib/checkers/platform-checker.ts` — `PlatformChecker` interface
- `scripts/lib/checkers/telegram-channel.ts` — extract from existing `check-telegram.ts`
- `scripts/lib/checkers/telegram-group.ts` — group-level check
- `scripts/lib/checkers/telegram-topic.ts` — topic-level check

### Step 5: Rewrite orchestrator with two-phase execution

**File:** `scripts/check-telegram.ts` → rename to `scripts/check-health.ts`

Two-phase execution: check all leaf sources (channels + topics) first, then compute group aggregates from children.

### Step 6: Add region filter to AppTab

**File:** `src/app/components/AppTab.tsx`

Region filter pills below existing platform filter. Horizontal scroll on mobile for 10+ pills. AND logic with existing filters. Empty state with clear-filter button.

### Step 7: Visual grouping for parent/children in dashboard

**File:** `src/app/components/AppTab.tsx`

Parent cards with expand/collapse chevron, collapsed by default. 16px indent + 2px left border for children. `aria-expanded` and keyboard nav support.

### Step 8: Add tests

- `scripts/lib/__tests__/checkers.test.ts`
- `scripts/lib/__tests__/group-scoring.test.ts`
- `scripts/__tests__/validate-sources.test.ts`

### Step 9: Update validate-sources script

**File:** `scripts/validate-sources.mjs`

Add: source_type validation, parent-child referential integrity, lowercase ID enforcement, handle uniqueness relaxation for topic/group types.

---

## Files Changed

| File | Action | Sub-phase |
|------|--------|-----------|
| `src/shared/types.ts` | Modify | 1.5a |
| `data/sources.json` | Modify | 1.5a |
| `scripts/lib/types.ts` | Modify | 1.5a |
| `scripts/validate-sources.mjs` | Modify | 1.5a |
| `scripts/lib/checkers/platform-checker.ts` | Create | 1.5b |
| `scripts/lib/checkers/telegram-channel.ts` | Create | 1.5b |
| `scripts/lib/checkers/telegram-group.ts` | Create | 1.5b |
| `scripts/lib/checkers/telegram-topic.ts` | Create | 1.5b |
| `scripts/check-health.ts` | Rename+Rewrite | 1.5b |
| `.github/workflows/health-check.yml` | Modify | 1.5b |
| `src/app/components/AppTab.tsx` | Modify | 1.5b |
| Test files (3) | Create | 1.5a/b |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Telegram topic URL doesn't return parseable HTML | High | Step 0 blocker. Fallback: group-level only. |
| Topic ID discovery requires Telegram app access | Medium | Web preview first, browser tool fallback. |
| Group score timing | Medium | Two-phase orchestrator guarantees ordering. |
| Handle uniqueness rejects topic children | Low | Relaxed in Step 9. |
| 10+ region pills overflow on mobile | Low | Horizontal scroll with fade edges. |
