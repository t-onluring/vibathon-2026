# Phase 2: Event Extraction MVP (Plain Text)

## Summary

Build the first content ingestion pipeline that extracts structured kajian event data from Telegram messages. Focus exclusively on plain text messages (the easiest format to parse) to validate the extraction architecture before investing in vision/OCR capabilities.

## Context

- Phase 1.5 establishes the source registry with parent-child topics and health monitoring
- L3 consumer apps need structured event data (ustadz, masjid, waktu, lokasi) — not just "where to find info"
- @sijadwalkajian topics contain 3 content formats: plain text, image posters, and forwarded videos
- Plain text format (like Bekasi topic) has the highest extraction confidence and lowest cost
- This phase transforms vibathon from a **source registry** into a **data platform**

## Prerequisites

- Phase 1.5 complete (parent-child sources, region filter, health checker strategy pattern)
- Telegram Bot API token (needed for message ingestion — web scraping only gives latest messages)

## Architecture

```
Telegram Bot API
       │
       ▼
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Ingestion   │────▶│  Text Parser  │────▶│  events.json │
│  (bot/poll)  │     │  (LLM / NLP)  │     │  (structured)│
└──────────────┘     └───────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                           ┌──────────────┐
                                           │  Static API  │
                                           │  /api/v1/    │
                                           └──────────────┘
```

## KajianEvent Schema

```typescript
interface KajianEvent {
  id: string;
  source_id: string;
  source_message_id?: number;

  // Core
  title?: string;
  ustadz: string;
  tema?: string;

  // When
  date: string;           // YYYY-MM-DD
  time_start?: string;    // HH:mm (WIB)
  time_end?: string;
  hijri_date?: string;

  // Where
  masjid: string;
  address?: string;
  city: string;
  geolocation?: {
    lat: number;
    lng: number;
    gmaps_url: string;
  };

  // Meta
  format: "rutin" | "tabligh-akbar" | "daurah" | "online";
  gender?: "ikhwan" | "akhwat" | "umum";
  contact?: string;
  extracted_from: "text" | "image" | "video";
  extraction_confidence: number;  // 0-1
  raw_text?: string;
  extracted_at: string;
  verified: boolean;
}
```

## Steps

### Step 1: Set up Telegram Bot API integration

Create a Telegram bot via @BotFather. Add bot to @sijadwalkajian group (read-only). Implement polling or webhook for new messages.

**File:** `scripts/ingest/telegram-bot.ts`

### Step 2: Message ingestion pipeline

Poll messages from monitored topics. Store raw messages in `data/messages/` (JSON, keyed by date). Dedup by `message_id`.

**File:** `scripts/ingest/poll-messages.ts`

### Step 3: Text extraction with LLM

Send plain text messages to Claude/GPT-4o with structured output schema. Extract kajian events with confidence scores.

**File:** `scripts/extract/text-extractor.ts`

Prompt engineering: provide the KajianEvent schema as a JSON schema, few-shot examples from each city's typical format.

### Step 4: Google Maps URL → geolocation resolver

Parse `goo.gl/maps/` and `maps.app.goo.gl/` short URLs. Resolve to lat/lng coordinates. Cache results.

**File:** `scripts/extract/geo-resolver.ts`

### Step 5: Event storage and dedup

Store extracted events in `data/events/` (JSON, keyed by date). Dedup by `source_id + date + masjid + ustadz` composite key. Update events on re-extraction.

**File:** `scripts/extract/store-events.ts`

### Step 6: Static API generation

Generate pre-built JSON files from sources + health + events data.

**Output structure:**
```
public/api/v1/
├── sources.json
├── sources/by-region/{region}.json
├── groups/{group_id}.json
├── events/latest.json
├── events/by-date/{date}.json
├── events/by-region/{region}.json
└── meta.json
```

**File:** `scripts/generate-api.ts`

### Step 7: GitHub Actions workflow for ingestion

Cron schedule: every 6 hours. Poll messages → extract events → generate API → commit.

**File:** `.github/workflows/ingest-events.yml`

### Step 8: Event display in dashboard

New tab or section in the Live Dashboard showing upcoming kajian events. Filter by region, date, ustadz.

**File:** `src/app/components/EventsTab.tsx`

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `src/shared/types.ts` | Modify | Add `KajianEvent` interface |
| `scripts/ingest/telegram-bot.ts` | Create | Bot API client |
| `scripts/ingest/poll-messages.ts` | Create | Message polling + storage |
| `scripts/extract/text-extractor.ts` | Create | LLM-based text extraction |
| `scripts/extract/geo-resolver.ts` | Create | Google Maps URL resolver |
| `scripts/extract/store-events.ts` | Create | Event storage + dedup |
| `scripts/generate-api.ts` | Create | Static API generator |
| `.github/workflows/ingest-events.yml` | Create | Ingestion cron |
| `src/app/components/EventsTab.tsx` | Create | Event display UI |
| `data/events/` | Create | Event data directory |
| `public/api/v1/` | Create | Static API output |

## Costs

| Item | Estimated Cost |
|------|---------------|
| Claude API (text extraction) | ~$0.01-0.05/message |
| ~50 messages/day across 9 topics | ~$0.50-2.50/day |
| Monthly estimate | ~$15-75/month |
| Telegram Bot API | Free |
| GitHub Actions | Free (within limits) |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| LLM extraction accuracy varies by text format | Medium | Few-shot prompts per city, confidence threshold |
| Telegram Bot API rate limits | Low | 6-hour polling interval, staggered requests |
| Google Maps short URL resolution fails | Low | Graceful degradation — event saved without geolocation |
| Cost overrun on LLM calls | Medium | Cache extractions, skip unchanged messages |
| Bot removed from group | Medium | Alert on ingestion failure, manual re-add |

## Out of Scope

- Image/poster extraction (Phase 3)
- Video content extraction (Phase 4)
- Real-time notifications
- User-submitted events
- Event verification workflow
