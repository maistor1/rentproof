import { highlightStyle } from "@/lib/report/view";
import { photoUrl } from "@/lib/photoUrl";
import type { Box } from "@/lib/types";

interface PhotoCompareProps {
  beforeId: string | undefined;
  afterId: string | undefined;
  label: string; // slot name, for alt text
  box: Box | null;
}

function Photo({ id, alt, children }: { id: string | undefined; alt: string; children?: React.ReactNode }) {
  return (
    <figure className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-zinc-100">
      {id ? (
        // Served by our own route; next/image adds nothing for these.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl(id)} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-meta text-zinc-700">Photo missing</span>
      )}
      {children}
      <figcaption className="absolute top-1 left-1 rounded bg-white/90 px-1.5 text-meta font-semibold text-zinc-900">
        {alt.split(":")[0]}
      </figcaption>
    </figure>
  );
}

// Before above after, so both stay full width on a phone. The box is
// approximate, so it gets a soft glow rather than a hard outline.
export function PhotoCompare({ beforeId, afterId, label, box }: PhotoCompareProps) {
  const highlight = highlightStyle(box);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Photo id={beforeId} alt={`Before: ${label}`} />
      <Photo id={afterId} alt={`After: ${label}`}>
        {highlight && (
          <span
            data-testid="highlight"
            aria-hidden
            style={highlight}
            className="absolute rounded-lg border-2 border-action/90 bg-action/15 shadow-[0_0_0_4px_rgb(250_204_21/0.35)]"
          />
        )}
      </Photo>
    </div>
  );
}
