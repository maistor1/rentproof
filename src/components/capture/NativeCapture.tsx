"use client";

import type { Ref } from "react";
import { photoFileProblem } from "@/lib/image/validateFile";

interface NativeCaptureProps {
  inputRef: Ref<HTMLInputElement>;
  onCaptured: (file: File) => void;
  onInvalid: (message: string) => void;
  source?: "camera" | "files";
}

// "camera" opens the phone's camera app. "files" leaves out `capture`, so the
// phone offers the photo library, Files and Downloads instead (iOS skips them
// when `capture` is set). sr-only rather than hidden so iOS still honours
// input.click() and tests can reach it.
export function NativeCapture({ inputRef, onCaptured, onInvalid, source = "camera" }: NativeCaptureProps) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture={source === "camera" ? "environment" : undefined}
      tabIndex={-1}
      aria-label={source === "camera" ? "Camera" : "Photo from files"}
      className="sr-only"
      onChange={(event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        input.value = ""; // so the same file can be picked again after a retake
        if (!file) return;
        const problem = photoFileProblem(file);
        if (problem) onInvalid(problem);
        else onCaptured(file);
      }}
    />
  );
}
