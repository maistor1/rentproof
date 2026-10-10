"use client";

import { useRef, useState, type SyntheticEvent } from "react";
import type { CameraControl } from "@/components/capture/cameraControl";
import { useCameraStream, useCameraSupport, type CameraState } from "@/components/capture/hooks/useCameraStream";
import { captureVideoFrame } from "@/lib/image/canvasJpeg";

export const DEFAULT_ASPECT = 4 / 3;
export const CAMERA_NOT_READY = "The camera wasn't ready. Try again.";

interface GhostCameraInput {
  onCaptured: (blob: Blob) => void;
  onError: (message: string) => void;
}

export interface GhostCameraApi {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  camera: CameraState;
  aspect: number;
  onReferenceLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  control: CameraControl;
}

function controlLabel(camera: CameraState, busy: boolean): Omit<CameraControl, "trigger"> {
  if (camera.status === "starting") return { label: "Starting camera…", disabled: true };
  if (camera.status === "needsTap") return { label: "Start camera", disabled: false };
  return { label: "Take photo", disabled: busy };
}

// Live camera with the check-out photo as a ghost overlay. The frame is cropped
// to the overlay's aspect so the saved photo is exactly what was lined up.
export function useGhostCamera({ onCaptured, onError }: GhostCameraInput): GhostCameraApi {
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const support = useCameraSupport();
  const camera = useCameraStream(videoRef, support);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [busy, setBusy] = useState(false);

  const trigger = () => {
    if (camera.status === "fallback") return inputRef.current?.click();
    if (camera.status === "needsTap") return camera.resume();
    const video = videoRef.current;
    if (camera.status !== "live" || busy || !video) return;
    setBusy(true);
    captureVideoFrame(video, aspect)
      .then(onCaptured, () => onError(CAMERA_NOT_READY))
      .finally(() => setBusy(false));
  };

  const onReferenceLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) setAspect(naturalWidth / naturalHeight);
  };

  return { videoRef, inputRef, camera, aspect, onReferenceLoad, control: { ...controlLabel(camera, busy), trigger } };
}
