import priceTable from "../../data/price-table.json";
import type { DamageReport, Invoice, Rental } from "@/lib/types";

export const PRICES = priceTable;

// RP-11 (Member 3): one line per auto_flagged or confirmed finding.
export function buildInvoice(rental: Rental, report: DamageReport): Invoice {
  void rental;
  void report;
  throw new Error("buildInvoice not implemented yet (RP-11)");
}
