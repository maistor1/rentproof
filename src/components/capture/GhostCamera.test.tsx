// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GhostCamera } from "@/components/capture/GhostCamera";
import { CAMERA_NOT_READY, useGhostCamera } from "@/components/capture/hooks/useGhostCamera";

vi.mock("@/lib/camera/cameraSupport", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/camera/cameraSupport")>()),
  // Plain HTTP on the LAN: no live camera allowed.
  readCameraEnv: () => ({ isSecureContext: false, hasGetUserMedia: true }),
}));
vi.mock("@/lib/camera/cameraStream", () => ({ openCameraStream: vi.fn(), attachStream: vi.fn(), stopStream: vi.fn() }));
vi.mock("@/lib/image/canvasJpeg", () => ({ captureVideoFrame: vi.fn() }));

const { openCameraStream } = await import("@/lib/camera/cameraStream");

function Harness({ onCaptured, onError }: { onCaptured: (b: Blob) => void; onError: (m: string) => void }) {
  const { videoRef, inputRef, camera, aspect, onReferenceLoad, control } = useGhostCamera({ onCaptured, onError });
  return (
    <>
      <GhostCamera
        videoRef={videoRef}
        inputRef={inputRef}
        camera={camera}
        aspect={aspect}
        onReferenceLoad={onReferenceLoad}
        referenceUrl="/api/photos/C-front"
        slotLabel="Front"
        onCaptured={onCaptured}
        onInvalid={onError}
      />
      <button onClick={control.trigger} disabled={control.disabled}>
        {control.label}
      </button>
    </>
  );
}

describe("GhostCamera fallback", () => {
  it("shows the reference photo and opens the camera app instead of the live view", async () => {
    const onCaptured = vi.fn();
    render(<Harness onCaptured={onCaptured} onError={vi.fn()} />);

    expect(screen.getByTestId("camera-fallback")).toBeInTheDocument();
    expect(screen.getByText(/needs a secure connection/)).toBeInTheDocument();
    expect(screen.getByAltText("Check-out photo: Front")).toHaveAttribute("src", "/api/photos/C-front");
    expect(openCameraStream).not.toHaveBeenCalled();

    const input = screen.getByLabelText("Camera");
    const click = vi.spyOn(input, "click");
    await userEvent.click(screen.getByRole("button", { name: "Take photo" }));
    expect(click).toHaveBeenCalledOnce();

    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, file);
    expect(onCaptured).toHaveBeenCalledWith(file);
  });

  it("keeps capture working when the reference photo is missing", () => {
    render(<Harness onCaptured={vi.fn()} onError={vi.fn()} />);
    fireEvent.error(screen.getByAltText("Check-out photo: Front"));
    expect(screen.getByText("Reference photo unavailable.")).toBeInTheDocument();
    expect(screen.getByLabelText("Camera")).toBeInTheDocument();
  });

  it("exports a friendly not-ready message", () => {
    expect(CAMERA_NOT_READY).toMatch(/Try again/);
  });
});
