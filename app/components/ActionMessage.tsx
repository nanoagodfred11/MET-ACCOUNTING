interface ActionMessageProps {
  result?: { success?: boolean; message?: string };
}

export function ActionMessage({ result }: ActionMessageProps) {
  if (!result?.message) return null;

  return (
    <div
      role="alert"
      className={`mb-4 px-3 py-2 rounded text-sm border ${
        result.success
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}
    >
      {result.message}
    </div>
  );
}
