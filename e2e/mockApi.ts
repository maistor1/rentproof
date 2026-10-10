import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { E2E_RENTALS, E2E_REPORT, PHOTO_FILE, REPORT_ID, SLOTS } from "./fixtures";

// Network-level mocks only: the app itself has no mock mode.

export async function mockPhotoUpload(page: Page): Promise<string[]> {
  const uploaded: string[] = [];
  await page.route("**/api/photos", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const slot = /name="slot"\r\n\r\n([a-z_]+)/.exec(body)?.[1] ?? "front";
    const phase = /name="phase"\r\n\r\n([a-z]+)/.exec(body)?.[1] ?? "checkout";
    const rentalId = /name="rentalId"\r\n\r\n([A-Z0-9-]+)/.exec(body)?.[1] ?? "";
    uploaded.push(slot);
    await route.fulfill({
      json: { id: `E2E-${phase}-${slot}`, rentalId, slot, phase, path: "", width: 1500, height: 1125, takenAt: new Date().toISOString() },
    });
  });
  return uploaded;
}

export async function mockPhotoFiles(page: Page): Promise<void> {
  const jpeg = await readFile(PHOTO_FILE);
  await page.route("**/api/photos/*", (route) => route.fulfill({ body: jpeg, contentType: "image/jpeg" }));
}

function report(id: string, rentalId: string, retake: Record<string, string>) {
  return {
    id,
    rentalId,
    createdAt: new Date().toISOString(),
    model: "claude-sonnet-5-5",
    slots: SLOTS.map((slot) => ({
      slot,
      image_quality_ok: !(slot in retake),
      retake_reason: retake[slot] ?? null,
      findings: [],
      ignored_changes: [],
    })),
    findings: [],
    retakeSlots: Object.keys(retake),
  };
}

// Closes the rental, then answers each damage check in turn, after a short
// delay so the wait screen shows.
export async function mockInspect(page: Page, rentalId: string, rounds: Record<string, string>[]): Promise<void> {
  const rental = E2E_RENTALS.find((r) => r.id === rentalId);
  await page.route(`**/api/rentals/${rentalId}/return`, (route) =>
    route.fulfill({ json: { ...rental, status: "returned" } }),
  );
  let call = 0;
  await page.route("**/api/inspect", async (route) => {
    const retake = rounds[Math.min(call, rounds.length - 1)];
    call += 1;
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({ json: report(`RPT-E2E-${call}`, rentalId, retake) });
  });
}

// Confirming the e2e finding: the PATCH answers with it confirmed and the
// invoice gains its line.
export async function mockReview(page: Page): Promise<void> {
  const confirmed = {
    ...E2E_REPORT,
    findings: E2E_REPORT.findings.map((f) => ({ ...f, status: "confirmed" })),
  };
  await page.route(`**/api/inspect/${REPORT_ID}/findings/*`, (route) => route.fulfill({ json: confirmed }));
  await page.route(`**/api/invoice/${REPORT_ID}`, (route) =>
    route.fulfill({
      json: {
        reportId: REPORT_ID,
        rentalId: E2E_REPORT.rentalId,
        currency: "EUR",
        lines: [
          {
            findingId: "F-E2E-1",
            description: "Scratch (minor), front: front blade, left corner",
            priceKey: "scratch/minor",
            amount: 45,
            beforePhotoId: "E2E-front",
            afterPhotoId: "E2E-front",
          },
        ],
        total: 45,
      },
    }),
  );
}
