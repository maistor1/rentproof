// Browser-only getUserMedia wrapper. Lifecycle logic is in useCameraStream.

export const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  // `ideal`, not `exact`: laptops and some Androids only have a front camera.
  video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, aspectRatio: { ideal: 4 / 3 } },
  audio: false,
};

export function openCameraStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
}

export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export type AttachResult = "playing" | "needsTap";

// iOS Low Power Mode blocks muted autoplay; the worker then taps to start.
export async function attachStream(video: HTMLVideoElement, stream: MediaStream): Promise<AttachResult> {
  video.srcObject = stream;
  try {
    await video.play();
    return "playing";
  } catch (error) {
    if (error instanceof Error && error.name === "NotAllowedError") return "needsTap";
    // AbortError: a newer load() interrupted this one. The stream still plays.
    if (error instanceof Error && error.name === "AbortError") return "playing";
    throw error;
  }
}
