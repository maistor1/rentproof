import { afterEach, describe, expect, it, vi } from "vitest";
import { isDamageReport, isPhoto } from "@/lib/client/guards";
import { runInspection } from "@/lib/client/inspectApi";
import { uploadPhoto } from "@/lib/client/photosApi";
import { makeReport } from "@/test/fixtures";

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
