// Smoke test for compareSlot (RP-6). Calls the real API, costs a few cents.
//
//   npx tsx --conditions=react-server scripts/smoke-vision.mts [before.jpg after.jpg [slot]]
//
// With no photos it generates synthetic pairs: no change, dirt only, and a
// scratch plus a dent. Reads ANTHROPIC_API_KEY from .env.local.
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { compareSlot } from "@/lib/ai/vision";
import { applyRules } from "@/lib/rules";
import type { Slot } from "@/lib/types";

process.loadEnvFile(".env.local");

// A yellow machine body with a cab, on a grey floor.
const BASE = `
  <rect width="1500" height="1000" fill="#d8d8d4"/>
  <rect x="300" y="380" width="900" height="360" rx="30" fill="#f2b705"/>
  <rect x="380" y="200" width="380" height="200" rx="16" fill="#f2b705"/>
  <rect x="420" y="230" width="300" height="140" fill="#9fc4d8"/>
  <rect x="280" y="740" width="940" height="90" rx="45" fill="#2b2b2b"/>`;

const DIRT = `
  <ellipse cx="500" cy="700" rx="160" ry="40" fill="#7a5c3a" opacity="0.7"/>
  <ellipse cx="1000" cy="720" rx="120" ry="30" fill="#7a5c3a" opacity="0.6"/>`;

const DAMAGE = `
  <path d="M 820 470 L 1080 560" stroke="#5a5a5a" stroke-width="7"/>
  <path d="M 822 476 L 1078 566" stroke="#e0e0e0" stroke-width="2"/>
  <ellipse cx="640" cy="560" rx="70" ry="50" fill="#b98b00"/>
  <ellipse cx="630" cy="550" rx="45" ry="30" fill="#8f6c00"/>`;

function jpeg(extra = ""): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="1000">${BASE}${extra}</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function run(name: string, slot: Slot, before: Buffer, after: Buffer) {
  const started = Date.now();
  const report = await compareSlot(slot, before, after);
  const { findings } = applyRules("SMOKE", [report]);
  console.log(`\n=== ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  console.log(`image_quality_ok: ${report.image_quality_ok}${report.retake_reason ? ` (${report.retake_reason})` : ""}`);
  for (const f of findings) {
    console.log(`  [${f.status}] ${f.type}/${f.severity} conf=${f.confidence} at ${f.location}: ${f.evidence}`);
  }
  if (findings.length === 0) console.log("  no findings");
  if (report.ignored_changes.length) console.log(`  ignored: ${report.ignored_changes.join("; ")}`);
}

const [beforePath, afterPath, slot = "left_side"] = process.argv.slice(2);
if (beforePath && afterPath) {
  await run("your photos", slot as Slot, await readFile(beforePath), await readFile(afterPath));
} else {
  const clean = await jpeg();
  await run("no change (expect nothing)", "left_side", clean, await jpeg());
  await run("dirt only (expect nothing)", "left_side", clean, await jpeg(DIRT));
  await run("scratch + dent (expect 2)", "left_side", clean, await jpeg(DAMAGE));
}
