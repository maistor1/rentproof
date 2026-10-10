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
      photos/route.ts                RP-5  Boris  POST upload + resize
      inspect/route.ts               RP-6  Konstantin  POST run the 6 vision calls
      invoice/[inspectionId]/        RP-11 Boris
  lib/
    types.ts                         shared JSON contracts (RP-2)
    ai/prompt.ts                     system prompt          Konstantin
    ai/reportDamageTool.ts           report_damage schema   Konstantin
    ai/vision.ts                     compareSlot()          Konstantin
    rules.ts                         confidence rules       Konstantin
    pricing.ts                       invoice calculator     Boris
    storage.ts                       JSON file storage      Boris
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
| `/api/photos` | POST | form: `rentalId`, `slot`, `phase`, `file` | `Photo` |
| `/api/inspect` | POST | `{ rentalId }` | `DamageReport` |
| `/api/inspect/:reportId/findings/:findingId` | PATCH | `{ status: "confirmed" \| "rejected" \| "needs_review" }` | `DamageReport` |
| `/api/invoice/:inspectionId` | GET | | `Invoice` |

Photos are served to the UI by id; Boris decides the URL and adds it here.

## Notes for the AI owner

- Model: `claude-sonnet-5-5` (see `src/lib/ai/vision.ts`).
- Sonnet 5.5 rejects forced `tool_choice` (`any` or `tool`) with a 400. Use
  `tool_choice: { type: "auto" }`, keep `strict: true` on the tool (already set),
  and rely on the last line of the system prompt to get the call. If no
  `tool_use` block comes back, retry once.
- Send the BEFORE image, the text `BEFORE`, the AFTER image, the text `AFTER`,
  then the slot name, as base64 JPEG content blocks.

## Git

One branch per person, merge to `main` at each milestone (H3, H6).
