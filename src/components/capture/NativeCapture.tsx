"use client";

import type { Ref } from "react";
import { photoFileProblem } from "@/lib/image/validateFile";

interface NativeCaptureProps {
  inputRef: Ref<HTMLInputElement>;
  onCaptured: (file: File) => void;
  onInvalid: (message: string) => void;
}

// Opens the phone's camera app. sr-only rather than hidden so iOS still
// honours input.click() and tests can reach it.
export function NativeCapture({ inputRef, onCaptured, onInvalid }: NativeCaptureProps) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      tabIndex={-1}
      aria-label="Camera"
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
