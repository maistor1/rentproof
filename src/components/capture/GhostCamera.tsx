"use client";

import { useState } from "react";
import type { GhostCameraApi } from "@/components/capture/hooks/useGhostCamera";
import { NativeCapture } from "@/components/capture/NativeCapture";
import { fallbackMessage } from "@/lib/camera/cameraSupport";

export const DEFAULT_GHOST_OPACITY = 0.35;

type GhostView = Pick<GhostCameraApi, "videoRef" | "inputRef" | "camera" | "aspect" | "onReferenceLoad">;

interface GhostCameraProps extends GhostView {
  referenceUrl: string | null;
  slotLabel: string;
  onCaptured: (file: File) => void;
  onInvalid: (message: string) => void;
}

function OpacitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-3 text-meta text-zinc-700">
      Guide
      <input
        type="range"
        min={0}
        max={0.8}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.currentTarget.value))}
        className="h-11 flex-1 accent-zinc-900"
        aria-label="Guide opacity"
      />
    </label>
  );
}

function Reference({ url, alt, className, style, onLoad }: {
  url: string;
  alt: string;
  className: string;
  style?: React.CSSProperties;
  onLoad?: GhostCameraApi["onReferenceLoad"];
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="p-3 text-meta text-zinc-700">Reference photo unavailable.</p>;
  // eslint-disable-next-line @next/next/no-img-element -- served by our own API, sized by CSS
  return <img src={url} alt={alt} className={className} style={style} onLoad={onLoad} onError={() => setFailed(true)} />;
}

// Mounted once per capture pass; only the overlay changes between slots, so the
// stream (and the iOS permission) survives the whole walk-around.
export function GhostCamera(props: GhostCameraProps) {
  const { videoRef, inputRef, camera, aspect, onReferenceLoad, referenceUrl, slotLabel, onCaptured, onInvalid } = props;
  const [opacity, setOpacity] = useState(DEFAULT_GHOST_OPACITY);

  if (camera.status === "fallback") {
    return (
      <div className="flex flex-col gap-2" data-testid="camera-fallback">
        <p className="text-meta text-zinc-700">{fallbackMessage(camera.reason)}</p>
        <div className="overflow-hidden rounded-xl bg-zinc-100">
          {referenceUrl && (
            <Reference key={referenceUrl} url={referenceUrl} alt={`Check-out photo: ${slotLabel}`} className="w-full" />
          )}
        </div>
        <p className="text-meta text-zinc-700">Match this angle, then take the photo.</p>
        <NativeCapture inputRef={inputRef} onCaptured={onCaptured} onInvalid={onInvalid} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative overflow-hidden rounded-xl bg-black" style={{ aspectRatio: aspect }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          disablePictureInPicture
          className="absolute inset-0 h-full w-full object-cover"
          data-testid="live-camera"
        />
        {referenceUrl && (
          <Reference
            key={referenceUrl}
            url={referenceUrl}
            alt=""
            onLoad={onReferenceLoad}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ opacity }}
          />
        )}
        {camera.status !== "live" && (
          <p className="absolute inset-x-0 bottom-3 text-center text-body text-white">
            {camera.status === "needsTap" ? "Tap Start camera" : "Starting camera…"}
          </p>
        )}
      </div>
      <OpacitySlider value={opacity} onChange={setOpacity} />
    </div>
  );
}
