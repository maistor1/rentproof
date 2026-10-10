# RentProof

AI damage detection on rental return. The yard worker photographs the machine
from six fixed angles at check-out and again at return. A vision model compares
each pair, lists new damage with severity and confidence, and confirmed damage
becomes invoice lines with photo proof.

## Setup

```bash
npm install
cp .env.example .env.local   # then paste your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Never commit `.env.local`. Photos and reports are written to `data/` and are
gitignored.

## Team

| Name | GitHub | Area |
| --- | --- | --- |
| Boris | @BorisKonov | Backend: API routes, storage, rental record, invoice |
| Konstantin | @konstantinvesselinoff764-source | AI: vision prompt, schema, confidence rules, tuning |
| Daniel | @danielgeorgiev77 | Frontend: capture screens, camera, angle guide |
| Martin | @martin111111111111111111 | Report UI: damage report, evidence page, PDF |
| maistor1 | @maistor1 | Demo and pitch: demo object, test set, slides, video |

Tasks are tracked as GitHub issues (RP-1 to RP-17), labelled by area.

## Layout

```
src/
  app/
    page.tsx                         rental list (home)
    checkout/[rentalId]/page.tsx     RP-4  Daniel
    return/[rentalId]/page.tsx       RP-9  Daniel
    report/[inspectionId]/page.tsx   RP-12 Martin
    evidence/[inspectionId]/page.tsx RP-13 Martin
    api/
      rentals/                       GET list, GET by id
      rentals/[rentalId]/return/     RP-7  Boris  POST record return (mocked telematics)
      photos/route.ts                RP-5  Boris  POST upload + resize
      photos/[photoId]/              RP-5  Boris  GET the JPEG
      inspect/route.ts               RP-6  Konstantin  POST run the 6 vision calls
      inspect/[inspectionId]/findings/[findingId]/  Boris  PATCH confirm/reject
      invoice/[inspectionId]/        RP-11 Boris
  lib/
    types.ts                         shared JSON contracts (RP-2)
    ai/prompt.ts                     system prompt          Konstantin
    ai/reportDamageTool.ts           report_damage schema   Konstantin
    ai/vision.ts                     compareSlot()          Konstantin
    rules.ts                         confidence rules       Konstantin
    pricing.ts                       invoice calculator     Boris
    storage.ts                       JSON file storage      Boris
    photos.ts, rentals.ts, review.ts photo, return, review logic  Boris
    telematics.ts                    mocked ISO 15143-3     Boris
  components/                        shared UI
data/
  rentals.json                       seeded demo rental
  price-table.json                   sample prices (say so on stage)
  photos/  inspections/              runtime output, gitignored
test-set/scenarios.md                20-scenario accuracy log  maistor1
```

## Contracts

`src/lib/types.ts` is the source of truth for `Rental`, `Photo`,
`DamageReport` and friends. Code against those shapes, not against each other's
modules. If you need to change a shape, tell the team first.

API surface everyone can rely on:

| Route | Method | In | Out |
| --- | --- | --- | --- |
| `/api/rentals` | GET | | `Rental[]` |
| `/api/rentals/:id` | GET | | `Rental` |
| `/api/rentals/:id/return` | POST | optional `{ hoursUsed }` | `Rental` (status `returned`, telematics attached; safe to repeat) |
| `/api/photos` | POST | form: `rentalId`, `slot`, `phase`, `file` | `Photo` |
| `/api/photos/:photoId` | GET | | JPEG |
| `/api/inspect` | POST | `{ rentalId }` | `DamageReport` |
| `/api/inspect/:inspectionId/findings/:findingId` | PATCH | `{ status: "confirmed" \| "rejected" }` | `DamageReport` |
| `/api/invoice/:inspectionId` | GET | | `Invoice` |

To show a photo, point an `<img>` at `/api/photos/<photoId>`; the ids are in
`rental.photos[phase][slot]`. Errors are `{ error }` with 400, 404, 409, 413
or 415. Upload JPEG or PNG (`accept="image/jpeg,image/png"`); HEIC gets a 415.

## Data

`data/rentals.json` is the seed and is never written. The app keeps its
state in `data/rentals.local.json`, `data/photos/` and `data/inspections/`,
all gitignored. Run `npm run reset-data` to go back to the seed, for example
before a rehearsal.

The machines have no hour meter to read or photograph; hours come only from
the machine's software. `hourMeterAtCheckout` is the reading taken from it at
check-out, and `POST /api/rentals/:id/return` fills `hourMeterAtReturn` from
the (mocked) ISO 15143-3 feed. No screen asks the worker for hours.

## Notes for the AI owner

- Model: `claude-sonnet-5-5` (see `src/lib/ai/vision.ts`).
- Sonnet 5.5 rejects forced `tool_choice` (`any` or `tool`) with a 400. Use
  `tool_choice: { type: "auto" }`, keep `strict: true` on the tool (already set),
  and rely on the last line of the system prompt to get the call. If no
  `tool_use` block comes back, retry once.
- Send the BEFORE image, the text `BEFORE`, the AFTER image, the text `AFTER`,
  then the slot name, as base64 JPEG content blocks.
- Storage for the inspect route (`@/lib/storage`): `getRental(id)`,
  `readPhoto(rental.photos.checkout[slot])` / `readPhoto(rental.photos.return[slot])`
  for the JPEG buffers, `saveReport(report)`, and `updateRental(id, r => { r.status = "inspected"; })`.
  Use `newId("I")` for the report id.
- Call `updateRental` after the vision calls instead of `saveRental({ ...rental, ... })`.
  The rental read before the calls is stale by then, and writing it back would
  erase a return recorded while the inspection ran. `PHOTO_DIR` and
  `saveRental` still work but are deprecated.

## Git

One branch per person, merge to `main` at each milestone (H3, H6).
