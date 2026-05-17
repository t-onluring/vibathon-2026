# Phase 4: Full Pipeline

## Summary

Complete the content extraction pipeline with video support, cross-source deduplication, near real-time processing, forwarded message tracking, and a public API. This phase transforms the project into a production-grade kajian event aggregation platform.

## Context

- Phase 2 handles plain text extraction (~40% of messages)
- Phase 3 handles image poster extraction (~45% of messages)
- Remaining ~15%: videos, forwarded content from other channels, mixed media
- Many events are cross-posted across multiple topics/channels — dedup is critical
- Consumer apps need faster-than-daily updates for same-day kajian discovery
- Forwarded messages (e.g., "Forwarded from KAMIS Channel", "Forwarded from Info Kajian Sunnah Sby") create duplicate events

## Prerequisites

- Phase 3 complete (vision extraction, content router, multi-event handling)
- Infrastructure for near real-time processing (webhook or frequent polling)

## Architecture

```
Telegram Bot API (webhook)
       │
       ▼
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Ingestion   │────▶│  Content      │────▶│  Extractors  │
│  (webhook)   │     │  Router       │     │  text/img/vid│
└──────────────┘     └───────────────┘     └──────┬───────┘
                                                  │
                     ┌───────────────┐            │
                     │  Dedup Engine │◀───────────┘
                     │  (cross-src)  │
                     └───────┬───────┘
                             │
                     ┌───────▼───────┐     ┌──────────────┐
                     │  Event Store  │────▶│  Public API   │
                     │  (DB/JSON)    │     │  + Dashboard  │
                     └───────────────┘     └──────────────┘
```

## Steps

### Step 1: Video content extraction

Extract event info from video thumbnails and captions. Most videos are forwarded lecture recordings with event details in the thumbnail or caption text.

**Files:**
- `scripts/extract/video-extractor.ts` — thumbnail extraction + caption parsing
- `scripts/ingest/video-downloader.ts` — thumbnail download (skip full video)

### Step 2: Forwarded message tracking

Track `forward_from`, `forward_from_chat` metadata. Link events back to original source channel. Detect cross-posts across topics.

**File:** `scripts/extract/forward-tracker.ts`

### Step 3: Cross-source deduplication engine

Deduplicate events that appear in multiple sources. Match by: same date + same masjid + same ustadz (fuzzy matching). Keep the richest version (most fields populated).

**File:** `scripts/extract/dedup-engine.ts`

Matching strategy:
- Exact match: `date + masjid_normalized + ustadz_normalized`
- Fuzzy match: Levenshtein distance on masjid/ustadz names
- Cross-source: events from `tg-sijadwalkajian--surabaya` and `tg-infokajiansunnahsby` for same event

### Step 4: Near real-time processing

Switch from 6-hour polling to Telegram webhook or 15-minute polling. Process new messages incrementally (not full re-extract).

**File:** `scripts/ingest/webhook-handler.ts`

Options:
- **Webhook** (preferred): Telegram pushes updates to a serverless function
- **Frequent polling**: GitHub Actions on 15-min schedule (more expensive)
- **Hybrid**: Webhook for primary, hourly cron as safety net

### Step 5: Database migration (optional)

Evaluate moving from JSON files to a database for event storage. Options:
- **SQLite** (via Turso/LibSQL): serverless, free tier, SQL queries
- **Supabase**: PostgreSQL, real-time subscriptions, auth
- **Stay JSON**: simpler, CDN-friendly, but no dynamic queries

Decision criteria: if consumer apps need dynamic queries (date range, radius search, ustadz filter), database is worth it. If pre-built static files suffice, stay JSON.

### Step 6: Public API with documentation

Formalize the API with versioning, rate limiting, and OpenAPI spec.

**Endpoints:**
```
GET /api/v1/sources                    → all sources
GET /api/v1/sources?region={region}    → by region
GET /api/v1/events?date={date}         → by date
GET /api/v1/events?region={region}     → by region
GET /api/v1/events?ustadz={name}       → by ustadz
GET /api/v1/events?lat={lat}&lng={lng}&radius={km} → nearby (if DB)
GET /api/v1/health                     → health check status
GET /api/v1/meta                       → API metadata + stats
```

**File:** `scripts/generate-api.ts` (update) or `src/app/api/` (if dynamic)

### Step 7: Event verification workflow

Allow community members to verify/correct extracted events. Simple UI: show extracted data alongside raw message, confirm/edit/reject.

**File:** `src/app/components/VerifyTab.tsx`

### Step 8: Multi-platform source ingestion

Extend ingestion beyond Telegram:
- **Website scrapers**: Parse jadwalkajian.com, portalkajian.online event listings
- **WhatsApp**: Forward-to-bot bridge (limited by WhatsApp API restrictions)
- **YouTube**: RSS feed for new uploads, extract event details from video descriptions
- **Instagram**: Manual or browser-based scraping (no public API)

### Step 9: Monitoring and alerting

- Pipeline health dashboard: ingestion success rate, extraction accuracy, event counts
- Alerting: bot disconnected, extraction accuracy drops, cost overrun
- Monthly report: events extracted, sources active, accuracy metrics

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `scripts/extract/video-extractor.ts` | Create | Video thumbnail + caption extraction |
| `scripts/extract/forward-tracker.ts` | Create | Forwarded message tracking |
| `scripts/extract/dedup-engine.ts` | Create | Cross-source deduplication |
| `scripts/ingest/webhook-handler.ts` | Create | Real-time message ingestion |
| `scripts/generate-api.ts` | Modify | Full API with OpenAPI spec |
| `src/app/components/VerifyTab.tsx` | Create | Event verification UI |
| `src/app/api/` | Create | Dynamic API routes (if DB) |

## Costs

| Item | Estimated Cost |
|------|---------------|
| All LLM extraction (text + image + video) | ~$100-300/month |
| Database hosting (if migrated) | ~$0-25/month |
| Serverless functions (webhook) | ~$0-10/month |
| Total monthly | ~$100-335/month |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dedup false positives (different events merged) | High | Conservative matching, manual review |
| Webhook hosting complexity | Medium | Start with frequent polling, migrate later |
| Multi-platform scrapers break on site changes | Medium | Per-source health monitoring, graceful degradation |
| Cost escalation with more sources | Medium | Tiered processing (high-priority sources only for vision) |
| Community verification adoption | Low | Start with admin-only verification |

## Success Metrics

| Metric | Target |
|--------|--------|
| Event extraction accuracy (text) | > 95% |
| Event extraction accuracy (image) | > 85% |
| Cross-source dedup accuracy | > 90% |
| End-to-end latency (message → API) | < 30 minutes |
| Events extracted per day | > 50 |
| L3 consumer apps using API | >= 2 |
| Monthly API cost | < $200 |
