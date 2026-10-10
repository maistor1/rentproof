// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MachineMap } from "@/components/progress/MachineMap";
import { SlotProgress } from "@/components/progress/SlotProgress";
import type { Tone } from "@/lib/capture/flowTypes";
import { SLOTS, type Slot } from "@/lib/types";

const tones = (overrides: Partial<Record<Slot, Tone>>) =>
  Object.fromEntries(SLOTS.map((s) => [s, overrides[s] ?? "empty"])) as Record<Slot, Tone>;

describe("SlotProgress", () => {
  it("shows n of 6 and exposes it as a progress bar", () => {
    const segments = SLOTS.map((slot, i) => ({ slot, tone: (i < 3 ? "done" : i === 3 ? "current" : "empty") as Tone }));
    const { container } = render(<SlotProgress segments={segments} count={3} />);
    expect(screen.getByText("3 of 6 photos")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Photos taken" });
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    expect(bar).toHaveAttribute("aria-valuemax", "6");
    const current = container.querySelector('[data-tone="current"]');
    expect(current).toHaveClass("bg-action", "animate-slot-pulse");
    expect(container.querySelectorAll('[data-tone="done"]')).toHaveLength(3);
  });
});

describe("MachineMap", () => {
  it("draws one marker per slot with its tone", () => {
    const { container } = render(<MachineMap tones={tones({ front: "done", rear: "current", attachment: "problem" })} />);
    expect(container.querySelectorAll("[data-slot]")).toHaveLength(6);
    expect(container.querySelector('[data-slot="front"]')).toHaveAttribute("data-tone", "done");
    expect(container.querySelector('[data-slot="rear"] circle')).toHaveClass("fill-action");
    expect(container.querySelector('[data-slot="attachment"] circle')).toHaveClass("fill-problem");
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
