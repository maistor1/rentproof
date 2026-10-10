import "server-only";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DamageReport, Rental } from "@/lib/types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const PHOTO_DIR = path.join(DATA_DIR, "photos");
const RENTALS_FILE = path.join(DATA_DIR, "rentals.json");
const INSPECTION_DIR = path.join(DATA_DIR, "inspections");

export async function listRentals(): Promise<Rental[]> {
  return JSON.parse(await readFile(RENTALS_FILE, "utf8"));
}

export async function getRental(id: string): Promise<Rental | undefined> {
  return (await listRentals()).find((r) => r.id === id);
}

export async function saveRental(rental: Rental): Promise<void> {
  const rentals = await listRentals();
  const i = rentals.findIndex((r) => r.id === rental.id);
  if (i === -1) rentals.push(rental);
  else rentals[i] = rental;
  await writeFile(RENTALS_FILE, JSON.stringify(rentals, null, 2) + "\n");
}

export async function getReport(id: string): Promise<DamageReport | undefined> {
  try {
    return JSON.parse(await readFile(path.join(INSPECTION_DIR, `${id}.json`), "utf8"));
  } catch {
    return undefined;
  }
}

export async function saveReport(report: DamageReport): Promise<void> {
  await writeFile(
    path.join(INSPECTION_DIR, `${report.id}.json`),
    JSON.stringify(report, null, 2) + "\n",
  );
}
