#!/usr/bin/env node
// End-to-end smoke test for the RentProof API. Needs `npm run dev` running.
//
//   node .claude/skills/rentproof-api-smoke/scripts/smoke.mjs [options]
//
//   --base URL        server (default http://localhost:3000)
//   --rental ID       rental to use (default R-1001)
//   --photos DIR      folder with NN-<slot>-before.jpg / NN-<slot>-after.jpg
//   --scenario NN     scenario prefix inside --photos (default 01)
//   --skip-inspect    stop before the vision calls (no API cost)
//   --keep            don't restore data/rentals.json afterwards
//
// Slots without a photo get a generated placeholder, identical before and
// after, so a run with no --photos should report zero findings.
// Routes that answer 501 are reported as SKIP, not FAIL.

import { copyFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SLOTS = ["front", "rear", "left_side", "right_side", "operator_cab", "attachment"];

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const BASE = opt("base", "http://localhost:3000");
const RENTAL = opt("rental", "R-1001");
const PHOTOS = opt("photos", null);
const SCENARIO = opt("scenario", "01");

const RENTALS_FILE = path.join(process.cwd(), "data", "rentals.json");
const BACKUP = RENTALS_FILE + ".smoke-backup";

let failed = 0;
let skipped = 0;
const pass = (msg) => console.log(`PASS  ${msg}`);
const fail = (msg) => {
  failed++;
  console.log(`FAIL  ${msg}`);
};
const skip = (msg) => {
  skipped++;
  console.log(`SKIP  ${msg}`);
};

async function call(method, url, body) {
  const init = { method };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  const res = await fetch(BASE + url, init);
  const type = res.headers.get("content-type") ?? "";
  const data = type.includes("json") ? await res.json() : await res.arrayBuffer();
  return { status: res.status, type, data };
}

// Returns true if the step can continue, false if it was skipped or failed.
function check(label, res, expected = 200) {
  if (res.status === 501) {
    skip(`${label}: not implemented yet`);
    return false;
  }
  if (res.status !== expected) {
    fail(`${label}: HTTP ${res.status} ${JSON.stringify(res.data?.error ?? "")}`);
    return false;
  }
  pass(label);
  return true;
}

const placeholders = new Map();
async function photoFor(slot, phase) {
  if (PHOTOS) {
    const file = path.join(PHOTOS, `${SCENARIO}-${slot}-${phase === "checkout" ? "before" : "after"}.jpg`);
    if (existsSync(file)) return readFile(file);
  }
  // Same image for both phases, different per slot, larger than the resize
  // target so the 1,500 px resize is exercised.
  if (!placeholders.has(slot)) {
    const hue = SLOTS.indexOf(slot) * 40;
    const img = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 120 + hue / 4, g: 110, b: 90 } },
    })
      .jpeg()
      .toBuffer();
    placeholders.set(slot, img);
  }
  return placeholders.get(slot);
}

async function upload(slot, phase) {
  const form = new FormData();
  form.set("rentalId", RENTAL);
  form.set("slot", slot);
  form.set("phase", phase);
  form.set("file", new Blob([await photoFor(slot, phase)], { type: "image/jpeg" }), `${slot}.jpg`);
  return call("POST", "/api/photos", form);
}

async function main() {
  console.log(`RentProof smoke test against ${BASE}, rental ${RENTAL}\n`);

  try {
    await fetch(BASE);
  } catch {
    console.log(`Cannot reach ${BASE}. Start the app with \`npm run dev\` first.`);
    process.exit(2);
  }
  if (existsSync(RENTALS_FILE)) await copyFile(RENTALS_FILE, BACKUP);

  // 1. Rental exists
  const rental = await call("GET", `/api/rentals/${RENTAL}`);
  if (!check("GET /api/rentals/:id", rental)) return;

  // 2. Bad input is rejected, not a 500
  const bad = new FormData();
  bad.set("rentalId", RENTAL);
  bad.set("slot", "../../etc");
  bad.set("phase", "checkout");
  bad.set("file", new Blob([Buffer.from("x")], { type: "image/jpeg" }), "x.jpg");
  const badRes = await call("POST", "/api/photos", bad);
  if (badRes.status === 501) skip("POST /api/photos rejects bad slot: not implemented yet");
  else if (badRes.status === 400) pass("POST /api/photos rejects bad slot");
  else fail(`POST /api/photos rejects bad slot: expected 400, got ${badRes.status}`);

  // 3. Upload all 12 photos, six at a time in parallel like the capture screen
  const photoIds = { checkout: {}, return: {} };
  for (const phase of ["checkout", "return"]) {
    const results = await Promise.all(SLOTS.map((s) => upload(s, phase)));
    if (results.some((r) => r.status === 501)) {
      skip(`POST /api/photos (${phase}): not implemented yet`);
      return;
    }
    const bad = results.findIndex((r) => r.status !== 200);
    if (bad !== -1) {
      fail(`POST /api/photos ${phase}/${SLOTS[bad]}: HTTP ${results[bad].status} ${JSON.stringify(results[bad].data?.error ?? "")}`);
      return;
    }
    for (const [i, r] of results.entries()) {
      photoIds[phase][SLOTS[i]] = r.data.id;
      if (Math.max(r.data.width, r.data.height) > 1600) {
        fail(`photo ${phase}/${SLOTS[i]} not resized: ${r.data.width}x${r.data.height}`);
      }
    }
    pass(`POST /api/photos x6 (${phase}, parallel)`);
  }

  // 4. Parallel uploads didn't overwrite each other in the rental record
  const after = await call("GET", `/api/rentals/${RENTAL}`);
  const lost = [];
  for (const phase of ["checkout", "return"]) {
    for (const s of SLOTS) {
      if (after.data.photos?.[phase]?.[s] !== photoIds[phase][s]) lost.push(`${phase}/${s}`);
    }
  }
  if (lost.length) fail(`rental.photos lost updates (write race?): ${lost.join(", ")}`);
  else pass("rental.photos has all 12 photo ids");

  // 5. Photos are served
  const img = await call("GET", `/api/photos/${photoIds.return.front}`);
  if (check("GET /api/photos/:id", img) && !img.type.startsWith("image/jpeg")) {
    fail(`GET /api/photos/:id content-type is ${img.type}`);
  }

  // 6. Record the return hour meter (triggers the mocked telematics)
  const hours = rental.data.hourMeterAtCheckout + 37.5;
  const ret = await call("PATCH", `/api/rentals/${RENTAL}`, { hourMeterAtReturn: hours });
  if (check("PATCH /api/rentals/:id hourMeterAtReturn", ret)) {
    if (ret.data.hourMeterAtReturn !== hours) fail("hourMeterAtReturn not saved");
    if (!ret.data.telematics?.CumulativeOperatingHours) fail("telematics snapshot missing");
  }

  if (flag("skip-inspect")) {
    console.log("\n--skip-inspect: stopping before the vision calls.");
    return;
  }

  // 7. Run the inspection (six real model calls, costs cents)
  const t0 = Date.now();
  const report = await call("POST", "/api/inspect", { rentalId: RENTAL });
  if (!check(`POST /api/inspect (${((Date.now() - t0) / 1000).toFixed(1)} s)`, report)) return;
  const r = report.data;
  console.log(
    `      ${r.slots.length} slots, ${r.findings.length} findings ` +
      `(${r.findings.map((f) => `${f.slot}:${f.type}/${f.severity}@${f.confidence} ${f.status}`).join(", ") || "none"}), ` +
      `retake: ${r.retakeSlots.join(", ") || "none"}`,
  );
  if (r.slots.length !== 6) fail(`expected 6 slot reports, got ${r.slots.length}`);
  if (!PHOTOS && r.findings.some((f) => f.status !== "hidden")) {
    fail("identical placeholder photos produced visible findings (false alarm)");
  }

  // 8. Confirm one review finding if there is one
  const review = r.findings.find((f) => f.status === "needs_review");
  if (review) {
    const conf = await call("PATCH", `/api/inspect/${r.id}/findings/${review.id}`, { status: "confirmed" });
    check("PATCH finding -> confirmed", conf);
  }

  // 9. Invoice adds up
  const inv = await call("GET", `/api/invoice/${r.id}`);
  if (check("GET /api/invoice/:id", inv)) {
    const sum = inv.data.lines.reduce((a, l) => a + l.amount, 0);
    if (Math.abs(sum - inv.data.total) > 0.001) fail(`invoice total ${inv.data.total} != sum of lines ${sum}`);
    const billable = r.findings.filter((f) => f.status === "auto_flagged").length + (review ? 1 : 0);
    if (inv.data.lines.length !== billable) {
      fail(`invoice has ${inv.data.lines.length} lines, expected ${billable} (auto_flagged + confirmed)`);
    }
    console.log(`      ${inv.data.lines.length} lines, total ${inv.data.total} ${inv.data.currency}`);
  }
}

try {
  await main();
} finally {
  if (existsSync(BACKUP)) {
    if (!flag("keep")) {
      await copyFile(BACKUP, RENTALS_FILE);
      console.log("\nRestored data/rentals.json.");
    }
    await rm(BACKUP);
  }
  console.log(`\n${failed ? "FAILED" : "OK"}: ${failed} failed, ${skipped} skipped`);
  process.exitCode = failed ? 1 : 0;
}
