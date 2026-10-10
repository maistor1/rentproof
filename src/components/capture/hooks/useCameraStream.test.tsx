// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_RESTARTS, useCameraStream } from "@/components/capture/hooks/useCameraStream";
import type { CameraSupport } from "@/lib/camera/cameraSupport";

vi.mock("@/lib/camera/cameraStream", () => ({
  openCameraStream: vi.fn(),
  attachStream: vi.fn(),
  stopStream: (s: { getTracks(): { stop(): void }[] } | null) => s?.getTracks().forEach((t) => t.stop()),
}));

const cameraStream = await import("@/lib/camera/cameraStream");
const open = vi.mocked(cameraStream.openCameraStream);
const attach = vi.mocked(cameraStream.attachStream);

class FakeTrack extends EventTarget {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

function fakeStream() {
  const track = new FakeTrack();
  return { track, stream: { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream };
}

function Probe({ support }: { support: CameraSupport }) {
  const ref = useRef<HTMLVideoElement>(null);
  const camera = useCameraStream(ref, support);
  return (
    <>
      <video ref={ref} />
      <output>{camera.status === "fallback" ? `fallback:${camera.reason}` : camera.status}</output>
      <button onClick={camera.resume}>resume</button>
    </>
  );
}

const flush = () => act(async () => {});

beforeEach(() => {
  attach.mockResolvedValue("playing");
});

afterEach(() => {
  open.mockReset();
  attach.mockReset();
});

describe("useCameraStream", () => {
  it("goes live once the stream plays", async () => {
    open.mockResolvedValue(fakeStream().stream);
    render(<Probe support="supported" />);
    expect(screen.getByRole("status")).toHaveTextContent("starting");
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("live");
  });

  it("stops the camera on unmount", async () => {
    const { stream, track } = fakeStream();
    open.mockResolvedValue(stream);
    const { unmount } = render(<Probe support="supported" />);
    await flush();
    unmount();
    expect(track.stopped).toBe(true);
  });

  it("stops the stream an aborted StrictMode mount opened", async () => {
    const first = fakeStream();
    const second = fakeStream();
    open.mockResolvedValueOnce(first.stream).mockResolvedValueOnce(second.stream);
    render(
      <StrictMode>
        <Probe support="supported" />
      </StrictMode>,
    );
    await flush();
    expect(first.track.stopped).toBe(true);
    expect(second.track.stopped).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("live");
  });

  it("falls back when permission is denied", async () => {
    open.mockRejectedValue(Object.assign(new Error("no"), { name: "NotAllowedError" }));
    render(<Probe support="supported" />);
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("fallback:denied");
  });

  it("falls back without asking when the page isn't secure", () => {
    render(<Probe support="insecure" />);
    expect(screen.getByRole("status")).toHaveTextContent("fallback:insecure");
    expect(open).not.toHaveBeenCalled();
  });

  it("waits for a tap when autoplay is blocked, then plays", async () => {
    open.mockResolvedValue(fakeStream().stream);
    attach.mockResolvedValue("needsTap");
    render(<Probe support="supported" />);
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("needsTap");
    await act(async () => screen.getByText("resume").click());
    expect(screen.getByRole("status")).toHaveTextContent("live");
  });

  it("reopens after the track ends, then gives up", async () => {
    const streams = Array.from({ length: MAX_RESTARTS + 2 }, fakeStream);
    streams.forEach((s) => open.mockResolvedValueOnce(s.stream));
    render(<Probe support="supported" />);
    for (let i = 0; i <= MAX_RESTARTS; i++) {
      await flush();
      await act(async () => streams[i].track.dispatchEvent(new Event("ended")));
    }
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent("fallback:stopped");
    expect(open).toHaveBeenCalledTimes(MAX_RESTARTS + 1);
  });

  it("stops while hidden and reopens when visible", async () => {
    const first = fakeStream();
    open.mockResolvedValueOnce(first.stream).mockResolvedValueOnce(fakeStream().stream);
    render(<Probe support="supported" />);
    await flush();
    const visibility = vi.spyOn(document, "visibilityState", "get");
    visibility.mockReturnValue("hidden");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(first.track.stopped).toBe(true);
    visibility.mockReturnValue("visible");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    await flush();
    expect(open).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent("live");
  });
});
