import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizePhoto, savePhoto } from "@/lib/photos";
import { getPhoto, getRental, readPhoto } from "@/lib/storage";
import { SLOTS } from "@/lib/types";
import { withTempDataDir } from "@/test/tempData";

const dir = withTempDataDir();

const image = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#806040" } }).jpeg();

describe("normalizePhoto", () => {
  it("fits the long edge to 1,500 px", async () => {
    const out = await normalizePhoto(await image(3000, 2000).toBuffer());
    expect([out.width, out.height]).toEqual([1500, 1000]);
  });

  it("leaves small photos at their size", async () => {
    const out = await normalizePhoto(await image(800, 600).toBuffer());
    expect([out.width, out.height]).toEqual([800, 600]);
  });

  it("turns phone photos upright using EXIF orientation", async () => {
    const sideways = await image(400, 200).withMetadata({ orientation: 6 }).toBuffer();
    const out = await normalizePhoto(sideways);
    expect([out.width, out.height]).toEqual([200, 400]);
  });

  it("strips EXIF so phone GPS never reaches the evidence page", async () => {
    const tagged = await image(400, 200).withMetadata({ orientation: 6 }).toBuffer();
    const meta = await sharp((await normalizePhoto(tagged)).jpeg).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.exif).toBeUndefined();
  });

  it("rejects data that is not an image with 415", async () => {
    await expect(normalizePhoto(Buffer.from("not a photo"))).rejects.toMatchObject({ status: 415 });
  });
});

describe("savePhoto", () => {
  it("stores the JPEG and the record, and links it on the rental", async () => {
    const photo = await savePhoto({
      rentalId: "R-1001",
      slot: "front",
      phase: "checkout",
      file: await image(3000, 2000).toBuffer(),
    });
    expect(photo).toMatchObject({ rentalId: "R-1001", slot: "front", phase: "checkout", width: 1500, height: 1000 });
    expect(await getPhoto(photo.id)).toEqual(photo);
    expect((await readPhoto(photo.id))?.length).toBeGreaterThan(0);
    expect((await getRental("R-1001"))?.photos.checkout.front).toBe(photo.id);
  });

  it("keeps all six slots when uploads run in parallel", async () => {
    const file = await image(1000, 800).toBuffer();
    const photos = await Promise.all(
      SLOTS.map((slot) => savePhoto({ rentalId: "R-1001", slot, phase: "return", file })),
    );
    const rental = await getRental("R-1001");
    for (const p of photos) expect(rental?.photos.return[p.slot]).toBe(p.id);
  });

  it("rejects an unknown rental with 404 before writing anything", async () => {
    await expect(
      savePhoto({ rentalId: "R-nope", slot: "front", phase: "checkout", file: await image(100, 100).toBuffer() }),
    ).rejects.toMatchObject({ status: 404 });
    expect(await readdir(path.join(dir(), "photos"))).toEqual([]);
  });
});
