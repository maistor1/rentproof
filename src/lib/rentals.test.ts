import { describe, expect, it } from "vitest";
import { DEMO_HOURS_USED, createRental, recordReturn } from "@/lib/rentals";
import { getRental, updateRental } from "@/lib/storage";
import { mockCheckoutHours } from "@/lib/telematics";
import { withTempDataDir } from "@/test/tempData";

withTempDataDir();

describe("recordReturn", () => {
  it("attaches an ISO 15143-3 snapshot and marks the rental returned", async () => {
    const r = await recordReturn("R-1001");
    expect(r.status).toBe("returned");
    expect(r.hourMeterAtReturn).toBe(1240.5 + DEMO_HOURS_USED);
    expect(r.telematics?.CumulativeOperatingHours.Hour).toBe(r.hourMeterAtReturn);
    expect(r.returnAt).toBe(r.telematics?.CumulativeOperatingHours.datetime);
    expect(await getRental("R-1001")).toEqual(r);
  });

  it("uses hoursUsed when given", async () => {
    expect((await recordReturn("R-1001", 2)).hourMeterAtReturn).toBe(1242.5);
  });

  it("is idempotent: a second tap changes nothing", async () => {
    const first = await recordReturn("R-1001");
    const second = await recordReturn("R-1001", 99);
    expect(second).toEqual(first);
  });

  it("handles two taps racing each other", async () => {
    const [a, b] = await Promise.all([recordReturn("R-1001"), recordReturn("R-1001")]);
    expect(a.hourMeterAtReturn).toBe(1240.5 + DEMO_HOURS_USED);
    expect(b).toEqual(a);
  });

  it.each([-5, "lots"])("rejects hoursUsed %s with 400", async (bad) => {
    await expect(recordReturn("R-1001", bad)).rejects.toMatchObject({ status: 400 });
  });

  it("still records the hours if the rental was inspected before the return", async () => {
    await updateRental("R-1001", (r) => {
      r.status = "inspected";
    });
    const r = await recordReturn("R-1001");
    expect(r.hourMeterAtReturn).toBe(1240.5 + DEMO_HOURS_USED);
    expect(r.telematics).not.toBeNull();
    expect(r.status).toBe("inspected");
  });

  it("returns 404 for an unknown rental", async () => {
    await expect(recordReturn("R-nope")).rejects.toMatchObject({ status: 404 });
  });
});

const input = () => ({
  machine: { name: " Mini excavator ", model: "Kubota U27-4", serialNumber: "KBU27-0042" },
  customer: { name: "Bau AG", email: "yard@bau.example" },
});

describe("createRental", () => {
  it("creates an out rental with check-out hours from telematics", async () => {
    const r = await createRental(input());
    expect(r.id).toMatch(/^R-[a-z0-9]{8}$/);
    expect(r.machine).toEqual({
      id: expect.stringMatching(/^M-/),
      name: "Mini excavator",
      model: "Kubota U27-4",
      serialNumber: "KBU27-0042",
    });
    expect(r.customer).toEqual({ name: "Bau AG", email: "yard@bau.example" });
    expect(r.status).toBe("out");
    expect(r.hourMeterAtCheckout).toBe(mockCheckoutHours("KBU27-0042"));
    expect(r.hourMeterAtReturn).toBeNull();
    expect(r.photos).toEqual({ checkout: {}, return: {} });
    expect(await getRental(r.id)).toEqual(r);
  });

  it.each([
    ["machine.name", { machine: { ...input().machine, name: "  " } }],
    ["machine.model", { machine: { ...input().machine, model: undefined } }],
    ["machine.serialNumber", { machine: { ...input().machine, serialNumber: 7 } }],
    ["customer.name", { customer: { ...input().customer, name: "" } }],
    ["customer.email", { customer: { ...input().customer, email: "not-an-email" } }],
    ["machine.name", { machine: { ...input().machine, name: "x".repeat(121) } }],
  ])("rejects a bad %s with 400", async (field, over) => {
    await expect(createRental({ ...input(), ...over })).rejects.toMatchObject({
      status: 400,
      message: expect.stringContaining(field),
    });
  });

  it.each([null, "text", { machine: null }])("rejects body %j with 400", async (bad) => {
    await expect(createRental(bad)).rejects.toMatchObject({ status: 400 });
  });
});
