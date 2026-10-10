import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const request = (authorization?: string) =>
  new NextRequest("http://localhost/api/rentals", {
    headers: authorization ? { authorization } : {},
  });
const basic = (user: string, password: string) =>
  `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;

describe("proxy demo password", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets everything through when DEMO_PASSWORD is not set", () => {
    vi.stubEnv("DEMO_PASSWORD", "");
    expect(proxy(request()).status).toBe(200);
  });

  it("asks for credentials when the header is missing", () => {
    vi.stubEnv("DEMO_PASSWORD", "secret");
    const res = proxy(request());
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toMatch(/^Basic /);
  });

  it("rejects a wrong password", () => {
    vi.stubEnv("DEMO_PASSWORD", "secret");
    expect(proxy(request(basic("demo", "secreT"))).status).toBe(401);
    expect(proxy(request(basic("demo", "secret2"))).status).toBe(401);
    expect(proxy(request("Bearer secret")).status).toBe(401);
  });

  it("accepts the right password with any user name", () => {
    vi.stubEnv("DEMO_PASSWORD", "secret");
    expect(proxy(request(basic("anyone", "secret"))).status).toBe(200);
    expect(proxy(request(basic("", "secret"))).status).toBe(200);
  });

  it("keeps colons in the password", () => {
    vi.stubEnv("DEMO_PASSWORD", "a:b");
    expect(proxy(request(basic("demo", "a:b"))).status).toBe(200);
  });
});
