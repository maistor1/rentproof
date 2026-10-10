import { describe, expect, it } from "vitest";
import { withTempDataDir } from "@/test/tempData";
import { POST } from "./route";

withTempDataDir();

const ctx = (rentalId: string) => ({ params: Promise.resolve({ rentalId }) });

describe("POST /api/rentals/:id/return", () => {
  it("records the return without a body", async () => {
    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx("R-1001"));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("returned");
  });

  it("accepts hoursUsed", async () => {
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hoursUsed: 2 }),
      }),
      ctx("R-1001"),
    );
    expect((await res.json()).hourMeterAtReturn).toBe(1242.5);
  });

  it("returns 404 for an unknown rental", async () => {
    const res = await POST(new Request("http://localhost", { method: "POST" }), ctx("R-nope"));
    expect(res.status).toBe(404);
  });
});
