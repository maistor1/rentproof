import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/invoice/[inspectionId]/route";
import { buildInvoice, PRICES } from "@/lib/pricing";
import { reviewFinding } from "@/lib/review";
import { saveReport, updateRental } from "@/lib/storage";
import type { DamageType, Severity } from "@/lib/types";
import { sampleRental, sampleReport } from "@/test/fixtures";
import { withTempDataDir } from "@/test/tempData";

describe("buildInvoice", () => {
  it("bills auto_flagged and confirmed findings only", () => {
    const invoice = buildInvoice(sampleRental(), sampleReport());
    expect(invoice.lines.map((l) => l.findingId)).toEqual(["F-auto", "F-confirmed"]);
    expect(invoice).toMatchObject({ reportId: "I-test", rentalId: "R-1001", currency: "EUR", total: 995 });
  });

  it("prices each line from the table and links its photos", () => {
    const [line] = buildInvoice(sampleRental(), sampleReport()).lines;
    expect(line).toEqual({
      findingId: "F-auto",
      description: "Scratch (minor), left side: lower edge of the left door",
      priceKey: "scratch/minor",
      amount: 45,
      beforePhotoId: "P-before-left_side",
      afterPhotoId: "P-after-left_side",
    });
  });

  it("returns an empty invoice when nothing is billable", () => {
    const report = { ...sampleReport(), findings: [] };
    expect(buildInvoice(sampleRental(), report)).toMatchObject({ lines: [], total: 0 });
  });

  it("has a price for every damage type and severity", () => {
    const types: DamageType[] = ["scratch", "dent", "crack", "bent_or_broken", "missing_part", "leak", "glass_or_light", "other"];
    const severities: Severity[] = ["minor", "moderate", "severe"];
    for (const t of types) for (const s of severities) expect(PRICES.prices).toHaveProperty(`${t}/${s}`);
  });

  it("refuses to bill a finding without both photos (409)", () => {
    const rental = sampleRental();
    delete rental.photos.return.left_side;
    let error: unknown;
    try {
      buildInvoice(rental, sampleReport());
    } catch (e) {
      error = e;
    }
    expect(error).toMatchObject({ status: 409 });
  });
});

describe("GET /api/invoice/:inspectionId", () => {
  withTempDataDir();
  const get = (inspectionId: string) =>
    GET(new Request("http://localhost"), { params: Promise.resolve({ inspectionId }) });

  async function seed() {
    await saveReport(sampleReport());
    await updateRental("R-1001", (r) => {
      r.photos = sampleRental().photos;
    });
  }

  it("returns the invoice for a saved report", async () => {
    await seed();
    const res = await get("I-test");
    expect(res.status).toBe(200);
    expect((await res.json()).total).toBe(995);
  });

  it("reflects a review made after the invoice was first opened", async () => {
    await seed();
    await get("I-test");
    await reviewFinding("I-test", "F-review", "confirmed");
    expect((await (await get("I-test")).json()).total).toBe(995 + 250);
  });

  it("returns 404 for an unknown report", async () => {
    expect((await get("I-nope")).status).toBe(404);
  });
});
