import { CaptureShell } from "@/components/capture/CaptureShell";

interface BlockedNoticeProps {
  title: string;
  body: string;
  cta: { label: string; href: string };
}

// Server-rendered stop sign: explains why this screen can't run and offers
// the one way forward.
export function BlockedNotice({ title, body, cta }: BlockedNoticeProps) {
  return (
    <CaptureShell title={title} primary={{ label: cta.label, href: cta.href }}>
      <p className="rounded-lg border-l-4 border-problem bg-red-50 px-3 py-2 text-body text-problem-ink">{body}</p>
    </CaptureShell>
  );
}
