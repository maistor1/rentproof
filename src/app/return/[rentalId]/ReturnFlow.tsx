"use client";

import { useRef, useState } from "react";
import type { SlotNotice } from "@/components/capture/cameraControl";
import { CaptureStep } from "@/components/capture/CaptureStep";
import { CompleteStep } from "@/components/capture/CompleteStep";
import { GhostCamera } from "@/components/capture/GhostCamera";
import { useCaptureFlow, type CaptureFlowApi } from "@/components/capture/hooks/useCaptureFlow";
import { useGhostCamera } from "@/components/capture/hooks/useGhostCamera";
import { useInspection } from "@/components/capture/hooks/useInspection";
import { InspectionWait } from "@/components/capture/InspectionWait";
import { IntroStep } from "@/components/capture/IntroStep";
import { NativeCapture } from "@/components/capture/NativeCapture";
import { completePrimary } from "@/lib/capture/flowSelectors";
import { photoUrl } from "@/lib/photoUrl";
import { slotLabel } from "@/lib/slots";
import type { Rental } from "@/lib/types";

// Stays mounted while the worker walks around, so the live stream does too.
function ReturnCapture({ flow, rental }: { flow: CaptureFlowApi; rental: Rental }) {
  const { state } = flow;
  const [notice, setNotice] = useState<SlotNotice | null>(null);
  const report = (message: string) => setNotice({ slot: state.current, message });
  const onCaptured = (blob: Blob) => {
    setNotice(null);
    flow.capture(blob);
  };
  const { videoRef, inputRef, camera, aspect, onReferenceLoad, control } = useGhostCamera({ onCaptured, onError: report });
  const filesRef = useRef<HTMLInputElement>(null);
  const referenceId = rental.photos.checkout[state.current];

  return (
    <CaptureStep
      state={state}
      camera={control}
      notice={notice?.slot === state.current ? notice.message : null}
      viewfinder={
        <>
          <GhostCamera
            videoRef={videoRef}
            inputRef={inputRef}
            camera={camera}
            aspect={aspect}
            onReferenceLoad={onReferenceLoad}
            referenceUrl={referenceId ? photoUrl(referenceId) : null}
            slotLabel={slotLabel(state.current)}
            onCaptured={onCaptured}
            onInvalid={report}
          />
          {/* Outside GhostCamera so picking a file never remounts the live stream. */}
          <NativeCapture source="files" inputRef={filesRef} onCaptured={onCaptured} onInvalid={report} />
        </>
      }
      onAccept={flow.accept}
      onRetake={flow.discardDraft}
      onSelectSlot={flow.goToSlot}
      onChooseFile={() => filesRef.current?.click()}
    />
  );
}

function ReturnComplete({ flow, onInspect }: { flow: CaptureFlowApi; onInspect: () => void }) {
  const primary = completePrimary(flow.state);
  const ready = primary.intent === "inspect";
  const onClick = primary.intent === "retryUploads" ? flow.retryFailedUploads : ready ? onInspect : undefined;
  return (
    <CompleteStep
      state={flow.state}
      title={ready ? "Ready for damage check" : "Saving photos"}
      meta={ready ? "All 6 return photos are saved." : "Keep this screen open until every photo is saved."}
      primary={{ label: primary.label, disabled: primary.disabled, busy: primary.intent === "wait", onClick }}
      onSelectSlot={flow.goToSlot}
    />
  );
}

export function ReturnFlow({ rental }: { rental: Rental }) {
  const flow = useCaptureFlow(rental, "return");
  const { state, dispatch } = flow;
  const inspection = useInspection({ rentalId: rental.id, round: state.inspection.round, dispatch });
  switch (state.step) {
    case "intro":
      return <IntroStep rental={rental} state={state} onStart={flow.start} />;
    case "capture":
      return <ReturnCapture flow={flow} rental={rental} />;
    case "inspecting":
      return (
        <InspectionWait
          state={state}
          onRetry={inspection.run}
          onBack={() => dispatch({ type: "inspectionDismissed" })}
        />
      );
    default:
      return <ReturnComplete flow={flow} onInspect={inspection.run} />;
  }
}
