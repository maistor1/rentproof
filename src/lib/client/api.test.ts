import { afterEach, describe, expect, it, vi } from "vitest";
import { isDamageReport, isPhoto } from "@/lib/client/guards";
import { runInspection } from "@/lib/client/inspectApi";
import { uploadPhoto } from "@/lib/client/photosApi";
import { createRental, recordReturn } from "@/lib/client/rentalsApi";
import { fetchInvoice, reviewFinding } from "@/lib/client/reviewApi";
import { makeReport, sampleRental } from "@/test/fixtures";

const photo = {
  id: "P1",
  rentalId: "R-1001",
  slot: "front",
  phase: "checkout",
  path: "P1.jpg",
  width: 1500,
  height: 1125,
  takenAt: "2026-10-10T09:00:00.000Z",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("guards", () => {
  it("accepts a Photo and rejects other shapes", () => {
    expect(isPhoto(photo)).toBe(true);
    expect(isPhoto({ ...photo, slot: "roof" })).toBe(false);
    expect(isPhoto(null)).toBe(false);
  });

  it("accepts a DamageReport and rejects other shapes", () => {
    expect(isDamageReport(makeReport())).toBe(true);
    expect(isDamageReport({ ...makeReport(), retakeSlots: "rear" })).toBe(false);
    expect(isDamageReport({ id: 1 })).toBe(false);
  });
});

describe("uploadPhoto", () => {
  it("posts the multipart form the route expects", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, photo));
    vi.stubGlobal("fetch", fetch);
    const file = new Blob(["jpeg"], { type: "image/jpeg" });
    const r = await uploadPhoto({ rentalId: "R-1001", slot: "front", phase: "checkout", file });
    expect(r).toEqual({ ok: true, value: photo });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/photos");
    expect(init.method).toBe("POST");
    const form = init.body as FormData;
    expect(form.get("rentalId")).toBe("R-1001");
    expect(form.get("slot")).toBe("front");
    expect(form.get("phase")).toBe("checkout");
    expect((form.get("file") as File).name).toBe("front.jpg");
  });
});

describe("runInspection", () => {
  it("posts the rental id and returns the report", async () => {
    const report = makeReport();
    const fetch = vi.fn().mockResolvedValue(json(200, report));
    vi.stubGlobal("fetch", fetch);
    const r = await runInspection("R-1001");
    expect(r).toEqual({ ok: true, value: report });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ rentalId: "R-1001" });
  });

  it("turns missing photos into slots to retake", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(400, { error: "missing photos", missingSlots: ["rear", "x"] })));
    const r = await runInspection("R-1001");
    expect(!r.ok && r.error.missingSlots).toEqual(["rear"]);
  });
});

describe("recordReturn", () => {
  it("posts to the rental's return route and returns the rental", async () => {
    const rental = sampleRental();
    const fetch = vi.fn().mockResolvedValue(json(200, rental));
    vi.stubGlobal("fetch", fetch);
    const r = await recordReturn("R-1001");
    expect(r).toEqual({ ok: true, value: rental });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/rentals/R-1001/return");
    expect(init.method).toBe("POST");
  });

  it("rejects a reply that isn't a rental", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { id: "R-1001" })));
    const r = await recordReturn("R-1001");
    expect(!r.ok && r.error.kind).toBe("invalid_response");
  });
});

describe("reviewFinding", () => {
  it("patches the finding and returns the updated report", async () => {
    const report = makeReport({ id: "I-1" });
    const fetch = vi.fn().mockResolvedValue(json(200, report));
    vi.stubGlobal("fetch", fetch);
    const r = await reviewFinding("I-1", "F-2", "confirmed");
    expect(r).toEqual({ ok: true, value: report });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/inspect/I-1/findings/F-2");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "confirmed" });
  });

  it("gives a friendly message when the server refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(409, { error: "only needs_review findings" })));
    const r = await reviewFinding("I-1", "F-2", "rejected");
    expect(!r.ok && r.error.message).toMatch(/try again/i);
  });
});

describe("fetchInvoice", () => {
  it("gets the invoice for a report", async () => {
    const invoice = { reportId: "I-1", rentalId: "R-1001", currency: "EUR", lines: [], total: 0 };
    const fetch = vi.fn().mockResolvedValue(json(200, invoice));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchInvoice("I-1")).toEqual({ ok: true, value: invoice });
    expect(fetch.mock.calls[0][0]).toBe("/api/invoice/I-1");
  });

  it("rejects a reply that isn't an invoice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { total: "lots" })));
    const r = await fetchInvoice("I-1");
    expect(!r.ok && r.error.kind).toBe("invalid_response");
  });
});

describe("createRental", () => {
  const input = {
    machine: { name: "Mini excavator", model: "Kubota U27-4", serialNumber: "KBU27-0042" },
    customer: { name: "Bau AG", email: "yard@bau.example" },
  };

  it("posts the form as JSON and returns the new rental", async () => {
    const rental = sampleRental();
    const fetch = vi.fn().mockResolvedValue(json(201, rental));
    vi.stubGlobal("fetch", fetch);
    expect(await createRental(input)).toEqual({ ok: true, value: rental });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/rentals");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it("turns a 400 into a friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(400, { error: "customer.email is required" })));
    const r = await createRental(input);
    expect(!r.ok && r.error.kind).toBe("bad_request");
    expect(!r.ok && r.error.message).not.toContain("customer.email");
  });
});
