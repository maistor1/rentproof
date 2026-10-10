// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhotoGrid } from "@/components/ui/PhotoGrid";
import { PhotoThumb } from "@/components/ui/PhotoThumb";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

describe("PrimaryButton", () => {
  it("renders the accent button and calls back", async () => {
    const onClick = vi.fn();
    render(<PrimaryButton label="Take photo" onClick={onClick} />);
    const button = screen.getByRole("button", { name: "Take photo" });
    expect(button).toHaveClass("bg-action", "h-14");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("goes neutral and inert when disabled", () => {
    render(<PrimaryButton label="Uploading…" disabled busy />);
    const button = screen.getByRole("button", { name: "Uploading…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).not.toHaveClass("bg-action");
  });

  it("renders a link when given an href", () => {
    render(<PrimaryButton label="Back to rentals" href="/" />);
    expect(screen.getByRole("link", { name: "Back to rentals" })).toHaveAttribute("href", "/");
  });
});

describe("PhotoThumb", () => {
  it("shows a skeleton until the photo loads", () => {
    const { container } = render(<PhotoThumb src="/p/1" alt="Front" tone="done" />);
    expect(container.querySelector(".bg-zinc-100")).not.toBeNull();
    fireEvent.load(screen.getByAltText("Front"));
    expect(container.querySelector(".bg-zinc-100")).toBeNull();
  });

  it("says so when a photo can't load", () => {
    render(<PhotoThumb src="/p/missing" alt="Front" tone="done" />);
    fireEvent.error(screen.getByAltText("Front"));
    expect(screen.getByText("Photo unavailable")).toBeInTheDocument();
  });

  it("labels upload and scan states in text, not only motion", () => {
    const { rerender } = render(<PhotoThumb src="/p/1" alt="Front" tone="uploading" />);
    expect(screen.getAllByText("Uploading").length).toBeGreaterThan(0);
    rerender(<PhotoThumb src="/p/1" alt="Front" tone="done" scanning />);
    expect(screen.getByText("Checking")).toBeInTheDocument();
  });
});

describe("PhotoGrid", () => {
  it("lets the worker pick a slot to retake", async () => {
    const onSelect = vi.fn();
    render(
      <PhotoGrid
        layout="grid"
        onSelect={onSelect}
        items={[
          { slot: "front", src: null, tone: "done" },
          { slot: "rear", src: null, tone: "empty" },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rear: retake" }));
    expect(onSelect).toHaveBeenCalledWith("rear");
    expect(screen.getByText("Front")).toBeInTheDocument();
  });

  it("is read-only without a handler", () => {
    render(<PhotoGrid layout="strip" items={[{ slot: "front", src: null, tone: "empty" }]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
