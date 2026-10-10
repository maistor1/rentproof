// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReturnFlow } from "@/app/return/[rentalId]/ReturnFlow";
import { mockSnapshot } from "@/lib/telematics";
import { SLOTS, type Slot } from "@/lib/types";
import { allPhotos, makeRental, makeReport } from "@/test/fixtures";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/image/canvasJpeg", () => ({
  downscaleToJpeg: vi.fn(async (b: Blob) => b),
  captureVideoFrame: vi.fn(async () => new Blob(["frame"], { type: "image/jpeg" })),
}));
vi.mock("@/lib/camera/cameraStream", () => ({
  openCameraStream: vi.fn(async () => ({ getTracks: () => [], getVideoTracks: () => [] })),
  attachStream: vi.fn(async () => "playing"),
  stopStream: vi.fn(),
}));
vi.mock("@/lib/camera/cameraSupport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/camera/cameraSupport")>()),
  readCameraEnv: () => ({ isSecureContext: true, hasGetUserMedia: true }),
}));
vi.mock("@/lib/client/photosApi", () => ({ uploadPhoto: vi.fn() }));
vi.mock("@/lib/client/inspectApi", () => ({ runInspection: vi.fn() }));
vi.mock("@/lib/client/rentalsApi", () => ({ recordReturn: vi.fn() }));

const { uploadPhoto } = await import("@/lib/client/photosApi");
const { runInspection } = await import("@/lib/client/inspectApi");
const { recordReturn } = await import("@/lib/client/rentalsApi");
const upload = vi.mocked(uploadPhoto);
const inspect = vi.mocked(runInspection);

const base = makeRental({ photos: { checkout: allPhotos("C"), return: {} } });
const rental = { ...base, telematics: mockSnapshot(base, 37.5) };
vi.mocked(recordReturn).mockImplementation(async () => ({ ok: true, value: rental }));

async function shootAll(user: ReturnType<typeof userEvent.setup>, slots: readonly Slot[]) {
  for (const slot of slots) {
    const take = await screen.findByRole("button", { name: "Take photo" });
    // The ghost overlay is decorative (alt=""), so query it directly.
    expect(document.querySelector('img[alt=""]')).toHaveAttribute("src", `/api/photos/C-${slot}`);
    await user.click(take);
    await user.click(await screen.findByRole("button", { name: "Use photo" }));
    await act(async () => vi.advanceTimersByTime(600));
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  upload.mockImplementation(async (i) => ({
    ok: true,
    value: { id: `R-${i.slot}`, rentalId: i.rentalId, slot: i.slot, phase: i.phase, path: "", width: 1, height: 1, takenAt: "" },
  }));
});

afterEach(() => {
  vi.useRealTimers();
  push.mockReset();
  inspect.mockReset();
});

describe("ReturnFlow", () => {
  it("lines up each slot with its check-out photo, retakes what the model flags, then opens the report", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ReturnFlow rental={rental} />);
    expect(screen.getByText("Hour meter now")).toBeInTheDocument();
    expect(screen.getByText("+37.5 h used")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start return check" }));
    await shootAll(user, SLOTS);

    const report1 = makeReport({ id: "RPT-1", retakeSlots: ["rear"] });
    const flagged = { ...report1, slots: report1.slots.map((s) => (s.slot === "rear" ? { ...s, retake_reason: "Too dark to compare" } : s)) };
    inspect.mockResolvedValueOnce({ ok: true, value: flagged });
    await user.click(await screen.findByRole("button", { name: "Run damage check" }));

    expect(await screen.findByTestId("retake-reason")).toHaveTextContent("Too dark to compare");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rear");
    await shootAll(user, ["rear"]);

    inspect.mockResolvedValueOnce({ ok: true, value: makeReport({ id: "RPT-2" }) });
    await user.click(await screen.findByRole("button", { name: "Run damage check again" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/report/RPT-2"));
    expect(inspect).toHaveBeenCalledTimes(2);
  });

  it("takes a return photo from the device's files instead of the live camera", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ReturnFlow rental={rental} />);
    await user.click(screen.getByRole("button", { name: "Start return check" }));
    await screen.findByRole("button", { name: "Take photo" });
    await user.click(screen.getByRole("button", { name: "Choose from files" }));
    const files = screen.getByLabelText("Photo from files");
    expect(files).not.toHaveAttribute("capture");
    await user.upload(files, new File(["jpeg"], "front.jpg", { type: "image/jpeg" }));
    expect(screen.getByAltText("Front photo to review")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use photo" }));
    await act(async () => vi.advanceTimersByTime(600));
    expect(upload.mock.calls.map(([i]) => [i.slot, i.phase])).toEqual([["front", "return"]]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rear");
    // The live camera is still there for the next slot.
    expect(screen.getByTestId("live-camera")).toBeInTheDocument();
  });

  it("warns about a picked file that isn't a photo", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, applyAccept: false });
    render(<ReturnFlow rental={rental} />);
    await user.click(screen.getByRole("button", { name: "Start return check" }));
    await screen.findByRole("button", { name: "Take photo" });
    await user.upload(screen.getByLabelText("Photo from files"), new File(["%PDF"], "a.pdf", { type: "application/pdf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("isn't a photo");
  });

  it("shows the wait screen, then a friendly error with a retry", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ReturnFlow rental={{ ...rental, photos: { checkout: allPhotos("C"), return: allPhotos("R") } }} />);
    await user.click(screen.getByRole("button", { name: "Continue (6 of 6 done)" }));

    let finish!: (v: Awaited<ReturnType<typeof runInspection>>) => void;
    inspect.mockReturnValueOnce(new Promise((r) => (finish = r)));
    await user.click(screen.getByRole("button", { name: "Run damage check" }));
    expect(screen.getByRole("heading", { name: "Checking for damage" })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(3000));
    expect(screen.getByText(/0:0[23] · usually 10 to 30 s/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();

    await act(async () =>
      finish({ ok: false, error: { kind: "not_implemented", status: 501, message: "The damage check isn't available yet." } }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The damage check isn't available yet.");

    inspect.mockResolvedValueOnce({ ok: true, value: makeReport({ id: "RPT-7" }) });
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/report/RPT-7"));
  });

  it("re-shoots photos the server never received", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ReturnFlow rental={{ ...rental, photos: { checkout: allPhotos("C"), return: allPhotos("R") } }} />);
    await user.click(screen.getByRole("button", { name: "Continue (6 of 6 done)" }));
    inspect.mockResolvedValueOnce({
      ok: false,
      error: { kind: "bad_request", status: 400, message: "x", missingSlots: ["attachment"] },
    });
    await user.click(screen.getByRole("button", { name: "Run damage check" }));
    expect(await screen.findByTestId("retake-reason")).toHaveTextContent("didn't reach the server");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Attachment");
  });

  it("goes back to the photos from a failed check", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ReturnFlow rental={{ ...rental, photos: { checkout: allPhotos("C"), return: allPhotos("R") } }} />);
    await user.click(screen.getByRole("button", { name: "Continue (6 of 6 done)" }));
    inspect.mockResolvedValueOnce({ ok: false, error: { kind: "server", status: 502, message: "The damage check failed." } });
    await user.click(screen.getByRole("button", { name: "Run damage check" }));
    await user.click(await screen.findByRole("button", { name: "Back to photos" }));
    expect(screen.getByRole("heading", { name: "Ready for damage check" })).toBeInTheDocument();
  });
});
