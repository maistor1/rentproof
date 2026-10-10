// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { allPhotos, makeRental, makeReport, sampleReport } from "@/test/fixtures";
import type { DamageReport, Invoice, ReviewedFinding } from "@/lib/types";
import { ReportView } from "./ReportView";

vi.mock("@/lib/client/reviewApi", () => ({ reviewFinding: vi.fn(), fetchInvoice: vi.fn() }));
const { reviewFinding, fetchInvoice } = await import("@/lib/client/reviewApi");
const review = vi.mocked(reviewFinding);
const invoiceApi = vi.mocked(fetchInvoice);

const rental = makeRental({
  status: "inspected",
  hourMeterAtReturn: 1278,
  photos: { checkout: allPhotos("C"), return: allPhotos("R") },
});

function invoice(total: number, ids: string[] = []): Invoice {
  return {
    reportId: "I-test",
    rentalId: "R-1001",
    currency: "EUR",
    total,
    lines: ids.map((id) => ({
      findingId: id,
      description: `Line for ${id}`,
      priceKey: "scratch/minor",
      amount: total / ids.length,
      beforePhotoId: "C-front",
      afterPhotoId: "R-front",
    })),
  };
}

function withStatus(report: DamageReport, id: string, status: ReviewedFinding["status"]): DamageReport {
  return { ...report, findings: report.findings.map((f) => (f.id === id ? { ...f, status } : f)) };
}

const card = (id: string) => screen.getByTestId(`finding-${id}`);

beforeEach(() => {
  review.mockReset();
  invoiceApi.mockReset();
});

describe("ReportView", () => {
  it("shows the hours used and every visible finding, but not hidden ones", () => {
    render(<ReportView report={sampleReport()} rental={rental} invoice={invoice(995, ["F-auto", "F-confirmed"])} />);
    expect(screen.getByText("+37.5 h used")).toBeInTheDocument();
    expect(screen.getByTestId("finding-F-auto")).toBeInTheDocument();
    expect(screen.getByTestId("finding-F-review")).toBeInTheDocument();
    expect(screen.queryByTestId("finding-F-hidden")).not.toBeInTheDocument();
    expect(within(card("F-review")).getByText("60% sure")).toBeInTheDocument();
    expect(within(card("F-review")).getByRole("img", { name: /after/i })).toHaveAttribute("src", "/api/photos/R-front");
  });

  it("holds the primary action until every finding is decided", () => {
    render(<ReportView report={sampleReport()} rental={rental} invoice={invoice(995)} />);
    expect(screen.getByRole("button", { name: "Review 1 finding first" })).toBeDisabled();
  });

  it("confirms a finding, then refreshes the total and opens the evidence step", async () => {
    const user = userEvent.setup();
    const report = sampleReport();
    review.mockResolvedValue({ ok: true, value: withStatus(report, "F-review", "confirmed") });
    invoiceApi.mockResolvedValue({ ok: true, value: invoice(1175, ["F-auto", "F-confirmed", "F-review"]) });
    render(<ReportView report={report} rental={rental} invoice={invoice(995, ["F-auto", "F-confirmed"])} />);

    await user.click(within(card("F-review")).getByRole("button", { name: "Confirm damage" }));

    expect(review).toHaveBeenCalledWith("I-test", "F-review", "confirmed");
    expect(await within(card("F-review")).findByText("Confirmed, charged")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-total")).toHaveTextContent("€1,175.00");
    expect(screen.getByRole("link", { name: "Open customer evidence" })).toHaveAttribute("href", "/evidence/I-test");
  });

  it("undoes a decision", async () => {
    const user = userEvent.setup();
    const report = sampleReport();
    review.mockResolvedValue({ ok: true, value: withStatus(report, "F-rejected", "needs_review") });
    invoiceApi.mockResolvedValue({ ok: true, value: invoice(995) });
    render(<ReportView report={report} rental={rental} invoice={invoice(995)} />);

    await user.click(within(card("F-rejected")).getByRole("button", { name: "Undo" }));

    expect(review).toHaveBeenCalledWith("I-test", "F-rejected", "needs_review");
    expect(await within(card("F-rejected")).findByRole("button", { name: "Reject" })).toBeInTheDocument();
  });

  it("keeps the card as it was and explains when the decision fails", async () => {
    const user = userEvent.setup();
    review.mockResolvedValue({ ok: false, error: { kind: "network", message: "No connection. Check Wi-Fi and try again." } });
    render(<ReportView report={sampleReport()} rental={rental} invoice={invoice(995)} />);

    await user.click(within(card("F-review")).getByRole("button", { name: "Reject" }));

    expect(await within(card("F-review")).findByRole("alert")).toHaveTextContent("No connection");
    expect(within(card("F-review")).getByRole("button", { name: "Confirm damage" })).toBeEnabled();
    expect(invoiceApi).not.toHaveBeenCalled();
  });

  it("says so when nothing new was found and lists what the model ignored", () => {
    const report = makeReport({ id: "I-test" });
    report.slots[2].ignored_changes = ["dirt on the left track"];
    render(<ReportView report={report} rental={rental} invoice={invoice(0)} />);
    expect(screen.getByText("No new damage")).toBeInTheDocument();
    expect(screen.getByText("dirt on the left track")).toBeInTheDocument();
    expect(screen.getByText("Nothing to charge")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open customer evidence" })).toBeInTheDocument();
  });

  it("still shows the findings when the invoice couldn't be built", () => {
    render(<ReportView report={sampleReport()} rental={rental} invoice={null} />);
    expect(screen.getByText(/invoice isn't available/i)).toBeInTheDocument();
  });
});
