# Phase 3: Vision Extraction (Image Posters)

## Summary

Extend the event extraction pipeline with vision/OCR capabilities to parse kajian information from image posters. This covers the second most common content format in @sijadwalkajian topics — weekly schedule posters, tabligh akbar flyers, and masjid announcements.

## Context

- Phase 2 handles plain text extraction only (~40% of messages)
- Image posters account for ~45% of messages — weekly schedules like Masjid Al Amanah (Tangsel), tabligh akbar announcements, masjid-branded flyers
- These posters contain structured information (ustadz, waktu, lokasi, tema) but embedded in designed graphics
- Vision LLMs (Claude, GPT-4o) can extract this data with 80-90% accuracy
- Some posters are forwarded from other channels (e.g., "Forwarded from KAMIS Channel")

## Prerequisites

- Phase 2 complete (text extraction pipeline, event schema, static API)
- Vision-capable LLM API access (Claude 3.5+ or GPT-4o)

## Architecture

```
Telegram Bot API
       │
       ▼
┌──────────────┐     ┌───────────────┐
│  Ingestion   │────▶│  Router       │
│  (existing)  │     │  (text/image) │
└──────────────┘     └───────┬───────┘
                        ┌────┴────┐
                        ▼         ▼
                  ┌──────────┐ ┌──────────────┐
                  │ Text     │ │ Vision LLM   │
                  │ Extractor│ │ (image→text) │
                  │ (Phase 2)│ │ + Extractor  │
                  └────┬─────┘ └──────┬───────┘
                       └──────┬───────┘
                              ▼
                       ┌──────────────┐
                       │  events.json │
                       └──────────────┘
```

## Image Content Types

| Type | Example | Frequency | Extraction Difficulty |
|------|---------|-----------|----------------------|
| Weekly schedule poster | Masjid Al Amanah agenda (7 entries) | High | Medium — structured table layout |
| Single event flyer | Tabligh akbar announcement | Medium | Easy — prominent text |
| Forwarded poster | From other masjid channels | Medium | Easy — same as above |
| Photo of physical banner | Captured from masjid entrance | Low | Hard — variable quality, angle |
| Composite image | Multiple events collaged | Low | Hard — multiple extraction targets |

## Steps

### Step 1: Content type router

Classify incoming messages as text, image, video, or mixed. Route to appropriate extractor.

**File:** `scripts/extract/content-router.ts`

```typescript
type ContentType = "text" | "image" | "video" | "mixed";

function classifyMessage(message: TelegramMessage): ContentType {
  if (message.photo && message.text) return "mixed";
  if (message.photo) return "image";
  if (message.video) return "video";
  return "text";
}
```

### Step 2: Image downloader + preprocessor

Download images via Telegram Bot API `getFile`. Resize large images to reduce LLM API costs. Store originals in `data/images/`.

**File:** `scripts/ingest/image-downloader.ts`

### Step 3: Vision extraction with LLM

Send images to vision-capable LLM with structured extraction prompt. Handle multi-event posters (weekly schedules contain 5-7 events per image).

**File:** `scripts/extract/vision-extractor.ts`

Key prompt engineering:
- System prompt: "You are extracting kajian event data from Indonesian Islamic lecture posters"
- Include the KajianEvent schema
- Few-shot: provide 3-4 example poster → event mappings
- Handle Hijri dates, Arabic text, Indonesian abbreviations (WIB, s/d, Ba'da, dll.)

### Step 4: Multi-event poster handling

Weekly schedule posters (like Masjid Al Amanah) contain multiple events. Extract each as a separate `KajianEvent` with shared masjid/address fields.

**File:** `scripts/extract/multi-event-splitter.ts`

### Step 5: Caption + image fusion

Messages with both image and caption text. Fuse extracted data from both sources. Caption often contains address/location not visible in poster.

**File:** `scripts/extract/caption-fusion.ts`

### Step 6: Confidence calibration

Compare vision extraction results against text extraction for messages that have both. Build confidence calibration model.

**File:** `scripts/extract/confidence-calibrator.ts`

### Step 7: Update ingestion workflow

Modify GitHub Actions to include image download + vision extraction steps. Add cost monitoring (vision API calls are 10-20x more expensive than text).

### Step 8: Dashboard image preview

Show poster thumbnail in event card on dashboard. Click to expand full image.

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `scripts/extract/content-router.ts` | Create | Text/image/video classifier |
| `scripts/ingest/image-downloader.ts` | Create | Telegram image download |
| `scripts/extract/vision-extractor.ts` | Create | Vision LLM extraction |
| `scripts/extract/multi-event-splitter.ts` | Create | Weekly poster → multiple events |
| `scripts/extract/caption-fusion.ts` | Create | Image + caption data merge |
| `scripts/extract/confidence-calibrator.ts` | Create | Cross-format confidence tuning |
| `scripts/ingest/poll-messages.ts` | Modify | Add image download support |
| `.github/workflows/ingest-events.yml` | Modify | Add vision extraction step |
| `src/app/components/EventsTab.tsx` | Modify | Add poster preview |

## Costs

| Item | Estimated Cost |
|------|---------------|
| Vision LLM per image | ~$0.05-0.20/image |
| ~30 images/day across 9 topics | ~$1.50-6.00/day |
| Monthly estimate (vision only) | ~$45-180/month |
| Combined with Phase 2 text | ~$60-255/month |
| Image storage | Negligible (< 100MB/month) |

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vision LLM hallucinates event details | High | Confidence threshold, human review queue |
| Low-quality photos unreadable | Medium | Skip with low-confidence flag |
| Arabic/Hijri text extraction errors | Medium | Custom few-shot examples for common patterns |
| Cost spike from image-heavy days | Medium | Daily cost cap, skip low-priority images |
| Multi-event posters split incorrectly | Medium | Validate event count against visual layout |

## Out of Scope

- Video content extraction (Phase 4)
- Training custom OCR model
- Real-time poster processing
- Poster design classification (tabligh akbar vs. rutin)
