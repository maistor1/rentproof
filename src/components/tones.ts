import type { Tone } from "@/lib/capture/flowTypes";

// One mapping from slot state to colour, used by every progress indicator so
// yellow always means "now", green "done" and red "needs attention".

export const SEGMENT_CLASS: Record<Tone, string> = {
  current: "bg-action animate-slot-pulse",
  done: "bg-done",
  uploading: "bg-zinc-400",
  problem: "bg-problem",
  empty: "bg-zinc-200",
};

export const THUMB_BORDER: Record<Tone, string> = {
  current: "border-action",
  done: "border-done",
  uploading: "border-zinc-300",
  problem: "border-problem",
  empty: "border-dashed border-zinc-300",
};

export const TONE_LABEL: Record<Tone, string> = {
  current: "Now",
  done: "Saved",
  uploading: "Uploading",
  problem: "Needs a retake",
  empty: "Not taken",
};
