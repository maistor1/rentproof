import { describe, expect, it } from "vitest";
import { reviewFinding } from "@/lib/review";
import { getReport, saveReport } from "@/lib/storage";
import { sampleReport } from "@/test/fixtures";
import { withTempDataDir } from "@/test/tempData";
import { PATCH } from "@/app/api/inspect/[inspectionId]/findings/[findingId]/route";

withTempDataDir();

const status = async (findingId: string) =>
  (await getReport("I-test"))?.findings.find((f) => f.id === findingId)?.status;

describe("reviewFinding", () => {
  it.each(["confirmed", "rejected"] as const)("marks a needs_review finding %s and saves it", async (decision) => {
    await saveReport(sampleReport());
    const report = await reviewFinding("I-test", "F-review", decision);
    expect(report.findings.find((f) => f.id === "F-review")?.status).toBe(decision);
    expect(await status("F-review")).toBe(decision);
  });

  it("lets staff change their mind", async () => {
    await saveReport(sampleReport());
    await reviewFinding("I-test", "F-confirmed", "rejected");
    expect(await status("F-confirmed")).toBe("rejected");
  });

  it.each(["F-auto", "F-hidden"])("refuses to change %s (409)", async (id) => {
    await saveReport(sampleReport());
    await expect(reviewFinding("I-test", id, "rejected")).rejects.toMatchObject({ status: 409 });
  });

  it("rejects an unknown decision with 400", async () => {
    await saveReport(sampleReport());
    await expect(reviewFinding("I-test", "F-review", "maybe")).rejects.toMatchObject({ status: 400 });
  });

  it("returns 404 for an unknown finding or report", async () => {
    await saveReport(sampleReport());
    await expect(reviewFinding("I-test", "F-nope", "confirmed")).rejects.toMatchObject({ status: 404 });
    await expect(reviewFinding("I-nope", "F-review", "confirmed")).rejects.toMatchObject({ status: 404 });
  });
});

describe("PATCH /api/inspect/:id/findings/:findingId", () => {
  const call = (body: string) =>
    PATCH(
      new Request("http://localhost", { method: "PATCH", headers: { "Content-Type": "application/json" }, body }),
      { params: Promise.resolve({ inspectionId: "I-test", findingId: "F-review" }) },
    );

  it("confirms a finding", async () => {
    await saveReport(sampleReport());
    const res = await call(JSON.stringify({ status: "confirmed" }));
    expect(res.status).toBe(200);
    expect(await status("F-review")).toBe("confirmed");
  });

  it("returns 400 for a body that is not JSON", async () => {
    await saveReport(sampleReport());
    expect((await call("{")).status).toBe(400);
  });
});
