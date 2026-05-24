# Step B — `@sijadwalkajian` topic discovery + scrape validation

> **Date:** 2026-05-24
> **Repo:** `/var/home/tehaer/projects/HSI_Vibathon/codebase/vibathon-2026`
> **Goal:** verify whether Telegram topic-level monitoring is viable from public web HTML

## URLs tested
1. `https://t.me/s/sijadwalkajian`
2. `https://t.me/sijadwalkajian/192`
3. `https://t.me/s/sijadwalkajian/192`

## Findings

### 1) Public HTML does not expose topic list or topic IDs
- No discoverable Jakarta/Surabaya topic links were present in the fetched HTML.
- No numeric topic references were exposed from the group preview page.
- The only numeric path observed was the manually tested `/192`, which rendered as a post view, not a topic directory.

### 2) Existing Telegram selectors do not match this group/topic surface
For all tested URLs:
- `.tgme_widget_message_date time[datetime]` → **0 matches**
- `.tgme_channel_info_counter` → **0 matches**
- `.tgme_header_counter` → **0 matches**
- `.tgme_widget_message` → **0 matches**

### 3) Returned page shape is a join gate / post gate
Observed page metadata:
- Group page title: `Jadwal Kajian Sunnah Indonesia`
- Group page extra: `49 members`
- Group action CTA: `View in Telegram`
- `/192` page action CTA: `View Post`
- `og:description`: `You can view and join @sijadwalkajian right away.`

This means the public web page is not exposing the message timeline needed by the current scraper.

## Evidence snapshot

| URL | HTTP | Final URL | Message date selector | Counter selector | Action |
|---|---:|---|---:|---:|---|
| `https://t.me/s/sijadwalkajian` | 200 | `https://t.me/sijadwalkajian` | 0 | 0 | `View in Telegram` |
| `https://t.me/sijadwalkajian/192` | 200 | `https://t.me/sijadwalkajian/192` | 0 | 0 | `View Post` |
| `https://t.me/s/sijadwalkajian/192` | 200 | `https://t.me/sijadwalkajian/192` | 0 | 0 | `View Post` |

## Decision
- **Topic-level monitoring is not viable yet** for `@sijadwalkajian` using current public HTML scraping assumptions.
- **Fallback chosen:** keep `sijadwalkajian` as **group-level only**.
- Placeholder topic children for Jakarta/Surabaya should not remain published until real `topic_id` values and parseable HTML are proven.

## Data changes applied
- Removed `tg-sijadwalkajian-jakarta` from `data/sources.json`
- Removed `tg-sijadwalkajian-surabaya` from `data/sources.json`
- Removed matching snapshots from `data/latest.json`
- Reset `data/topic-registry.json` to an empty array
- Documented the fallback in `docs/app/08-decisions.md`

## What would unblock topic onboarding later
One of these is required:
1. Official/app/admin access that reveals the real numeric `topic_id`
2. Telegram export/manual capture proving topic URL mapping
3. A public HTML surface that exposes parseable topic timeline data

Until one of those exists, do not reintroduce topic placeholder sources.
