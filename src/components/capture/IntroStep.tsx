import { CaptureShell } from "@/components/capture/CaptureShell";
import { MachineMap } from "@/components/progress/MachineMap";
import { acceptedCount, toneMap } from "@/lib/capture/flowSelectors";
import type { CaptureFlowState } from "@/lib/capture/flowTypes";
import { formatHours, formatHoursUsed, hoursUsed, returnReading } from "@/lib/hourMeter";
import type { Rental } from "@/lib/types";

interface IntroStepProps {
  rental: Rental;
  state: CaptureFlowState;
  onStart: () => void;
}

// Read-only: the hour meter arrives as data (rental record / telematics).
function HourMeter({ rental, phase }: { rental: Rental; phase: CaptureFlowState["phase"] }) {
  const atReturn = phase === "return" ? returnReading(rental) : null;
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2">
      <dt className="text-meta text-zinc-700">{atReturn === null ? "Hour meter at check-out" : "Hour meter now"}</dt>
      <dd className="font-mono text-body font-semibold">
        {formatHours(atReturn ?? rental.hourMeterAtCheckout)}
        {atReturn !== null && (
          <span className="ml-2 text-done-ink">{formatHoursUsed(hoursUsed(rental.hourMeterAtCheckout, atReturn))}</span>
        )}
      </dd>
    </div>
  );
}

function startLabel(state: CaptureFlowState): string {
  const done = acceptedCount(state);
  if (done > 0) return `Continue (${done} of 6 done)`;
  return state.phase === "checkout" ? "Start check-out" : "Start return check";
}

export function IntroStep({ rental, state, onStart }: IntroStepProps) {
  const isReturn = state.phase === "return";
  return (
    <CaptureShell
      title={rental.machine.name}
      meta={`${rental.machine.model} · ${rental.machine.serialNumber}`}
      primary={{ label: startLabel(state), onClick: onStart }}
      secondary={{ label: "Back to rentals", href: "/" }}
    >
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-zinc-50 px-3 py-2">
          <dt className="text-meta text-zinc-700">Customer</dt>
          <dd className="text-body font-semibold">{rental.customer.name}</dd>
        </div>
        <HourMeter rental={rental} phase={state.phase} />
      </dl>
      <div className="flex items-center gap-4">
        <MachineMap tones={toneMap(state)} className="w-28 shrink-0" />
        <p className="text-body text-zinc-800">
          Walk around the machine and take 6 photos.{" "}
          {isReturn ? "Line each one up with the check-out photo." : "Yellow shows where to stand next."}
        </p>
      </div>
    </CaptureShell>
  );
}
