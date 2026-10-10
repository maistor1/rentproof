import { describe, expect, it } from "vitest";
import { createInitialFlowState } from "@/lib/capture/initialState";
import { SLOTS } from "@/lib/types";

const toUrl = (id: string) => `/api/photos/${id}`;

describe("createInitialFlowState", () => {
  it("starts on the intro with every slot empty", () => {
    const s = createInitialFlowState({ phase: "checkout", savedPhotos: {}, toUrl });
    expect(s.step).toBe("intro");
    expect(s.queue).toEqual(SLOTS);
    expect(s.current).toBe("front");
    expect(Object.values(s.slots).every((slot) => slot.status === "empty")).toBe(true);
    expect(s.inspection).toEqual({ status: "idle", error: null, round: 1, startedAt: null });
  });

  it("resumes saved photos as done with their served URL", () => {
    const s = createInitialFlowState({ phase: "return", savedPhotos: { front: "P1" }, toUrl });
    expect(s.slots.front).toEqual({
      status: "done",
      previewUrl: "/api/photos/P1",
      photoId: "P1",
      uploadId: null,
      error: null,
      retakeReason: null,
    });
    expect(s.current).toBe("rear");
    expect(s.phase).toBe("return");
  });
});
