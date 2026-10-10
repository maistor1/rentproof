"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CaptureShell } from "@/components/capture/CaptureShell";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { createRental } from "@/lib/client/rentalsApi";

interface Field {
  name: string;
  label: string;
  group: "Machine" | "Customer";
  autoComplete: string;
  placeholder?: string;
  email?: boolean;
}

const FIELDS = [
  { name: "machineName", label: "Machine name", group: "Machine", autoComplete: "off", placeholder: "Mini excavator" },
  { name: "model", label: "Model", group: "Machine", autoComplete: "off", placeholder: "CAT 301.7 CR" },
  { name: "serialNumber", label: "Serial number", group: "Machine", autoComplete: "off" },
  { name: "customerName", label: "Customer name", group: "Customer", autoComplete: "organization" },
  { name: "customerEmail", label: "Customer email", group: "Customer", autoComplete: "email", email: true },
] as const satisfies readonly Field[];

type FieldName = (typeof FIELDS)[number]["name"];
type Values = Record<FieldName, string>;

const EMPTY: Values = { machineName: "", model: "", serialNumber: "", customerName: "", customerEmail: "" };

// Starts a rental. The check-out hours come from telematics on the server, so
// there is deliberately no hour field.
export function NewRentalForm() {
  const router = useRouter();
  const [values, setValues] = useState<Values>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const missing = FIELDS.filter((f) => !values[f.name].trim()).map((f) => f.label);
    if (missing.length > 0) {
      setError(`Fill in: ${missing.join(", ")}.`);
      return;
    }
    setBusy(true);
    setError(null);
    const result = await createRental({
      machine: { name: values.machineName.trim(), model: values.model.trim(), serialNumber: values.serialNumber.trim() },
      customer: { name: values.customerName.trim(), email: values.customerEmail.trim() },
    });
    if (result.ok) {
      router.push(`/checkout/${encodeURIComponent(result.value.id)}`);
      return;
    }
    setError(result.error.message);
    setBusy(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <CaptureShell
      title="New rental"
      meta="Check-out hours are read from the machine's telematics."
      notice={error && <ErrorNotice message={error} />}
      primary={{ label: "Create and take check-out photos", onClick: () => void submit(), busy, disabled: busy }}
      secondary={{ label: "Cancel", href: "/" }}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        {(["Machine", "Customer"] as const).map((group) => (
          <fieldset key={group} className="flex flex-col gap-4">
            <legend className="mb-2 text-meta font-semibold tracking-wide text-zinc-600 uppercase">{group}</legend>
            {FIELDS.filter((f) => f.group === group).map((f: Field & { name: FieldName }) => (
              <label key={f.name} className="flex flex-col gap-1">
                <span className="text-body font-medium">{f.label}</span>
                <input
                  name={f.name}
                  type={f.email ? "email" : "text"}
                  inputMode={f.email ? "email" : undefined}
                  autoComplete={f.autoComplete}
                  placeholder={f.placeholder}
                  value={values[f.name]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
                  maxLength={120}
                  enterKeyHint={f.email ? "go" : "next"}
                  className="h-14 rounded-xl border border-zinc-300 px-4 text-body focus:border-zinc-900 focus:outline-2 focus:outline-zinc-900"
                />
              </label>
            ))}
          </fieldset>
        ))}
        {/* Lets the keyboard's Go key submit; the visible button is in the footer. */}
        <button type="submit" hidden />
      </form>
    </CaptureShell>
  );
}
