"use client";

import { PhotoThumb } from "@/components/ui/PhotoThumb";
import type { Tone } from "@/lib/capture/flowTypes";
import { slotLabel } from "@/lib/slots";
import type { Slot } from "@/lib/types";

export interface GridItem {
  slot: Slot;
  src: string | null;
  tone: Tone;
  animKey?: string | null; // changes when a new photo lands, replaying thumb-in
}

interface PhotoGridProps {
  items: readonly GridItem[];
  layout: "strip" | "grid";
  scanning?: boolean;
  onSelect?: (slot: Slot) => void;
}

// "strip" is the row under the viewfinder that accepted photos fly into.
// "grid" is the 3x2 overview on the end and wait screens.
export function PhotoGrid({ items, layout, scanning = false, onSelect }: PhotoGridProps) {
  const strip = layout === "strip";
  return (
    <ul className={strip ? "grid grid-cols-6 gap-1.5" : "grid grid-cols-3 gap-2"}>
      {items.map((item) => {
        const thumb = (
          <PhotoThumb
            key={item.animKey ?? "none"}
            src={item.src}
            alt={slotLabel(item.slot)}
            tone={item.tone}
            animateIn={Boolean(item.animKey)}
            scanning={scanning}
            compact={strip}
          />
        );
        const caption = (
          <span className={strip ? "sr-only" : "mt-1 block text-meta text-zinc-700"}>{slotLabel(item.slot)}</span>
        );
        return (
          <li key={item.slot}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item.slot)}
                className="block w-full text-left focus-visible:outline-2 focus-visible:outline-black"
                aria-label={`${slotLabel(item.slot)}: retake`}
              >
                {thumb}
                {caption}
              </button>
            ) : (
              <>
                {thumb}
                {caption}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
