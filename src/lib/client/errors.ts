import type { AppError } from "@/lib/client/result";

// Messages the worker sees. Server error strings are for developers and stay
// in the error body; nothing here leaks them to the screen.

export type ApiContext = "photoUpload" | "inspection";

const NOT_IMPLEMENTED: Record<ApiContext, string> = {
  photoUpload: "Photo upload isn't available yet. Your photos stay on this screen, retry when it's ready.",
  inspection: "The damage check isn't available yet.",
};

const TIMEOUT: Record<ApiContext, string> = {
  photoUpload: "The upload is taking too long. Try again.",
  inspection: "The damage check is taking too long. Try again.",
};

export function friendlyHttpError(context: ApiContext, status: number): AppError {
  if (status === 501) return { kind: "not_implemented", status, message: NOT_IMPLEMENTED[context] };
  if (status === 404) return { kind: "not_found", status, message: "This rental no longer exists." };
  if (status === 415) {
    return { kind: "bad_request", status, message: "That photo format isn't supported. Take it again with the camera." };
  }
  if (status === 502 && context === "inspection") {
    return { kind: "server", status, message: "The damage check failed. Try again." };
  }
  if (status >= 400 && status < 500) {
    return { kind: "bad_request", status, message: "That didn't look right. Check and try again." };
  }
  return { kind: "server", status, message: "Something went wrong on our side. Try again." };
}

export type TransportFailure = "network" | "timeout" | "cancelled" | "invalid_response";

export function friendlyTransportError(context: ApiContext, kind: TransportFailure): AppError {
  switch (kind) {
    case "network":
      return { kind, message: "No connection. Check Wi-Fi and try again." };
    case "timeout":
      return { kind, message: TIMEOUT[context] };
    case "cancelled":
      return { kind, message: "Cancelled." };
    case "invalid_response":
      return { kind, message: "Unexpected reply from the server. Try again." };
  }
}
