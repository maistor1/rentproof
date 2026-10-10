// Pure camera capability logic. Stream I/O lives in cameraStream.ts.

export interface CameraEnv {
  isSecureContext: boolean;
  hasGetUserMedia: boolean;
}

export type CameraSupport = "pending" | "supported" | "insecure" | "unsupported";

export type CameraFallbackReason =
  | "insecure"
  | "unsupported"
  | "denied"
  | "notFound"
  | "inUse"
  | "stopped"
  | "unknown";

export function readCameraEnv(): CameraEnv {
  return {
    isSecureContext: window.isSecureContext,
    hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
  };
}

export function detectCameraSupport(env: CameraEnv): Exclude<CameraSupport, "pending"> {
  if (!env.isSecureContext) return "insecure";
  if (!env.hasGetUserMedia) return "unsupported";
  return "supported";
}

const ERROR_REASONS: Record<string, CameraFallbackReason> = {
  NotAllowedError: "denied",
  SecurityError: "denied",
  NotFoundError: "notFound",
  OverconstrainedError: "notFound",
  NotReadableError: "inUse",
  AbortError: "inUse",
};

export function classifyCameraError(error: unknown): CameraFallbackReason {
  const name = error instanceof Error ? error.name : "";
  return ERROR_REASONS[name] ?? "unknown";
}

const MESSAGES: Record<CameraFallbackReason, string> = {
  insecure: "The live guide needs a secure connection. Use the camera app below.",
  unsupported: "This browser can't show the live camera. Use the camera app below.",
  denied: "Camera access is blocked. You can still take the photo with the camera app.",
  notFound: "No rear camera found. Use the camera app below.",
  inUse: "Another app is using the camera. Close it, or use the camera app below.",
  stopped: "The camera keeps stopping. Use the camera app below.",
  unknown: "The live camera didn't start. Use the camera app below.",
};

export function fallbackMessage(reason: CameraFallbackReason): string {
  return MESSAGES[reason];
}
