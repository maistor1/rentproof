import { describe, expect, it } from "vitest";
import { nextStep, sortNewestFirst } from "@/lib/home/nextStep";
import { allPhotos, makeRental } from "@/test/fixtures";

describe("nextStep", () => {
  it("sends a new rental to the check-out photos", () => {
    const r = makeRental({ status: "out", photos: { checkout: {}, return: {} } });
    expect(nextStep(r, undefined)).toEqual({
      status: { label: "Check-out photos needed", done: false },
      primary: { label: "Take check-out photos", href: "/checkout/R-1001" },
    });
  });

  it("sends a rental with a partial check-out back to the check-out", () => {
    const r = makeRental({ status: "out", photos: { checkout: { front: "P1" }, return: {} } });
    expect(nextStep(r, undefined).primary.href).toBe("/checkout/R-1001");
  });

  it("offers the return once all check-out photos are in", () => {
    const r = makeRental({ status: "out", photos: { checkout: allPhotos("P"), return: {} } });
    expect(nextStep(r, undefined)).toEqual({
      status: { label: "On rent", done: false },
      primary: { label: "Start return", href: "/return/R-1001" },
    });
  });

  it("sends a returned rental back to finish the damage check", () => {
    const r = makeRental({ status: "returned" });
    expect(nextStep(r, "RPT-1")).toEqual({
      status: { label: "Damage check pending", done: false },
      primary: { label: "Finish return check", href: "/return/R-1001" },
    });
  });

  it("opens the report and evidence of an inspected rental", () => {
    const r = makeRental({ status: "inspected" });
    expect(nextStep(r, "RPT 1")).toEqual({
      status: { label: "Report ready", done: true },
      primary: { label: "Open report", href: "/report/RPT%201" },
      secondary: { label: "Customer evidence", href: "/evidence/RPT%201" },
    });
  });

  it("falls back to the return screen if an inspected rental has no report file", () => {
    const r = makeRental({ status: "inspected" });
    expect(nextStep(r, undefined).primary.href).toBe("/return/R-1001");
  });
});

describe("sortNewestFirst", () => {
  it("orders by check-out time, newest first, without mutating", () => {
    const a = makeRental({ id: "R-a", checkoutAt: "2026-10-09T08:00:00.000Z" });
    const b = makeRental({ id: "R-b", checkoutAt: "2026-10-10T08:00:00.000Z" });
    const list = [a, b];
    expect(sortNewestFirst(list).map((r) => r.id)).toEqual(["R-b", "R-a"]);
    expect(list.map((r) => r.id)).toEqual(["R-a", "R-b"]);
  });
});
