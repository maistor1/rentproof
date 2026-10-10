// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EvidenceView } from "@/components/evidence/EvidenceView";
import { buildInvoice } from "@/lib/pricing";
import { allPhotos, makeRental, makeReport, sampleReport } from "@/test/fixtures";

const rental = makeRental({
  status: "inspected",
  returnAt: "2026-10-10T16:00:00.000Z",
  hourMeterAtReturn: 1278,
  photos: { checkout: allPhotos("C"), return: allPhotos("R") },
});

describe("EvidenceView", () => {
  it("shows one block per charged finding with its photos and price", () => {
    const report = sampleReport();
    render(<EvidenceView report={report} rental={rental} invoice={buildInvoice(rental, report)} />);

    const blocks = screen.getAllByTestId(/^evidence-F/);
    expect(blocks.map((b) => b.dataset.testid)).toEqual(["evidence-F-auto", "evidence-F-confirmed"]);
    const crack = within(screen.getByTestId("evidence-F-confirmed"));
    expect(crack.getByText("Crack (severe)")).toBeInTheDocument();
    expect(crack.getByRole("img", { name: /before/i })).toHaveAttribute("src", "/api/photos/C-rear");
    expect(crack.getByRole("img", { name: /after/i })).toHaveAttribute("src", "/api/photos/R-rear");
    expect(crack.getByText("€950.00")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-total")).toHaveTextContent("€995.00");
  });

  it("names the rental, the machine and the hours used", () => {
    const report = sampleReport();
    render(<EvidenceView report={report} rental={rental} invoice={buildInvoice(rental, report)} />);
    expect(screen.getByRole("heading", { level: 1, name: "Damage evidence" })).toBeInTheDocument();
    expect(screen.getByText(/DEMO0301707/)).toBeInTheDocument();
    expect(screen.getByText("Nordbau GmbH")).toBeInTheDocument();
    expect(screen.getByText("+37.5 h used")).toBeInTheDocument();
  });

  it("lists what was checked and not charged, but never hidden findings", () => {
    const report = sampleReport();
    render(<EvidenceView report={report} rental={rental} invoice={buildInvoice(rental, report)} />);
    expect(screen.getByText(/Staff decided not to charge/)).toBeInTheDocument();
    expect(screen.queryByTestId("evidence-F-hidden")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-F-review")).not.toBeInTheDocument();
  });

  it("says so when there is nothing to charge", () => {
    const report = makeReport();
    render(<EvidenceView report={report} rental={rental} invoice={buildInvoice(rental, report)} />);
    expect(screen.getByText("No new damage found")).toBeInTheDocument();
    expect(screen.queryByTestId("evidence-total")).not.toBeInTheDocument();
  });

  it("prints to PDF from the browser", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    const report = makeReport();
    render(<EvidenceView report={report} rental={rental} invoice={buildInvoice(rental, report)} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Download PDF" }));
    expect(print).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
