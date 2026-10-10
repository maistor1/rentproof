import { describe, expect, it } from "vitest";
import { coverCrop, fitWithin } from "@/lib/image/geometry";

describe("fitWithin", () => {
  it("scales the long edge of a landscape image down", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 2000)).toEqual({ width: 2000, height: 1500 });
  });

  it("scales the long edge of a portrait image down", () => {
    expect(fitWithin({ width: 3024, height: 4032 }, 2000)).toEqual({ width: 1500, height: 2000 });
  });

  it("never upscales", () => {
    expect(fitWithin({ width: 800, height: 600 }, 2000)).toEqual({ width: 800, height: 600 });
  });

  it("rounds to whole pixels and keeps at least 1 px", () => {
    expect(fitWithin({ width: 3333, height: 1 }, 1000)).toEqual({ width: 1000, height: 1 });
  });

  it("rejects empty sizes", () => {
    expect(() => fitWithin({ width: 0, height: 10 }, 100)).toThrow();
    expect(() => fitWithin({ width: 10, height: 10 }, 0)).toThrow();
  });
});

describe("coverCrop", () => {
  it("crops the sides of a wider source", () => {
    expect(coverCrop({ width: 1920, height: 1080 }, 4 / 3)).toEqual({
      x: 240,
      y: 0,
      width: 1440,
      height: 1080,
    });
  });

  it("crops top and bottom of a taller source", () => {
    expect(coverCrop({ width: 1080, height: 1920 }, 4 / 3)).toEqual({
      x: 0,
      y: 555,
      width: 1080,
      height: 810,
    });
  });

  it("keeps the full frame when aspects match", () => {
    expect(coverCrop({ width: 1600, height: 1200 }, 4 / 3)).toEqual({
      x: 0,
      y: 0,
      width: 1600,
      height: 1200,
    });
  });

  it("rejects a non-positive aspect", () => {
    expect(() => coverCrop({ width: 10, height: 10 }, 0)).toThrow();
  });
});
