import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DamageReport, Photo, Rental } from "@/lib/types";

// All state lives in JSON files under data/ (RENTPROOF_DATA_DIR in tests).
// rentals.json is the tracked seed. The app writes rentals.local.json, which
// is gitignored, so demo runs never dirty the git tree.
export const dataDir = () => process.env.RENTPROOF_DATA_DIR ?? path.join(process.cwd(), "data");
export const photoDir = () => path.join(dataDir(), "photos");
/** @deprecated Use readPhoto(id). Kept so code written against the first scaffold still builds. */
export const PHOTO_DIR = path.join(process.cwd(), "data", "photos");
const inspectionDir = () => path.join(dataDir(), "inspections");
const seedFile = () => path.join(dataDir(), "rentals.json");
const rentalsFile = () => path.join(dataDir(), "rentals.local.json");

// Ids end up in file names, so only accept the characters we generate.
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
export const isSafeId = (id: string) => SAFE_ID.test(id);
export const newId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

// Runs read-modify-write steps one at a time. The queue lives on globalThis
// because Next can load this module more than once (one copy per route bundle
// in dev), and separate queues would not see each other.
const shared = globalThis as { __rentproofQueue?: Promise<unknown> };
export function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = (shared.__rentproofQueue ?? Promise.resolve()).then(fn);
  shared.__rentproofQueue = run.catch(() => undefined);
  return run;
}

// Readers never see a half-written file: write a temp file, then rename.
async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + "\n");
  await rename(tmp, file);
}

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

export async function listRentals(): Promise<Rental[]> {
  return (await readJson<Rental[]>(rentalsFile())) ?? (await readJson<Rental[]>(seedFile())) ?? [];
}

export async function getRental(id: string): Promise<Rental | undefined> {
  return (await listRentals()).find((r) => r.id === id);
}

// Applies `change` to the stored rental and saves it. Returns undefined if the
// rental doesn't exist. If `change` throws, nothing is written.
export function updateRental(
  id: string,
  change: (rental: Rental) => void,
): Promise<Rental | undefined> {
  return serialized(async () => {
    const rentals = await listRentals();
    const rental = rentals.find((r) => r.id === id);
    if (!rental) return undefined;
    change(rental);
    await writeJson(rentalsFile(), rentals);
    return rental;
  });
}

/**
 * @deprecated Use updateRental. saveRental writes back a whole record, so a
 * copy read before a slow step (the vision calls) overwrites anything saved in
 * the meantime, such as the return.
 */
export function saveRental(rental: Rental): Promise<void> {
  return serialized(async () => {
    const rentals = await listRentals();
    const i = rentals.findIndex((r) => r.id === rental.id);
    if (i === -1) rentals.push(rental);
    else rentals[i] = rental;
    await writeJson(rentalsFile(), rentals);
  });
}

const reportFile = (id: string) => path.join(inspectionDir(), `${id}.json`);

export async function getReport(id: string): Promise<DamageReport | undefined> {
  return isSafeId(id) ? readJson<DamageReport>(reportFile(id)) : undefined;
}

export function saveReport(report: DamageReport): Promise<void> {
  return serialized(async () => {
    if (!isSafeId(report.id)) throw new Error(`unsafe report id: ${report.id}`);
    await writeJson(reportFile(report.id), report);
  });
}

export function updateReport(
  id: string,
  change: (report: DamageReport) => void,
): Promise<DamageReport | undefined> {
  return serialized(async () => {
    const report = await getReport(id);
    if (!report) return undefined;
    change(report);
    await writeJson(reportFile(id), report);
    return report;
  });
}

// Each photo is two write-once files, <id>.jpg and <id>.json, so uploads
// don't contend for a shared index.
export async function writePhoto(photo: Photo, jpeg: Buffer): Promise<void> {
  await mkdir(photoDir(), { recursive: true });
  await writeFile(path.join(photoDir(), photo.path), jpeg);
  await writeJson(path.join(photoDir(), `${photo.id}.json`), photo);
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  return isSafeId(id) ? readJson<Photo>(path.join(photoDir(), `${id}.json`)) : undefined;
}

export async function readPhoto(id: string): Promise<Buffer | undefined> {
  const photo = await getPhoto(id);
  return photo && readFile(path.join(photoDir(), photo.path));
}
