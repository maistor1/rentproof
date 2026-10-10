import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, photoFileProblem } from "@/lib/image/validateFile";

describe("photoFileProblem", () => {
  it("accepts camera photos, including HEIC and untyped files", () => {
    expect(photoFileProblem({ type: "image/jpeg", size: 4_000_000 })).toBeNull();
    expect(photoFileProblem({ type: "image/heic", size: 2_000_000 })).toBeNull();
    expect(photoFileProblem({ type: "", size: 2_000_000 })).toBeNull();
  });

  it("rejects other files, empty files and huge files", () => {
    expect(photoFileProblem({ type: "application/pdf", size: 10 })).toMatch(/isn't a photo/);
    expect(photoFileProblem({ type: "image/jpeg", size: 0 })).toMatch(/empty/);
    expect(photoFileProblem({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 })).toMatch(/too large/);
  });
});
