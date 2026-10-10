// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckoutFlow } from "@/app/checkout/[rentalId]/CheckoutFlow";
import type { Result } from "@/lib/client/result";
import type { Photo } from "@/lib/types";
import { allPhotos, makeRental } from "@/test/fixtures";

vi.mock("@/lib/image/canvasJpeg", () => ({
  downscaleToJpeg: vi.fn(async (b: Blob) => b),
  captureVideoFrame: vi.fn(),
}));
vi.mock("@/lib/client/photosApi", () => ({ uploadPhoto: vi.fn() }));

const { uploadPhoto } = await import("@/lib/client/photosApi");
const upload = vi.mocked(uploadPhoto);
const { downscaleToJpeg } = await import("@/lib/image/canvasJpeg");

function photoFor(input: Parameters<typeof uploadPhoto>[0]): Result<Photo> {
  return {
    ok: true,
    value: {
      id: `P-${input.slot}`,
      rentalId: input.rentalId,
      slot: input.slot,
      phase: input.phase,
      path: "",
      width: 1,
      height: 1,
      takenAt: "",
    },
  };
}

const jpeg = () => new File(["x"], "shot.jpg", { type: "image/jpeg" });

async function shootCurrentSlot(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(screen.getByLabelText("Camera"), jpeg());
  await user.click(screen.getByRole("button", { name: "Use photo" }));
  await act(async () => vi.advanceTimersByTime(600));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  upload.mockImplementation(async (input) => photoFor(input));
});

afterEach(() => {
  vi.useRealTimers();
  upload.mockReset();
});

describe("CheckoutFlow", () => {
  it("walks through six photos to the payoff screen", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutFlow rental={makeRental()} />);
    expect(screen.getByText("Hour meter at check-out")).toBeInTheDocument();
    expect(screen.getByText("1,240.5 h")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Start check-out" }));

    for (const title of ["Front", "Rear", "Left side", "Right side", "Operator cab", "Attachment"]) {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
      await shootCurrentSlot(user);
    }

    expect(await screen.findByRole("heading", { name: "Checked out" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to rentals" })).toHaveAttribute("href", "/");
    expect(screen.getByText("6 of 6 photos")).toBeInTheDocument();
    expect(upload).toHaveBeenCalledTimes(6);
    expect(upload.mock.calls.map(([i]) => i.slot)).toEqual([
      "front",
      "rear",
      "left_side",
      "right_side",
      "operator_cab",
      "attachment",
    ]);
  });

  it("keeps photos and offers a retry while uploads aren't available", async () => {
    upload.mockResolvedValue({
      ok: false,
      error: { kind: "not_implemented", status: 501, message: "Photo upload isn't available yet." },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutFlow rental={makeRental({ photos: { checkout: { ...allPhotos("c"), attachment: undefined }, return: {} } })} />);
    await user.click(screen.getByRole("button", { name: "Continue (5 of 6 done)" }));
    await shootCurrentSlot(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Photo upload isn't available yet.");
    const retry = screen.getByRole("button", { name: "Retry 1 upload" });
    upload.mockImplementation(async (input) => photoFor(input));
    await user.click(retry);
    expect(await screen.findByRole("heading", { name: "Checked out" })).toBeInTheDocument();
  });

  it("lets the worker retake before accepting", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutFlow rental={makeRental()} />);
    await user.click(screen.getByRole("button", { name: "Start check-out" }));
    await user.upload(screen.getByLabelText("Camera"), jpeg());
    expect(screen.getByAltText("Front photo to review")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retake" }));
    expect(screen.queryByAltText("Front photo to review")).toBeNull();
    expect(upload).not.toHaveBeenCalled();
  });

  it("takes a photo from the device's files as well as the camera", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutFlow rental={makeRental()} />);
    await user.click(screen.getByRole("button", { name: "Start check-out" }));
    expect(screen.getByRole("button", { name: "Choose from files" })).toBeInTheDocument();
    const files = screen.getByLabelText("Photo from files");
    // No capture attribute, so phones offer the library, Files and Downloads.
    expect(files).not.toHaveAttribute("capture");
    await user.upload(files, jpeg());
    expect(screen.getByAltText("Front photo to review")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use photo" }));
    await act(async () => vi.advanceTimersByTime(600));
    expect(upload.mock.calls.map(([i]) => i.slot)).toEqual(["front"]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rear");
  });

  it("warns about files that aren't photos", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime, applyAccept: false });
    render(<CheckoutFlow rental={makeRental()} />);
    await user.click(screen.getByRole("button", { name: "Start check-out" }));
    await user.upload(screen.getByLabelText("Camera"), new File(["%PDF"], "a.pdf", { type: "application/pdf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("isn't a photo");
  });

  it("sends the worker back to a photo that can't be read", async () => {
    vi.mocked(downscaleToJpeg).mockRejectedValueOnce(new Error("decode"));
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutFlow rental={makeRental()} />);
    await user.click(screen.getByRole("button", { name: "Start check-out" }));
    await shootCurrentSlot(user);
    expect(await screen.findByTestId("retake-reason")).toHaveTextContent("Couldn't read that photo");
  });

  it("resumes on the end screen when every photo is already saved", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CheckoutFlow rental={makeRental({ photos: { checkout: allPhotos("c"), return: {} } })} />);
    await user.click(screen.getByRole("button", { name: "Continue (6 of 6 done)" }));
    expect(screen.getByRole("heading", { name: "Checked out" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Rear: retake" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rear");
  });
});
