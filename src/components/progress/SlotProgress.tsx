import { SEGMENT_CLASS } from "@/components/tones";
import type { Segment } from "@/lib/capture/flowSelectors";
import { slotLabel } from "@/lib/slots";

interface SlotProgressProps {
  segments: readonly Segment[];
  count: number;
}

// Always visible on capture screens: six segments and "n of 6".
export function SlotProgress({ segments, count }: SlotProgressProps) {
  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label="Photos taken"
        aria-valuemin={0}
        aria-valuemax={segments.length}
        aria-valuenow={count}
        className="flex gap-1"
      >
        {segments.map(({ slot, tone }) => (
          // Keyed by tone so the pulse replays only when a segment becomes current.
          <span
            key={`${slot}-${tone}`}
            data-tone={tone}
            title={slotLabel(slot)}
            className={`h-2.5 flex-1 rounded-full ${SEGMENT_CLASS[tone]}`}
          />
        ))}
      </div>
      <span className="text-meta text-zinc-700">
        {count} of {segments.length} photos
      </span>
    </div>
  );
}
