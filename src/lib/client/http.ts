import { friendlyHttpError, friendlyTransportError, type ApiContext } from "@/lib/client/errors";
import { err, ok, type Result } from "@/lib/client/result";

export interface RequestOptions<T> {
  context: ApiContext;
  timeoutMs: number;
  parse: (body: unknown) => T | null; // shape check at the boundary
  signal?: AbortSignal;
}

const TIMEOUT = "timeout";

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

// fetch that never throws: every outcome is a Result with a friendly message.
export async function requestJson<T>(url: string, init: RequestInit, opts: RequestOptions<T>): Promise<Result<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(TIMEOUT), opts.timeoutMs);
  const onCallerAbort = () => controller.abort("cancelled");
  opts.signal?.addEventListener("abort", onCallerAbort);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const body = await readJson(res);
    if (!res.ok) return err({ ...friendlyHttpError(opts.context, res.status), body });
    const value = body === undefined ? null : opts.parse(body);
    return value === null ? err(friendlyTransportError(opts.context, "invalid_response")) : ok(value);
  } catch {
    if (!controller.signal.aborted) return err(friendlyTransportError(opts.context, "network"));
    const kind = controller.signal.reason === TIMEOUT ? "timeout" : "cancelled";
    return err(friendlyTransportError(opts.context, kind));
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onCallerAbort);
  }
}
