import Link from "next/link";

export interface TextAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

const CLASS =
  "inline-flex min-h-11 items-center justify-center px-2 text-body text-zinc-700 underline underline-offset-4 " +
  "focus-visible:outline-2 focus-visible:outline-black";

// Secondary actions stay neutral so they never compete with the primary.
export function TextButton({ label, onClick, href }: TextAction) {
  if (href) {
    return (
      <Link href={href} className={CLASS}>
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={CLASS}>
      {label}
    </button>
  );
}
