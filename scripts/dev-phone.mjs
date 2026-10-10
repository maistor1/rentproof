#!/usr/bin/env node
// Starts the dev server over HTTPS on the laptop's Wi-Fi address, so phones on
// the same network can open it and use the live camera (which needs HTTPS).
//
//   npm run dev:phone              detect the LAN IP
//   npm run dev:phone -- --ip X    use this IP instead
//
// The certificate covers localhost and the LAN IP. It is made with mkcert but
// without `mkcert -install` (that needs a password), so phones show a one-time
// certificate warning. A new IP gets a new certificate automatically.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const ipArg = args.includes("--ip") ? args[args.indexOf("--ip") + 1] : undefined;

function lanIp() {
  const candidates = Object.entries(os.networkInterfaces())
    .flatMap(([name, addrs]) => (addrs ?? []).map((a) => ({ name, ...a })))
    .filter((a) => a.family === "IPv4" && !a.internal);
  // Prefer the usual Wi-Fi/Ethernet interfaces over VPNs and bridges.
  const preferred = candidates.find((a) => /^(en|eth|wlan|wl)/.test(a.name));
  return (preferred ?? candidates[0])?.address;
}

function findMkcert() {
  try {
    execFileSync("mkcert", ["-help"], { stdio: "ignore" });
    return "mkcert";
  } catch {}
  // `next dev --experimental-https` downloads mkcert into Next's cache folder.
  try {
    const require = createRequire(import.meta.url);
    const { getCacheDirectory } = require("next/dist/lib/helpers/get-cache-directory");
    const arch = process.arch === "x64" ? "amd64" : process.arch;
    const platform = process.platform === "win32" ? "windows" : process.platform;
    const bin = path.join(getCacheDirectory("mkcert"), `mkcert-v1.4.4-${platform}-${arch}${platform === "windows" ? ".exe" : ""}`);
    if (existsSync(bin)) return bin;
  } catch {}
  return undefined;
}

const ip = ipArg ?? lanIp();
if (!ip) {
  console.error("No network address found. Join a Wi-Fi network, or pass one with: npm run dev:phone -- --ip 192.168.x.y");
  process.exit(1);
}

const dir = path.join(process.cwd(), "certificates");
const key = path.join(dir, "lan-key.pem");
const cert = path.join(dir, "lan.pem");
const stamp = path.join(dir, "lan.ip");
const current = existsSync(stamp) ? readFileSync(stamp, "utf8").trim() : "";

if (current !== ip || !existsSync(key) || !existsSync(cert)) {
  const mkcert = findMkcert();
  if (!mkcert) {
    console.error("mkcert not found. Install it (brew install mkcert) or run `npm run dev:https` once, which downloads it.");
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  console.log(`Making a certificate for localhost and ${ip}...`);
  execFileSync(mkcert, ["-key-file", key, "-cert-file", cert, "localhost", "127.0.0.1", "::1", ip], { stdio: "inherit" });
  writeFileSync(stamp, ip + "\n");
}

console.log(`\nOn your phone (same Wi-Fi): https://${ip}:3000`);
console.log("Accept the certificate warning once. On this laptop: https://localhost:3000\n");

// Keep any extra origins (e.g. a tunnel) and add the LAN IP.
const origins = [process.env.DEV_ORIGINS, ip].filter(Boolean).join(",");
const nextArgs = ["dev", "--experimental-https", "--experimental-https-key", key, "--experimental-https-cert", cert];
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", ...nextArgs], {
  stdio: "inherit",
  env: { ...process.env, DEV_ORIGINS: origins },
});
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
