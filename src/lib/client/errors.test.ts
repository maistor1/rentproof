import { describe, expect, it } from "vitest";
import { friendlyHttpError, friendlyTransportError } from "@/lib/client/errors";

describe("friendlyHttpError", () => {
  it.each([
    [400, "bad_request", /didn't look right/],
    [404, "not_found", /no longer exists/],
    [415, "bad_request", /format/],
    [500, "server", /on our side/],
  ] as const)("maps %i", (status, kind, message) => {
    const e = friendlyHttpError("photoUpload", status);
    expect(e.kind).toBe(kind);
    expect(e.message).toMatch(message);
    expect(e.status).toBe(status);
  });

  it("explains a missing route per screen", () => {
    expect(friendlyHttpError("photoUpload", 501).message).toMatch(/Photo upload isn't available yet/);
    expect(friendlyHttpError("inspection", 501).message).toMatch(/damage check isn't available yet/);
  });
});

describe("friendlyTransportError", () => {
  it("has messages for network, timeout and cancel", () => {
    expect(friendlyTransportError("photoUpload", "network").message).toMatch(/Wi-Fi/);
    expect(friendlyTransportError("inspection", "timeout").message).toMatch(/too long/);
    expect(friendlyTransportError("photoUpload", "cancelled").kind).toBe("cancelled");
    expect(friendlyTransportError("photoUpload", "invalid_response").message).toMatch(/Unexpected/);
  });
});
