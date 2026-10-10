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

## Layout

```
src/
  app/
    page.tsx                         rental list (home)
    checkout/[rentalId]/page.tsx     RP-4  Member 1
    return/[rentalId]/page.tsx       RP-9  Member 1
    report/[inspectionId]/page.tsx   RP-12 Member 4
    evidence/[inspectionId]/page.tsx RP-13 Member 4
    api/
      rentals/                       GET list, GET by id
      photos/route.ts                RP-5  Member 3  POST upload + resize
      inspect/route.ts               RP-6  Member 2  POST run the 6 vision calls
      invoice/[inspectionId]/        RP-11 Member 3
  lib/
    types.ts                         shared JSON contracts (RP-2)
    ai/prompt.ts                     system prompt          Member 2
    ai/reportDamageTool.ts           report_damage schema   Member 2
    ai/vision.ts                     compareSlot()          Member 2
    rules.ts                         confidence rules       Member 2
    pricing.ts                       invoice calculator     Member 3
    storage.ts                       JSON file storage      Member 3
    telematics.ts                    mocked ISO 15143-3     Member 3
  components/                        shared UI
data/
  rentals.json                       seeded demo rental
  price-table.json                   sample prices (say so on stage)
  photos/  inspections/              runtime output, gitignored
test-set/scenarios.md                20-scenario accuracy log  Member 5
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
| `/api/invoice/:inspectionId` | GET | | `Invoice` |

Photos are served to the UI by id; Member 3 decides the URL and adds it here.

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
