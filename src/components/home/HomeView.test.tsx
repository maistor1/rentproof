// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeView } from "@/components/home/HomeView";
import { allPhotos, makeRental } from "@/test/fixtures";

describe("HomeView", () => {
  it("shows an empty state with New rental as the one primary action", () => {
    render(<HomeView items={[]} />);
    expect(screen.getByRole("heading", { name: "Rentals" })).toBeInTheDocument();
    expect(screen.getByText(/No rentals yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New rental" })).toHaveAttribute("href", "/rentals/new");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists each rental with its status and next step", () => {
    const fresh = makeRental({ id: "R-new", status: "out", photos: { checkout: {}, return: {} } });
    const done = makeRental({
      id: "R-done",
      status: "inspected",
      machine: { id: "M-1", name: "Wheel loader", model: "Volvo L25", serialNumber: "VL25-9" },
      customer: { name: "Tiefbau KG", email: "t@k.example" },
      photos: { checkout: allPhotos("A"), return: allPhotos("B") },
    });
    render(<HomeView items={[{ rental: fresh }, { rental: done, reportId: "RPT-9" }]} />);

    const cards = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(cards).toHaveLength(2);

    const first = within(cards[0]);
    expect(first.getByText("Check-out photos needed")).toBeInTheDocument();
    expect(first.getByRole("link", { name: "Take check-out photos" })).toHaveAttribute("href", "/checkout/R-new");

    const second = within(cards[1]);
    expect(second.getByRole("heading", { name: "Wheel loader" })).toBeInTheDocument();
    expect(second.getByText(/Tiefbau KG/)).toBeInTheDocument();
    expect(second.getByText(/VL25-9/)).toBeInTheDocument();
    expect(second.getByText("Report ready")).toBeInTheDocument();
    expect(second.getByRole("link", { name: "Open report" })).toHaveAttribute("href", "/report/RPT-9");
    expect(second.getByRole("link", { name: "Customer evidence" })).toHaveAttribute("href", "/evidence/RPT-9");

    expect(screen.getByRole("link", { name: "New rental" })).toBeInTheDocument();
  });
});
