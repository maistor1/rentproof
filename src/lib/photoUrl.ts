// The one place that knows how photos are served (Boris, RP-5; the smoke test
// expects GET /api/photos/:id to return the JPEG).
export function photoUrl(photoId: string): string {
  return `/api/photos/${encodeURIComponent(photoId)}`;
}
