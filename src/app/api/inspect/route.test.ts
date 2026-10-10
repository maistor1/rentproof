import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordReturn } from "@/lib/rentals";
import { getRental, updateRental } from "@/lib/storage";
import { withTempDataDir } from "@/test/tempData";
import { makeReport, sampleRental } from "@/test/fixtures";
import { SLOTS } from "@/lib/types";

vi.mock("@/lib/inspect", async (original) => ({
  ...(await original<typeof import("@/lib/inspect")>()),
  inspectRental: vi.fn(),
}));

const { inspectRental } = await import("@/lib/inspect");
const { POST } = await import("./route");

withTempDataDir();

const post = (body: unknown) =>
  POST(
    new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

async function givePhotos(rentalId: string) {
  const { photos } = sampleRental();
  await updateRental(rentalId, (r) => {
    r.photos = photos;
  });
}

describe("POST /api/inspect", () => {
  // Braces matter: a function returned from beforeEach runs as cleanup, and
  // mockReset() returns the mock, which then ran once more without a temp dir.
  beforeEach(() => {
    vi.mocked(inspectRental).mockReset();
  });

  it("lists the missing slots in the 400 reply", async () => {
    await updateRental("R-1001", (r) => {
      r.photos = { checkout: {}, return: {} };
    });
    const res = await post({ rentalId: "R-1001" });
    expect(res.status).toBe(400);
    expect((await res.json()).missingSlots).toEqual([...SLOTS]);
  });

  it("keeps a return recorded while the vision calls run", async () => {
    await givePhotos("R-1001");
    await updateRental("R-1001", (r) => {
      r.status = "out";
      r.hourMeterAtReturn = null;
      r.returnAt = null;
    });
    vi.mocked(inspectRental).mockImplementation(async () => {
      await recordReturn("R-1001", 2);
      return makeReport({ rentalId: "R-1001", retakeSlots: [] });
    });

    const res = await post({ rentalId: "R-1001" });
    expect(res.status).toBe(200);
    const rental = await getRental("R-1001");
    expect(rental?.hourMeterAtReturn).not.toBeNull();
    expect(rental?.status).toBe("inspected");
  });

  it("leaves the status alone when slots need a retake", async () => {
    await givePhotos("R-1001");
    vi.mocked(inspectRental).mockResolvedValue(makeReport({ rentalId: "R-1001", retakeSlots: ["rear"] }));
    const before = (await getRental("R-1001"))?.status;
    await post({ rentalId: "R-1001" });
    expect((await getRental("R-1001"))?.status).toBe(before);
  });
});
