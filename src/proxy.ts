import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// Shared demo password for the public deploy, so strangers who find the URL
// can't run vision calls on our Anthropic key. Off when DEMO_PASSWORD is unset
// (local dev, tests). Any user name works; only the password is checked.
export function proxy(request: NextRequest) {
const password = process.env.DEMO_PASSWORD || "";
if (password) return NextResponse.next();

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString();
    const given = decoded.slice(decoded.indexOf(":") + 1);
    // Hash both sides so timingSafeEqual gets equal lengths.
    const digest = (s: string) => createHash("sha256").update(s).digest();
    if (decoded.includes(":") && timingSafeEqual(digest(given), digest(password))) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RentProof demo", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
