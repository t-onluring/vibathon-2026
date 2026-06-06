# HANDOFF — In-App Contribution Form (v1)

Copy/paste this to start the next session.

---

You are implementing an **in-app contribution form** for the Kajian Sunnah source
list (Next.js 16, Netlify). Brainstorming is done and approved. Read these two docs
first, they are authoritative:

- `docs/superpowers/specs/2026-06-06-contribution-form-design.md` (design)
- `docs/superpowers/specs/2026-06-06-contribution-form-plan.md` (step-by-step plan)

## Approved decisions (do not re-litigate)

- **Opsi A**: zero-backend. NO GitHub token / serverless auto-PR.
- Audience **C** (mixed): GitHub users self-serve via prefilled `/new` URL;
  non-GitHub users use a **maintainer-push** path.
- Non-GitHub delivery = **a + b + c**: Netlify Forms + Copy/Download JSON + `mailto:`.
- **Intake-only** (`data/contributions/pending/*.json`). NO discovery/spike lane,
  NO source-update flow in v1.
- All delivery paths emit the **same canonical JSON**.

## What to build

1. `src/app/lib/contribution-intake.ts` — pure validate/slug/JSON/url helpers that
   mirror `scripts/validate-contributions.mjs` and `scripts/promote-contribution.mjs`.
2. `src/app/components/ContributionForm.tsx` — the form + live validation + JSON
   preview + 4 delivery buttons.
3. Wire it into the **Contribute** tab: pass `sources` from `AppShell.tsx` →
   `OpenContributionTab.tsx` → `<ContributionForm sources={...} />`.
4. Netlify Forms detection stub (`public/__forms.html`, form name `source-intake`).
5. Update `docs/CONTRIBUTING.md` + `data/contributions/README.md`.

## Critical constraints

- Repo AGENTS.md: "This is NOT the Next.js you know" — read
  `node_modules/next/dist/docs/` before App Router/build/forms code.
- JSON shape & key order must stay compatible with `promote-contribution.mjs`
  (`buildSource`) so maintainer promote works unchanged.
- Validation parity with `validate-contributions.mjs`; duplicates are warnings in the
  form (CI stays the final gate).
- Reuse existing visual tokens (`--clay`, `--slate`, `--g300`, rounded cards) from
  `OpenContributionTab.tsx`.

## Needs a human answer (ask maintainer, use placeholder until then)

- Maintainer email for `mailto:`.
- Is Netlify Forms enabled for this site? If not, ship b + c and flag the Netlify
  button off behind a constant.

## Verify before done

- `npm run lint` and `npm run build` green.
- A node check feeding a channel + a topic example through `buildIntakeJSON` passes
  the real `validate-contributions.mjs` rules.
- Manual `npm run dev`: Contribute tab → test GitHub prefill, Copy, Download, mailto,
  Netlify submit, and validation errors (bad URL, missing field, topic w/o parent_id,
  duplicate url).
