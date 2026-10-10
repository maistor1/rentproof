---
name: rentproof-api-smoke
description: Run the RentProof end-to-end API smoke test (rental → 12 photo uploads → return with telematics hours → inspect → confirm → invoice) against the local dev server and interpret the results. Use this whenever someone wants to check that the backend or the whole flow works, before merging to main, at the H3 and H6 milestones, after changing an API route, storage, pricing or the vision call, or when a screen shows wrong data and you need to know whether the API or the UI is at fault. Also use it to try a test-set scenario through the real pipeline.
---

# RentProof API smoke test

`scripts/smoke.mjs` drives the whole demo path over HTTP, the way the screens
do, and prints one PASS / FAIL / SKIP line per step. Routes that still answer
501 count as SKIP, so the script is useful from the first route onward and
fully green once everything is built.

## Run it

The app must be running. Start it in the background if it isn't:

```bash
npm run dev            # http://localhost:3000
```

Then, from the repo root:

```bash
# Cheap: everything except the vision calls
node .claude/skills/rentproof-api-smoke/scripts/smoke.mjs --skip-inspect

# Full run with placeholder photos (6 model calls, a few cents)
node .claude/skills/rentproof-api-smoke/scripts/smoke.mjs

# A real test-set scenario from test-set/photos/NN-<slot>-before|after.jpg
node .claude/skills/rentproof-api-smoke/scripts/smoke.mjs --photos test-set/photos --scenario 07
```

Other flags: `--base URL`, `--rental ID`, `--keep` (don't restore
rental data afterwards).

Default to `--skip-inspect` while working on backend or UI code. Only do full
runs when the vision call or the report is what you are checking, because each
one spends API credit.

## What it checks

1. `GET /api/rentals/:id` returns the rental.
2. `POST /api/photos` rejects a path-traversal slot with 400.
3. Six check-out and six return uploads, each phase sent in parallel. Every
   photo comes back resized to at most ~1,500 px on the long edge.
4. The rental record holds all 12 photo ids afterwards. A failure here usually
   means parallel writes to `rentals.json` overwrote each other.
5. `GET /api/photos/:id` serves `image/jpeg`.
6. `POST /api/rentals/:id/return` marks the rental returned and attaches the
   mocked ISO 15143-3 snapshot with the return hours.
7. `POST /api/inspect` returns six slot reports. With placeholder photos (no
   `--photos`) before and after are identical, so any visible finding is a
   false alarm.
8. One `needs_review` finding, if any, is confirmed through
   `PATCH /api/inspect/:inspectionId/findings/:findingId`.
9. `GET /api/invoice/:reportId` has one line per auto-flagged or confirmed
   finding, and the total equals the sum of the lines.

## Side effects

Uploads write files to `data/photos/` and reports to `data/inspections/`, and
rental changes go to `data/rentals.local.json`. All three are gitignored. The
script backs up the rental file and restores it afterwards, so the rental is
`out` again for the next run. Photos and reports pile up; clear them with
`npm run reset-data`.

## Reading the result

The last line is `OK` or `FAILED` with counts, and the exit code is non-zero on
failure. When reporting back, say which steps failed with the HTTP status and
error message the script printed. For step 7, include the findings line, since
that shows what the model saw. Don't call a milestone done while there are
SKIPs on routes that milestone needs:

- **H3:** steps 1–5 pass, plus step 7 for a single real scenario.
- **H6:** every step passes on the demo object's photos three runs in a row.

If the script itself errors (stack trace rather than FAIL lines), check that
the server is up and that the response shapes still match `src/lib/types.ts`.
The script codes against those contracts and the API table in `README.md`.
