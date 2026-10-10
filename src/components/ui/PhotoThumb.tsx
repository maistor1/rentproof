"use client";

import { useState } from "react";
import { THUMB_BORDER, TONE_LABEL } from "@/components/tones";
import type { Tone } from "@/lib/capture/flowTypes";

export interface PhotoThumbProps {
  src: string | null;
  alt: string;
  tone: Tone;
  animateIn?: boolean;
  scanning?: boolean;
  compact?: boolean; // strip thumbnails: no text overlays, just colour
}

type LoadState = "loading" | "loaded" | "failed";

// Keyed by src so a new photo starts from the skeleton again.
function ThumbImage({ src, alt }: { src: string; alt: string }) {
  const [load, setLoad] = useState<LoadState>("loading");
  return (
    <>
      {load === "loading" && <span className="absolute inset-0 bg-zinc-100" aria-hidden />}
      {load === "failed" ? (
        <span className="absolute inset-0 flex items-center justify-center p-1 text-center text-meta text-zinc-700">
          Photo unavailable
        </span>
      ) : (
        // Blob URLs from the camera can't go through next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoad("loaded")}
          onError={() => setLoad("failed")}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </>
  );
}

function StatusOverlay({ tone, scanning }: { tone: Tone; scanning: boolean }) {
  if (scanning) {
    return (
      <>
        <span className="absolute inset-x-0 top-0 h-1/3 animate-scan bg-gradient-to-b from-transparent via-action/50 to-transparent" />
        <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-meta text-zinc-900">Checking</span>
      </>
    );
  }
  if (tone !== "uploading") return null;
  return (
    <>
      <span className="shimmer-overlay absolute inset-0 animate-shimmer" />
      <span className="absolute bottom-1 left-1 rounded bg-white/90 px-1.5 text-meta text-zinc-900">Uploading</span>
    </>
  );
}

export function PhotoThumb({ src, alt, tone, animateIn = false, scanning = false, compact = false }: PhotoThumbProps) {
  return (
    <span
      data-tone={tone}
      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-md border-2 bg-zinc-50 ${THUMB_BORDER[tone]} ${
        animateIn ? "animate-thumb-in" : ""
      }`}
    >
      {src && <ThumbImage key={src} src={src} alt={alt} />}
      {!compact && <StatusOverlay tone={tone} scanning={scanning} />}
      {tone === "done" && !scanning && (
        <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-done text-white" aria-hidden>
          <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2.5 6.5l2.2 2.2L9.5 3.8" />
          </svg>
        </span>
      )}
      <span className="sr-only">{TONE_LABEL[tone]}</span>
    </span>
  );
}
