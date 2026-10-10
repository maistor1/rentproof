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
    rentals/new/page.tsx             New rental form
    checkout/[rentalId]/page.tsx     RP-4  Daniel
    return/[rentalId]/page.tsx       RP-9  Daniel
    report/[inspectionId]/page.tsx   RP-12 Boris
    evidence/[inspectionId]/page.tsx RP-13 Boris
    api/
      rentals/                       GET list, POST create, GET by id
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
  rentals.json                       app seed, empty: rentals are created in the app
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
| `/api/rentals` | POST | `{ machine: { name, model, serialNumber }, customer: { name, email } }` | `Rental` (201, status `out`, check-out hours from telematics) |
| `/api/rentals/:id` | GET | | `Rental` |
| `/api/rentals/:id/return` | POST | optional `{ hoursUsed }` | `Rental` (status `returned`, telematics attached; safe to repeat) |
| `/api/photos` | POST | form: `rentalId`, `slot`, `phase`, `file` | `Photo` |
| `/api/photos/:photoId` | GET | | JPEG |
| `/api/inspect` | POST | `{ rentalId }` | `DamageReport` |
| `/api/inspect/:inspectionId/findings/:findingId` | PATCH | `{ status: "confirmed" \| "rejected" \| "needs_review" }` | `DamageReport` (needs_review undoes) |
| `/api/invoice/:inspectionId` | GET | | `Invoice` |

To show a photo, point an `<img>` at `/api/photos/<photoId>`; the ids are in
`rental.photos[phase][slot]`. Errors are `{ error }` with 400, 404, 409, 413
or 415. Upload JPEG or PNG (`accept="image/jpeg,image/png"`); HEIC gets a 415.

## Data

`data/rentals.json` is the seed and is never written. It is empty: a fresh
install starts with no rentals, and staff create one with **New rental** on the
home page. The app keeps its state in `data/rentals.local.json`, `data/photos/`
and `data/inspections/`, all gitignored. Run `npm run reset-data` to go back to
an empty list, for example before a rehearsal. Unit tests use their own seed
(`src/test/seed/rentals.json`, rental `R-1001`).

The machines have no hour meter to read or photograph; hours come only from
the machine's software. `hourMeterAtCheckout` is the reading taken from it at
check-out (mocked from the serial number when the rental is created), and `POST /api/rentals/:id/return` fills `hourMeterAtReturn` from
the (mocked) ISO 15143-3 feed. No screen asks the worker for hours.

## Home and New rental

`/` lists the rentals, newest first. Each card shows the machine, customer,
serial, a status, and the one screen that moves it forward: check-out photos,
return, finishing the damage check, or the report (plus customer evidence once
inspected). **New rental** (`/rentals/new`) asks for the machine and the
customer, never hours, and opens the check-out photos.

## Capture screens (Daniel)

`/checkout/:id` (RP-4) and `/return/:id` (RP-9) share one flow: intro, six
slots, end screen. Return adds the live angle guide and the damage check.

- The hour meter is data (see Data above). The screens only show it.
- They call `POST /api/photos` (one upload at a time, downscaled to 2,000 px
  in the browser) and `POST /api/inspect`. Nothing is mocked in the app: while a
  route answers 501 the screen keeps the photos and says so.
- The photo URL lives only in `src/lib/photoUrl.ts`. Uploads are always
  re-encoded to JPEG in the browser, so HEIC never reaches the 415.
- `/api/inspect` with `retakeSlots` sends the worker back to those slots, then
  re-runs. With none, the screen opens `/report/:reportId`.

Attention rules (shared with the report pages, tokens in `globals.css`):

- One primary action per screen, `bg-action` yellow, 56 px, bottom of the screen.
- Yellow = do this next, green = done, red = retake. Text uses the `*-ink`
  tokens for 7:1 contrast. Three text sizes: `text-task`, `text-body`, `text-meta`.
- Progress (machine map + six segments) is always visible while capturing.
- Motion only on state changes, 150–250 ms; reduced-motion users get 1 ms.

Testing on a phone: the live camera needs HTTPS. Run `npm run dev:phone`. It
finds the laptop's Wi-Fi address, makes a certificate for it (with mkcert, no
password; a new address gets a new certificate), sets `DEV_ORIGINS` and prints
the URL to open on the phone, e.g. `https://192.168.68.119:3000`. Accept the
certificate warning once. Pass `-- --ip <address>` if it picks the wrong
network. If mkcert is missing, `brew install mkcert` or run `npm run dev:https`
once to download it. Without HTTPS the return screen falls back to the reference
photo plus the phone's camera app.

```bash
npm test               # unit + component tests (Vitest)
npm run test:coverage  # 80% threshold on the capture code
npm run test:e2e       # Playwright, phone viewport, fake camera; mocks the write routes
npm run typecheck
```

## Report screens

`/report/:inspectionId` (RP-12) is the staff screen the return flow opens.
Review-band findings (0.50–0.79) come first, each with Confirm damage / Reject
and an undo. After each decision the screen re-fetches the invoice, since the
server prices it. "Open customer evidence" stays disabled until nothing is
left in `needs_review`.

`/evidence/:inspectionId` (RP-13) is the read-only customer page: one block per
invoice line with the before/after pair, the total, and what was checked and
not charged. "Download PDF" opens the browser's print dialog; print CSS lays
the page out as A4. It shows "Not ready yet" while findings await review.

Both pages show the rental's latest photos, not a copy taken at inspection
time, and treat boxes as approximate (soft highlight).

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
