interface Props {
  open: boolean;
  type: "success" | "error";
  title: string;
  message?: string;
  onClose: () => void;
}

export function NotificationModal({
  open,
  type,
  title,
  message,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
      <div className="bg-neutral-900 rounded-lg p-5 w-full max-w-sm text-white">
        <h3
          className={`text-lg font-semibold ${
            type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {title}
        </h3>

        {message && <p className="mt-2 text-sm text-neutral-300">{message}</p>}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-blue-600 rounded hover:bg-blue-500 transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
