# Design: In-App Contribution Form (Source List Intake)

Status: Approved (v1)
Date: 2026-06-06
Scope: Single in-app form that lowers friction for contributing new sources to the
registry, auto-producing a canonical contribution-intake JSON.

## Problem

Today contributing a source requires hand-authoring a JSON file in
`data/contributions/pending/`, knowing the schema, and using git/PR
(`docs/CONTRIBUTING.md`). This blocks non-developer contributors (jamaah awam) and
is error-prone even for developers.

## Goal

A friendly in-app form that:
1. Validates input client-side using the same rules as
   `scripts/validate-contributions.mjs`.
2. Generates a **single canonical intake JSON** + slug.
3. Offers a **dual delivery path** so both GitHub and non-GitHub users can contribute.

Non-goals (v1):
- Discovery/spike lane (`data/spikes/*`). Those are machine-generated artifacts;
  human submissions are out of scope for v1. (Future: a lightweight
  `data/contributions/discovery/*.json` lead schema — option (b) from brainstorming.)
- Source **Update** flow (v1 is Source **Add** only; update can reuse the same form later).
- Serverless auto-PR with a GitHub token (rejected: secret + spam surface).

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| How form reaches the repo | **Opsi A** — zero-backend, GitHub prefill + maintainer-push hybrid |
| Target audience | **C** — mixed; prefer easy, GitHub account still OK |
| Non-GitHub delivery channel | **a + b + c** — Netlify Forms + Copy/Download JSON + `mailto:` |
| Intake vs discovery/spike | **(a)** intake-only for v1 |

## Architecture

```diagram
╭──────────────────────────────────────────────────────────────────────╮
│ ContributionForm.tsx  (Contribute tab 05, above walkthrough)          │
│                                                                        │
│  fields ──▶ client-side validate (mirror validate-contributions.mjs)  │
│         ──▶ build canonical JSON + slug                                │
│                                                                        │
│   ┌─────────────────────────────┐   ┌──────────────────────────────┐ │
│   │ Path 1: "Punya akun GitHub"  │   │ Path 2: "Kirim ke maintainer"│ │
│   │ open                          │   │  (a) Netlify Forms submit    │ │
│   │ /<owner>/<repo>/new/main?     │   │  (b) Copy / Download .json   │ │
│   │   filename=...&value=<json>   │   │  (c) mailto: prefilled       │ │
│   │ → user commits → PR           │   │ → maintainer commits + promote│ │
│   └─────────────────────────────┘   └──────────────────────────────┘ │
╰──────────────────────────────────────────────────────────────────────╯
```

Both paths emit byte-identical JSON; only the transport differs.

## Components & files

| File | Change |
|---|---|
| `src/app/components/ContributionForm.tsx` | NEW — the form + validation + delivery buttons (client component) |
| `src/app/lib/contribution-intake.ts` | NEW — pure helpers: `validateIntake()`, `buildIntakeJSON()`, `buildSlug()`, `buildGithubNewFileUrl()`, `findDuplicate()` (shared, testable, no React) |
| `src/app/components/OpenContributionTab.tsx` | EDIT — render `<ContributionForm sources={...} />` near the top, pass `sources` |
| `src/app/components/AppShell.tsx` | EDIT — pass `sources` into `OpenContributionTab` |
| `public/__forms.html` (or hidden static form) | NEW — Netlify Forms detection stub for `source-intake` form |
| `docs/CONTRIBUTING.md` + `data/contributions/README.md` | EDIT — document the new form path + maintainer intake-from-Netlify step |

## Canonical intake JSON (contract)

Required: `name`, `platform` (`tg|yt|ig|web|wa`), `source_type`
(`channel|group|topic|site|profile`), `url`, `handle`, `region`, `evidence_url`,
`submitted_by`. Optional: `category[]`, `tags[]`, `notes`.
If `source_type=topic`: also `parent_id` (must exist in `data/sources.json`) and
`topic_id` (numeric string).

Key ordering and shape must match the example in `docs/CONTRIBUTING.md` so maintainer
promote (`scripts/promote-contribution.mjs`) works unchanged.

## Slug rules (mirror promote-contribution.mjs)

- Non-topic: `canonicalSegment(handle)` → `<slug>.json`
- Topic: `<stripPlatformPrefix(parent_id)>-topic-<topic_id>.json`
- `canonicalSegment`: strip leading `@`, lowercase, non-alphanumeric → `-`, collapse/trim `-`.

## Client-side validation (mirror validate-contributions.mjs)

- Required fields are non-empty strings.
- `platform` ∈ allowed set; `source_type` ∈ allowed set.
- `url` and `evidence_url` are valid `http(s)` URLs.
- `category`/`tags` (if present) = arrays of non-empty strings.
- topic: `parent_id` exists in loaded `sources`; `topic_id` matches `/^\d+$/`.
- Duplicate pre-check against loaded `sources`: lowercase `url`, and
  `platform::canonicalHandle(handle)` (skip handle check when `source_type=topic`).
  Duplicates are a **warning** in-form (final authority remains CI), not a hard block.

## Delivery details

- **GitHub prefill URL:** `https://github.com/<owner>/<repo>/new/main?filename=data/contributions/pending/<slug>.json&value=<encodeURIComponent(JSON)>`.
  Owner/repo from a constant (`t-onluring/vibathon-2026` per README). Opens GitHub's
  create-file editor prefilled; user clicks "Commit" → PR.
- **Netlify Forms (a):** form posts fields + a `payload` field containing the JSON
  string. Requires a static HTML form for Netlify build-time detection (App Router
  needs a stub, e.g. `public/__forms.html`, because forms aren't auto-detected from
  React-rendered markup). Include a honeypot field for spam.
- **Copy/Download (b):** "Salin JSON" (clipboard) + "Download .json" (Blob) buttons.
- **mailto (c):** `mailto:<maintainer-email>?subject=...&body=<encoded JSON>`.
  Maintainer email is a constant (TBD by maintainer).

## Maintainer flow (non-GitHub submissions)

1. Submission lands in Netlify dashboard (or arrives via email / community channel).
2. Maintainer creates `data/contributions/pending/<slug>.json` with the JSON.
3. `npm run validate:contributions && npm run validate:sources`.
4. `npm run promote:contribution data/contributions/pending/<slug>.json` (dry-run),
   then `-- --apply`.

## Testing / verification

- Unit-style: extend `scripts/test-contribution-scripts.mjs` or a small node check
  that `buildIntakeJSON()` output passes `validate-contributions.mjs` rules for both
  a channel and a topic example.
- Manual: `npm run dev`, open Contribute tab, fill form, verify GitHub URL opens
  prefilled, Copy/Download produce valid JSON, validation messages fire on bad input.
- `npm run lint && npm run build` must pass.

## Open items for implementer

- Maintainer email for `mailto:` (placeholder constant until provided).
- Confirm Netlify Forms stub approach with current `@netlify/plugin-nextjs` v5.
- Decide exact placement copy (Indonesian microcopy) within Contribute tab.
