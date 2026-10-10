import type { ReactNode } from "react";
import { PrimaryButton, type PrimaryAction } from "@/components/ui/PrimaryButton";
import { TextButton, type TextAction } from "@/components/ui/TextButton";

interface CaptureShellProps {
  header?: ReactNode;
  title: string;
  meta?: ReactNode;
  notice?: ReactNode;
  primary: PrimaryAction | null; // exactly one focal action, or none while waiting
  secondary?: TextAction;
  children?: ReactNode;
}

// Layout for every capture screen: progress on top, one 32 px task line, and
// a sticky action bar in the thumb zone. Forced light for outdoor use.
export function CaptureShell({ header, title, meta, notice, primary, secondary, children }: CaptureShellProps) {
  const hasFooter = primary !== null || secondary !== undefined;
  return (
    <div className="capture-surface flex min-h-dvh flex-col">
      <main className={`mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-4 ${hasFooter ? "pb-36" : "pb-8"}`}>
        {header}
        <div>
          <h1 className="text-task">{title}</h1>
          {meta && <div className="mt-1 text-body text-zinc-700">{meta}</div>}
        </div>
        {notice}
        {children}
      </main>
      {hasFooter && (
        <footer className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-1 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {primary && <PrimaryButton {...primary} />}
            {secondary && <TextButton {...secondary} />}
          </div>
        </footer>
      )}
    </div>
  );
}
