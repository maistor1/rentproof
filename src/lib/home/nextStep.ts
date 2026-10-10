import { missingSlots } from "@/lib/slots";
import type { Rental } from "@/lib/types";

// Pure helpers for the home page: what state a rental is in and the one
// screen that moves it forward.

export interface StepLink {
  label: string;
  href: string;
}

export interface NextStep {
  status: { label: string; done: boolean };
  primary: StepLink;
  secondary?: StepLink;
}

export function nextStep(rental: Rental, reportId: string | undefined): NextStep {
  const id = encodeURIComponent(rental.id);
  if (rental.status === "out") {
    if (missingSlots(rental.photos.checkout).length > 0) {
      return {
        status: { label: "Check-out photos needed", done: false },
        primary: { label: "Take check-out photos", href: `/checkout/${id}` },
      };
    }
    return { status: { label: "On rent", done: false }, primary: { label: "Start return", href: `/return/${id}` } };
  }
  if (rental.status === "inspected" && reportId) {
    const report = encodeURIComponent(reportId);
    return {
      status: { label: "Report ready", done: true },
      primary: { label: "Open report", href: `/report/${report}` },
      secondary: { label: "Customer evidence", href: `/evidence/${report}` },
    };
  }
  return {
    status: { label: "Damage check pending", done: false },
    primary: { label: "Finish return check", href: `/return/${id}` },
  };
}

export function sortNewestFirst(rentals: readonly Rental[]): Rental[] {
  return [...rentals].sort((a, b) => b.checkoutAt.localeCompare(a.checkoutAt));
}
