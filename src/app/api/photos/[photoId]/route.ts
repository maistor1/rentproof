import { jsonError } from "@/lib/http";
import { readPhoto } from "@/lib/storage";

// Photo ids never change (a retake gets a new id), so browsers can cache them.
export async function GET(_req: Request, ctx: RouteContext<"/api/photos/[photoId]">) {
  const { photoId } = await ctx.params;
  const jpeg = await readPhoto(photoId);
  if (!jpeg) return jsonError(404, "photo not found");
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
