# Implementation Plan: In-App Contribution Form (v1)

Spec: `docs/superpowers/specs/2026-06-06-contribution-form-design.md`
Scope: intake-only, dual-path delivery (GitHub prefill + maintainer-push a/b/c).

## Prereqs / read first

- `scripts/validate-contributions.mjs` — source of truth for validation rules.
- `scripts/promote-contribution.mjs` — slug/id + JSON shape (`buildSource`, `canonicalSegment`, `generatedId`).
- `docs/CONTRIBUTING.md` + `data/contributions/README.md` — intake contract & examples.
- `src/app/components/AppShell.tsx`, `OpenContributionTab.tsx` — wiring + styling tokens (`--clay`, `--slate`, `--g300`, etc.).
- `src/shared/types.ts` / `src/app/lib/data.ts` — `Source` type.
- Per repo AGENTS.md: this is Next.js 16 with breaking changes — read
  `node_modules/next/dist/docs/` before writing App Router / build code.

## Step 1 — Pure logic module (no React)

Create `src/app/lib/contribution-intake.ts`:
- `canonicalSegment(v)`, `canonicalHandle(v)`, `stripPlatformPrefix(id, platform)` — copy from promote script.
- `buildSlug(item): string` — non-topic vs topic rules.
- `buildIntakeJSON(item): string` — canonical key order matching CONTRIBUTING example; omit empty optionals; stringify with 2-space indent + trailing newline.
- `validateIntake(item, sources): { errors: string[]; warnings: string[] }` — mirror validate-contributions.mjs; duplicates => warnings.
- `findDuplicate(item, sources)` — url + platform::handle maps.
- `buildGithubNewFileUrl({owner, repo, slug, json})` and `buildMailto({email, item, json})`.
- Export `ALLOWED_PLATFORMS`, `ALLOWED_TYPES`, `REQUIRED_FIELDS`, and a `REPO = { owner: "t-onluring", repo: "vibathon-2026" }` constant.

## Step 2 — Form component

Create `src/app/components/ContributionForm.tsx` (`"use client"`):
- Props: `{ sources: Source[] }`.
- Controlled fields: name, platform (select), source_type (select), url, handle,
  region, evidence_url, submitted_by, category (comma input → array), tags
  (comma input → array), notes (textarea). Conditional: parent_id (select of
  existing `tg` sources) + topic_id when source_type=topic.
- Live validation via `validateIntake`; show inline errors + duplicate warnings.
- Live preview of generated JSON (read-only `<pre>`).
- Delivery buttons (disabled while errors exist):
  1. "Buka di GitHub" → `window.open(buildGithubNewFileUrl(...))`.
  2. "Salin JSON" (clipboard) + "Download JSON" (Blob).
  3. "Kirim ke maintainer" → submit to Netlify form (Step 4).
  4. "Email ke maintainer" → `buildMailto`.
- Match existing visual tokens / rounded cards used in `OpenContributionTab`.

## Step 3 — Wire into the tab

- `OpenContributionTab.tsx`: accept `sources` prop, render `<ContributionForm sources={sources} />` near top (before walkthrough), with a short heading "Usulkan source lewat form".
- `AppShell.tsx`: pass `sources` to `<OpenContributionTab sources={sources} />`.

## Step 4 — Netlify Forms detection (path a)

- Add a static detection form. Verify approach for `@netlify/plugin-nextjs` v5:
  create `public/__forms.html` containing a plain `<form name="source-intake" data-netlify="true" netlify-honeypot="bot-field">` with hidden inputs matching the fields you POST (at minimum `payload`, `name`, `submitted_by`, `bot-field`).
- In the React submit handler, POST `application/x-www-form-urlencoded` to `/`
  with `form-name=source-intake` + the fields.
- Confirm in Netlify deploy that the form is detected; submissions appear in dashboard.
- If Netlify Forms is not configured for the site, keep b + c working and gate the
  Netlify button behind a constant flag.

## Step 5 — Docs

- `docs/CONTRIBUTING.md`: add "Jalur Form (in-app)" subsection — GitHub path vs maintainer path; note JSON is identical.
- `data/contributions/README.md`: add maintainer step "Intake dari Netlify Forms → pending/".

## Step 6 — Verify

- Node check (extend `scripts/test-contribution-scripts.mjs` or new tiny script):
  feed a channel example and a topic example through `buildIntakeJSON` and assert the
  output passes the real validator logic.
- `npm run lint`
- `npm run build`
- Manual: `npm run dev` → Contribute tab → test all four delivery buttons + validation
  (bad URL, missing field, topic without parent_id, duplicate url).

## Done criteria

- Form produces valid intake JSON accepted by `validate:contributions`.
- GitHub prefill opens with filename + content populated.
- Copy/Download/mailto produce identical JSON.
- Netlify path detected (or cleanly flagged off).
- lint + build green; docs updated.
