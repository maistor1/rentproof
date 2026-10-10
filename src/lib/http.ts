// Errors the API reports to the caller as { error } with a status code.
// Anything else is a bug and surfaces as a 500.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const jsonError = (status: number, message: string) =>
  Response.json({ error: message }, { status });

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return jsonError(e.status, e.message);
  throw e;
}
