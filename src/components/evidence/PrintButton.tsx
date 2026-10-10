"use client";

// The browser's print dialog does the PDF ("Save as PDF"); print CSS on the
// evidence page lays it out as A4.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-11 shrink-0 items-center rounded-xl whitespace-nowrap border-2 border-zinc-900 px-4 text-body font-semibold print:hidden focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black"
    >
      Download PDF
    </button>
  );
}
