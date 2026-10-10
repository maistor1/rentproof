import { describe, expect, it } from "vitest";
import { getRental } from "@/lib/storage";
import { mockCheckoutHours } from "@/lib/telematics";
import { withTempDataDir } from "@/test/tempData";
import { GET, POST } from "./route";

withTempDataDir();

const body = {
  machine: { name: "Mini excavator", model: "Kubota U27-4", serialNumber: "KBU27-0042" },
  customer: { name: "Bau AG", email: "yard@bau.example" },
};

const post = (raw: string) =>
  POST(new Request("http://localhost/api/rentals", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw }));

describe("POST /api/rentals", () => {
  it("creates a rental and returns 201", async () => {
    const res = await post(JSON.stringify(body));
    expect(res.status).toBe(201);
    const rental = await res.json();
    expect(rental).toMatchObject({ status: "out", machine: body.machine, customer: body.customer });
    expect(rental.hourMeterAtCheckout).toBe(mockCheckoutHours("KBU27-0042"));
    expect(await getRental(rental.id)).toEqual(rental);
  });

  it("returns 400 naming the bad field", async () => {
    const res = await post(JSON.stringify({ ...body, customer: { name: "Bau AG" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("customer.email");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await post("{not json");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/rentals", () => {
  it("lists a created rental", async () => {
    const created = await (await post(JSON.stringify(body))).json();
    const ids = (await (await GET()).json()).map((r: { id: string }) => r.id);
    expect(ids).toContain(created.id);
  });
});
