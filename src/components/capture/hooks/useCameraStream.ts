"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import {
  classifyCameraError,
  detectCameraSupport,
  readCameraEnv,
  type CameraFallbackReason,
  type CameraSupport,
} from "@/lib/camera/cameraSupport";
import { attachStream, openCameraStream, stopStream } from "@/lib/camera/cameraStream";

export type CameraState =
  | { status: "starting" }
  | { status: "live" }
  | { status: "needsTap" }
  | { status: "fallback"; reason: CameraFallbackReason };

// After this many unexpected stops we give up on the live view.
export const MAX_RESTARTS = 2;

const noopSubscribe = () => () => {};

// "pending" on the server, so there's no hydration mismatch.
export function useCameraSupport(): CameraSupport {
  return useSyncExternalStore(noopSubscribe, () => detectCameraSupport(readCameraEnv()), () => "pending");
}

export function useCameraStream(
  videoRef: RefObject<HTMLVideoElement | null>,
  support: CameraSupport,
): CameraState & { resume: () => void } {
  const [state, setState] = useState<CameraState>({ status: "starting" });
  const [attempt, setAttempt] = useState(0); // bumped to reopen the stream
  const [stops, setStops] = useState(0);
  const exhausted = stops > MAX_RESTARTS;

  useEffect(() => {
    const video = videoRef.current;
    if (support !== "supported" || exhausted || !video) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    const onEnded = () => {
      if (cancelled) return;
      setStops((n) => n + 1);
      setState({ status: "starting" });
      setAttempt((n) => n + 1);
    };
    // iOS kills camera tracks in the background; reopen on return.
    // track.stop() doesn't fire "ended", so this doesn't count as a failure.
    const onVisibility = () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") {
        stopStream(stream);
        stream = null;
        return;
      }
      setState({ status: "starting" });
      setAttempt((n) => n + 1);
    };

    openCameraStream()
      .then(async (s) => {
        // StrictMode mounts twice: stop the stream the first mount opened.
        if (cancelled) return stopStream(s);
        stream = s;
        s.getVideoTracks().forEach((t) => t.addEventListener("ended", onEnded));
        const result = await attachStream(video, s);
        if (!cancelled) setState({ status: result === "playing" ? "live" : "needsTap" });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "fallback", reason: classifyCameraError(error) });
      });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      stream?.getVideoTracks().forEach((t) => t.removeEventListener("ended", onEnded));
      stopStream(stream);
      video.srcObject = null;
    };
  }, [videoRef, support, exhausted, attempt]);

  const resume = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(
      () => setState({ status: "live" }),
      (error: unknown) => setState({ status: "fallback", reason: classifyCameraError(error) }),
    );
  }, [videoRef]);

  if (support === "pending") return { status: "starting", resume };
  if (support !== "supported") return { status: "fallback", reason: support, resume };
  if (exhausted) return { status: "fallback", reason: "stopped", resume };
  return { ...state, resume };
}
