import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PHOTO_DIR,
  getPhoto,
  getRental,
  getReport,
  listRentals,
  readPhoto,
  saveReport,
  updateRental,
  updateReport,
} from "@/lib/storage";
import { SLOTS } from "@/lib/types";
import { sampleReport } from "@/test/fixtures";
import { withTempDataDir } from "@/test/tempData";

const dir = withTempDataDir();
const localFile = () => path.join(dir(), "rentals.local.json");

describe("rentals", () => {
  it("reads the seed until the first write", async () => {
    expect((await listRentals()).map((r) => r.id)).toEqual(["R-1001"]);
    expect(existsSync(localFile())).toBe(false);
  });

  it("writes changes to rentals.local.json and leaves the seed alone", async () => {
    const seed = await readFile(path.join(dir(), "rentals.json"), "utf8");
    await updateRental("R-1001", (r) => {
      r.hourMeterAtCheckout = 1300;
    });
    expect((await getRental("R-1001"))?.hourMeterAtCheckout).toBe(1300);
    expect(existsSync(localFile())).toBe(true);
    expect(await readFile(path.join(dir(), "rentals.json"), "utf8")).toBe(seed);
  });

  it("keeps every update when twelve run at once", async () => {
    await Promise.all(
      SLOTS.flatMap((slot) =>
        (["checkout", "return"] as const).map((phase) =>
          updateRental("R-1001", (r) => {
            r.photos[phase][slot] = `P-${phase}-${slot}`;
          }),
        ),
      ),
    );
    const rental = await getRental("R-1001");
    for (const slot of SLOTS) {
      expect(rental?.photos.checkout[slot]).toBe(`P-checkout-${slot}`);
      expect(rental?.photos.return[slot]).toBe(`P-return-${slot}`);
    }
  });

  it("returns undefined for an unknown rental and writes nothing", async () => {
    expect(await updateRental("R-nope", () => {})).toBeUndefined();
    expect(existsSync(localFile())).toBe(false);
  });

  it("writes nothing when the change throws, and keeps working after", async () => {
    await expect(
      updateRental("R-1001", () => {
        throw new Error("nope");
      }),
    ).rejects.toThrow("nope");
    expect(existsSync(localFile())).toBe(false);
    await updateRental("R-1001", (r) => {
      r.hourMeterAtCheckout = 1;
    });
    expect((await getRental("R-1001"))?.hourMeterAtCheckout).toBe(1);
  });
});

describe("reports", () => {
  it("saves and reads a report", async () => {
    await saveReport(sampleReport());
    expect(await getReport("I-test")).toEqual(sampleReport());
  });

  it("updates a report in place", async () => {
    await saveReport(sampleReport());
    await updateReport("I-test", (r) => {
      r.findings[1].status = "confirmed";
    });
    expect((await getReport("I-test"))?.findings[1].status).toBe("confirmed");
  });

  it("returns undefined for an unknown report", async () => {
    expect(await getReport("I-nope")).toBeUndefined();
    expect(await updateReport("I-nope", () => {})).toBeUndefined();
  });
});

describe("ids", () => {
  it("never reads outside the data folder", async () => {
    expect(await getPhoto("../rentals")).toBeUndefined();
    expect(await readPhoto("../../package")).toBeUndefined();
    expect(await getReport("../rentals")).toBeUndefined();
  });
});

describe("compatibility", () => {
  it("keeps PHOTO_DIR for code written before readPhoto existed", () => {
    expect(PHOTO_DIR).toBe(path.join(process.cwd(), "data", "photos"));
  });
});
