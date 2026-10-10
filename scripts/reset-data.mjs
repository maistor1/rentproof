#!/usr/bin/env node
// Clears runtime data so the app starts again from data/rentals.json (empty):
// data/rentals.local.json, uploaded photos and saved reports.
import { readdir, rm } from "node:fs/promises";
import path from "node:path";

const data = path.join(process.cwd(), "data");
await rm(path.join(data, "rentals.local.json"), { force: true });
for (const dir of ["photos", "inspections"]) {
  const full = path.join(data, dir);
  for (const name of await readdir(full).catch(() => [])) {
    if (name !== ".gitkeep") await rm(path.join(full, name), { recursive: true, force: true });
  }
}
console.log("Runtime data cleared. The app starts again with no rentals (data/rentals.json).");
