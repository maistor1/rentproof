"use client";

import { useRef, useState } from "react";
import type { SlotNotice } from "@/components/capture/cameraControl";
import { CaptureStep } from "@/components/capture/CaptureStep";
import { CompleteStep } from "@/components/capture/CompleteStep";
import { useCaptureFlow, type CaptureFlowApi } from "@/components/capture/hooks/useCaptureFlow";
import { IntroStep } from "@/components/capture/IntroStep";
import { NativeCapture } from "@/components/capture/NativeCapture";
import { completePrimary } from "@/lib/capture/flowSelectors";
import { SLOT_COPY } from "@/lib/slots";
import type { Rental } from "@/lib/types";

function Viewfinder({ hint, onOpen }: { hint: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-400 bg-zinc-50 p-6 text-center"
    >
      <svg viewBox="0 0 24 24" className="size-12 text-zinc-700" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.3l1.5-2h7.4l1.5 2h2.3A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>
      <span className="text-body text-zinc-800">{hint}</span>
    </button>
  );
}

// Check-out uses the phone's own camera app: no reference to line up with yet.
function CheckoutCapture({ flow }: { flow: CaptureFlowApi }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<SlotNotice | null>(null);
  const { state } = flow;
  const open = () => inputRef.current?.click();
  const onCaptured = (file: File) => {
    setNotice(null);
    flow.capture(file);
  };
  const onInvalid = (message: string) => setNotice({ slot: state.current, message });
  return (
    <CaptureStep
      state={state}
      camera={{ label: "Take photo", disabled: false, trigger: open }}
      notice={notice?.slot === state.current ? notice.message : null}
      viewfinder={
        <>
          <Viewfinder hint={SLOT_COPY[state.current].hint} onOpen={open} />
          <NativeCapture inputRef={inputRef} onCaptured={onCaptured} onInvalid={onInvalid} />
          <NativeCapture source="files" inputRef={filesRef} onCaptured={onCaptured} onInvalid={onInvalid} />
        </>
      }
      onAccept={flow.accept}
      onRetake={flow.discardDraft}
      onSelectSlot={flow.goToSlot}
      onChooseFile={() => filesRef.current?.click()}
    />
  );
}

function CheckoutComplete({ flow }: { flow: CaptureFlowApi }) {
  const primary = completePrimary(flow.state);
  const finished = primary.intent === "finish";
  return (
    <CompleteStep
      state={flow.state}
      title={finished ? "Checked out" : "Saving photos"}
      meta={finished ? "All 6 photos are saved. The machine can leave the yard." : "Keep this screen open until every photo is saved."}
      primary={{
        label: primary.label,
        disabled: primary.disabled,
        busy: primary.intent === "wait",
        href: finished ? "/" : undefined,
        onClick: primary.intent === "retryUploads" ? flow.retryFailedUploads : undefined,
      }}
      onSelectSlot={flow.goToSlot}
    />
  );
}

export function CheckoutFlow({ rental }: { rental: Rental }) {
  const flow = useCaptureFlow(rental, "checkout");
  switch (flow.state.step) {
    case "intro":
      return <IntroStep rental={rental} state={flow.state} onStart={flow.start} />;
    case "capture":
      return <CheckoutCapture flow={flow} />;
    default:
      return <CheckoutComplete flow={flow} />;
  }
}
