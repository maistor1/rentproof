import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";

const SEED = path.join(process.cwd(), "data", "rentals.json");

// Points storage at a fresh copy of the seed data for each test. Returns a
// getter for the folder so tests can inspect the files.
export function withTempDataDir(): () => string {
  let dir = "";
  beforeEach(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "rentproof-"));
    await cp(SEED, path.join(dir, "rentals.json"));
    await mkdir(path.join(dir, "photos"));
    await mkdir(path.join(dir, "inspections"));
    process.env.RENTPROOF_DATA_DIR = dir;
  });
  afterEach(async () => {
    delete process.env.RENTPROOF_DATA_DIR;
    await rm(dir, { recursive: true, force: true });
  });
  return () => dir;
}
