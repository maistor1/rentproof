import type { Slot } from "@/lib/types";

export type AppErrorKind =
  | "not_implemented"
  | "bad_request"
  | "not_found"
  | "server"
  | "network"
  | "timeout"
  | "cancelled"
  | "invalid_response";

export interface AppError {
  kind: AppErrorKind;
  message: string; // safe to show to the worker
  status?: number;
  body?: unknown; // parsed error body, for callers that need details
  missingSlots?: Slot[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: AppError): Result<T> {
  return { ok: false, error };
}
