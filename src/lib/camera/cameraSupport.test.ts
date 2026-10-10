import { describe, expect, it } from "vitest";
import { classifyCameraError, detectCameraSupport, fallbackMessage } from "@/lib/camera/cameraSupport";

function named(name: string) {
  return Object.assign(new Error(name), { name });
}

describe("detectCameraSupport", () => {
  it("needs a secure context", () => {
    expect(detectCameraSupport({ isSecureContext: false, hasGetUserMedia: true })).toBe("insecure");
  });

  it("needs getUserMedia", () => {
    expect(detectCameraSupport({ isSecureContext: true, hasGetUserMedia: false })).toBe("unsupported");
  });

  it("is supported otherwise", () => {
    expect(detectCameraSupport({ isSecureContext: true, hasGetUserMedia: true })).toBe("supported");
  });
});

describe("classifyCameraError", () => {
  it.each([
    ["NotAllowedError", "denied"],
    ["SecurityError", "denied"],
    ["NotFoundError", "notFound"],
    ["OverconstrainedError", "notFound"],
    ["NotReadableError", "inUse"],
    ["AbortError", "inUse"],
    ["TypeError", "unknown"],
  ])("maps %s to %s", (name, reason) => {
    expect(classifyCameraError(named(name))).toBe(reason);
  });

  it("handles non-errors", () => {
    expect(classifyCameraError("weird")).toBe("unknown");
  });
});

describe("fallbackMessage", () => {
  it("explains every reason in plain words", () => {
    for (const reason of ["insecure", "unsupported", "denied", "notFound", "inUse", "stopped", "unknown"] as const) {
      expect(fallbackMessage(reason)).toMatch(/camera/i);
    }
  });
});
