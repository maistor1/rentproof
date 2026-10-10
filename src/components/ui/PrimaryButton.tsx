import Link from "next/link";

export interface PrimaryAction {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  busy?: boolean;
}

const BASE =
  "flex h-14 w-full items-center justify-center rounded-xl px-4 text-body font-semibold select-none " +
  "focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black";
const ENABLED = "bg-action text-action-ink active:brightness-95";
const DISABLED = "bg-zinc-200 text-zinc-700";

// The single accent-coloured element on a screen: full width, 56 px, thumb zone.
export function PrimaryButton({ label, onClick, href, disabled = false, busy = false }: PrimaryAction) {
  if (href && !disabled) {
    return (
      <Link href={href} className={`${BASE} ${ENABLED}`}>
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      className={`${BASE} ${disabled ? DISABLED : ENABLED}`}
    >
      {label}
    </button>
  );
}
