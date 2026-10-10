interface ErrorNoticeProps {
  message: string;
}

export function ErrorNotice({ message }: ErrorNoticeProps) {
  return (
    <p
      role="alert"
      className="animate-fade-in rounded-lg border-l-4 border-problem bg-red-50 px-3 py-2 text-body text-problem-ink"
    >
      {message}
    </p>
  );
}
