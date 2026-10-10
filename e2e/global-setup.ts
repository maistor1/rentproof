import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import {
  BACKUP_FILE,
  E2E_DIR,
  E2E_RENTALS,
  E2E_REPORT,
  LOCAL_FILE,
  PHOTO_FILE,
  REPORT_FILE,
  SEED_FILE,
} from "./fixtures";

async function readRentals(file: string): Promise<{ id: string }[] | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return undefined;
  }
}

// The capture screens only write through /api/photos, the return route and
// /api/inspect, which the specs mock. The pages still read rentals on the
// server, so add the e2e rentals to the app's working copy and put it back
// afterwards.
export default async function globalSetup(): Promise<void> {
  await mkdir(E2E_DIR, { recursive: true });
  const local = await readRentals(LOCAL_FILE);
  if (local) await copyFile(LOCAL_FILE, BACKUP_FILE);
  else await rm(BACKUP_FILE, { force: true });

  const rentals = local ?? (await readRentals(SEED_FILE)) ?? [];
  const ids = new Set(E2E_RENTALS.map((r) => r.id));
  const merged = [...rentals.filter((r) => !ids.has(r.id)), ...E2E_RENTALS];
  await writeFile(LOCAL_FILE, JSON.stringify(merged, null, 2) + "\n");

  const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#d4a017" } })
    .jpeg()
    .toBuffer();
  await writeFile(PHOTO_FILE, jpeg);
  await writeFile(REPORT_FILE, JSON.stringify(E2E_REPORT, null, 2) + "\n");
}
