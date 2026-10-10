import type { Rental } from "@/lib/types";

// The hour meter comes in as data (rental record or telematics), the capture
// screens only display it. Fixed locale so server and client render the same.
const HOURS = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatHours(hours: number): string {
  return `${HOURS.format(hours)} h`;
}

export function hoursUsed(atCheckout: number, atReturn: number): number {
  return Math.max(0, Math.round((atReturn - atCheckout) * 10) / 10);
}

export function formatHoursUsed(hours: number): string {
  return `+${HOURS.format(hours)} h used`;
}

export function returnReading(rental: Rental): number | null {
  return rental.hourMeterAtReturn ?? rental.telematics?.CumulativeOperatingHours.Hour ?? null;
}
