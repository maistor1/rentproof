import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { getRental } from "@/lib/storage";
import { withTempDataDir } from "@/test/tempData";
import { GET } from "./[photoId]/route";
import { POST } from "./route";

withTempDataDir();

const jpeg = () =>
  sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#806040" } }).jpeg().toBuffer();

function upload(fields: Record<string, string>, file?: Buffer) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  if (file) form.set("file", new Blob([new Uint8Array(file)], { type: "image/jpeg" }), "photo.jpg");
  return POST(new Request("http://localhost/api/photos", { method: "POST", body: form }));
}

const valid = { rentalId: "R-1001", slot: "front", phase: "checkout" };
const serve = (photoId: string) =>
  GET(new Request(`http://localhost/api/photos/${photoId}`), { params: Promise.resolve({ photoId }) });

describe("POST /api/photos", () => {
  it("stores a photo and links it to the rental", async () => {
    const res = await upload(valid, await jpeg());
    expect(res.status).toBe(200);
    const photo = await res.json();
    expect(photo).toMatchObject({ ...valid, width: 1500, height: 1000 });
    expect((await getRental("R-1001"))?.photos.checkout.front).toBe(photo.id);
  });

  it.each([
    ["a slot outside the six", { ...valid, slot: "../../etc" }],
    ["an unknown phase", { ...valid, phase: "later" }],
    ["a missing rentalId", { slot: "front", phase: "checkout" }],
  ])("rejects %s with 400", async (_name, fields) => {
    const res = await upload(fields, await jpeg());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTypeOf("string");
  });

  it("requires a file", async () => {
    expect((await upload(valid)).status).toBe(400);
  });

  it("returns 404 for an unknown rental", async () => {
    expect((await upload({ ...valid, rentalId: "R-nope" }, await jpeg())).status).toBe(404);
  });

  it("returns 415 for a file that is not an image", async () => {
    const res = await upload(valid, Buffer.from("not a photo"));
    expect(res.status).toBe(415);
    expect((await res.json()).error).toMatch(/JPEG/);
  });

  it("returns 413 for files over 25 MB", async () => {
    expect((await upload(valid, Buffer.alloc(26 * 1024 * 1024))).status).toBe(413);
  });

  it("returns 400 for a body that is not a form", async () => {
    const res = await POST(new Request("http://localhost/api/photos", { method: "POST", body: "{}" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/photos/:photoId", () => {
  it("serves a stored photo as JPEG", async () => {
    const { id } = await (await upload(valid, await jpeg())).json();
    const res = await serve(id);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect(meta.width).toBe(1500);
  });

  it.each(["P-nope", "../rentals.local", "..%2Frentals"])("returns 404 for %s", async (id) => {
    expect((await serve(id)).status).toBe(404);
  });
});
