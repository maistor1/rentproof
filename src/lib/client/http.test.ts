import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson } from "@/lib/client/http";

const parse = (x: unknown) => (x && typeof x === "object" && "id" in x ? (x as { id: string }) : null);

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("requestJson", () => {
  it("returns the parsed value", async () => {
    vi.stubGlobal("fetch", respond(200, { id: "P1" }));
    const r = await requestJson("/x", {}, { context: "photoUpload", timeoutMs: 1000, parse });
    expect(r).toEqual({ ok: true, value: { id: "P1" } });
  });

  it("explains a route that isn't built yet", async () => {
    vi.stubGlobal("fetch", respond(501, { error: "not implemented (RP-5)" }));
    const r = await requestJson("/x", {}, { context: "photoUpload", timeoutMs: 1000, parse });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("not_implemented");
      expect(r.error.status).toBe(501);
      expect(r.error.message).toMatch(/isn't available yet/);
    }
  });

  it("keeps the error body for callers that need details", async () => {
    vi.stubGlobal("fetch", respond(400, { error: "missing photos", missingSlots: ["rear"] }));
    const r = await requestJson("/x", {}, { context: "inspection", timeoutMs: 1000, parse });
    expect(!r.ok && r.error.body).toEqual({ error: "missing photos", missingSlots: ["rear"] });
  });

  it("maps 502 from the damage check to a retry message", async () => {
    vi.stubGlobal("fetch", respond(502, { error: "inspection failed" }));
    const r = await requestJson("/x", {}, { context: "inspection", timeoutMs: 1000, parse });
    expect(!r.ok && r.error.message).toMatch(/damage check failed/i);
  });

  it("reports a dropped connection", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const r = await requestJson("/x", {}, { context: "photoUpload", timeoutMs: 1000, parse });
    expect(!r.ok && r.error.kind).toBe("network");
  });

  it("times out slow requests", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
      ),
    );
    const pending = requestJson("/x", {}, { context: "inspection", timeoutMs: 5000, parse });
    await vi.advanceTimersByTimeAsync(5000);
    const r = await pending;
    expect(!r.ok && r.error.kind).toBe("timeout");
  });

  it("reports cancellation by the caller", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
      ),
    );
    const pending = requestJson("/x", {}, { context: "inspection", timeoutMs: 5000, parse, signal: controller.signal });
    controller.abort();
    const r = await pending;
    expect(!r.ok && r.error.kind).toBe("cancelled");
  });

  it("rejects a reply with the wrong shape", async () => {
    vi.stubGlobal("fetch", respond(200, { nope: true }));
    const r = await requestJson("/x", {}, { context: "photoUpload", timeoutMs: 1000, parse });
    expect(!r.ok && r.error.kind).toBe("invalid_response");
  });

  it("rejects a reply that isn't JSON", async () => {
    vi.stubGlobal("fetch", respond(200, "<html>"));
    const r = await requestJson("/x", {}, { context: "photoUpload", timeoutMs: 1000, parse });
    expect(!r.ok && r.error.kind).toBe("invalid_response");
  });
});
