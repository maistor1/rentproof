import { describe, expect, it } from "vitest";
import { formatHours, formatHoursUsed, hoursUsed, returnReading } from "@/lib/hourMeter";
import { mockSnapshot } from "@/lib/telematics";
import { makeRental } from "@/test/fixtures";

describe("formatHours", () => {
  it("uses one decimal and a fixed locale so server and client match", () => {
    expect(formatHours(1240.5)).toBe("1,240.5 h");
    expect(formatHours(1278)).toBe("1,278.0 h");
    expect(formatHours(0)).toBe("0.0 h");
  });
});

describe("hoursUsed", () => {
  it("rounds away floating point noise", () => {
    expect(hoursUsed(1240.5, 1278)).toBe(37.5);
    expect(hoursUsed(0.1, 0.3)).toBe(0.2);
  });

  it("never goes negative", () => {
    expect(hoursUsed(100, 90)).toBe(0);
  });
});

describe("formatHoursUsed", () => {
  it("reads as a delta", () => {
    expect(formatHoursUsed(37.5)).toBe("+37.5 h used");
  });
});

describe("returnReading", () => {
  it("prefers the recorded return reading", () => {
    expect(returnReading(makeRental({ hourMeterAtReturn: 1300 }))).toBe(1300);
  });

  it("falls back to the telematics snapshot", () => {
    const rental = makeRental();
    const withSnap = { ...rental, telematics: mockSnapshot(rental, 37.5) };
    expect(returnReading(withSnap)).toBe(1278);
  });

  it("is null when the rental has no return data yet", () => {
    expect(returnReading(makeRental())).toBeNull();
  });
});
