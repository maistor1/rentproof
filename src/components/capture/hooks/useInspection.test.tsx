// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useInspection } from "@/components/capture/hooks/useInspection";
import { makeReport, sampleRental } from "@/test/fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/client/inspectApi", () => ({ runInspection: vi.fn() }));
vi.mock("@/lib/client/rentalsApi", () => ({ recordReturn: vi.fn() }));

const { runInspection } = await import("@/lib/client/inspectApi");
const { recordReturn } = await import("@/lib/client/rentalsApi");

async function run() {
  const dispatch = vi.fn();
  const { result } = renderHook(() => useInspection({ rentalId: "R-1001", round: 0, dispatch }));
  await act(async () => {
    result.current.run();
    await vi.waitFor(() => expect(dispatch.mock.calls.length).toBeGreaterThan(1));
  });
  return dispatch;
}

describe("useInspection", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(runInspection).mockReset();
    vi.mocked(recordReturn).mockReset();
  });

  it("records the return before the damage check", async () => {
    const order: string[] = [];
    vi.mocked(recordReturn).mockImplementation(async () => {
      order.push("return");
      return { ok: true, value: sampleRental() };
    });
    vi.mocked(runInspection).mockImplementation(async () => {
      order.push("inspect");
      return { ok: true, value: makeReport({ retakeSlots: [] }) };
    });
    const dispatch = vi.fn();
    const { result } = renderHook(() => useInspection({ rentalId: "R-1001", round: 0, dispatch }));
    await act(async () => {
      result.current.run();
      await vi.waitFor(() => expect(push).toHaveBeenCalled());
    });
    expect(order).toEqual(["return", "inspect"]);
    expect(vi.mocked(recordReturn).mock.calls[0][0]).toBe("R-1001");
  });

  it("stops with the error when the return can't be recorded", async () => {
    vi.mocked(recordReturn).mockResolvedValue({ ok: false, error: { kind: "network", message: "No connection." } });
    const dispatch = await run();
    expect(runInspection).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenLastCalledWith({ type: "inspectionFailed", error: "No connection." });
  });
});
