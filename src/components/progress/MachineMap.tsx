import type { Tone } from "@/lib/capture/flowTypes";
import { slotLabel } from "@/lib/slots";
import { SLOTS, type Slot } from "@/lib/types";

// Top-down excavator, front (bucket) at the top. Shows the worker where to
// stand next. Decorative for screen readers: SlotProgress carries the text.
const MARKERS: Record<Slot, { cx: number; cy: number }> = {
  attachment: { cx: 60, cy: 11 },
  front: { cx: 60, cy: 40 },
  operator_cab: { cx: 44, cy: 78 },
  left_side: { cx: 12, cy: 96 },
  right_side: { cx: 108, cy: 96 },
  rear: { cx: 60, cy: 150 },
};

const MARKER_FILL: Record<Tone, string> = {
  current: "fill-action animate-slot-pulse",
  done: "fill-done",
  uploading: "fill-zinc-400",
  problem: "fill-problem",
  empty: "fill-white",
};

function Marker({ slot, tone }: { slot: Slot; tone: Tone }) {
  const { cx, cy } = MARKERS[slot];
  return (
    <g data-slot={slot} data-tone={tone}>
      <title>{slotLabel(slot)}</title>
      <circle
        key={tone}
        cx={cx}
        cy={cy}
        r={tone === "current" ? 9 : 7}
        className={`${MARKER_FILL[tone]} stroke-zinc-900`}
        strokeWidth={1.5}
      />
      {tone === "done" && (
        <path d={`M${cx - 3.5} ${cy}l2.5 2.5l4.5-5`} className="stroke-white" strokeWidth={2} fill="none" />
      )}
      {tone === "problem" && (
        <path d={`M${cx} ${cy - 4}v4.5M${cx} ${cy + 3}v0.5`} className="stroke-white" strokeWidth={2} />
      )}
    </g>
  );
}

interface MachineMapProps {
  tones: Readonly<Record<Slot, Tone>>;
  className?: string;
}

export function MachineMap({ tones, className = "w-16" }: MachineMapProps) {
  return (
    <svg viewBox="0 0 120 162" className={className} aria-hidden="true">
      <g className="fill-zinc-200 stroke-zinc-500" strokeWidth={1.5}>
        <rect x={18} y={48} width={14} height={100} rx={4} />
        <rect x={88} y={48} width={14} height={100} rx={4} />
        <rect x={30} y={56} width={60} height={84} rx={8} />
        <rect x={34} y={64} width={22} height={28} rx={3} className="fill-zinc-300" />
        <rect x={55} y={16} width={10} height={44} rx={3} />
        <rect x={46} y={4} width={28} height={14} rx={3} />
      </g>
      {SLOTS.map((slot) => (
        <Marker key={slot} slot={slot} tone={tones[slot]} />
      ))}
    </svg>
  );
}
