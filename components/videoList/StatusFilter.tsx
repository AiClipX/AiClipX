import { VideoStatus } from "./types/videoTypes";

const STATUSES: (VideoStatus | "All")[] = [
  "All",
  "Draft",
  "Processing",
  "Completed",
];

interface Props {
  value: VideoStatus | "All";
  onChange: (v: VideoStatus | "All") => void;
}

export function StatusFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 mb-6">
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1 text-sm rounded ${
            value === s ? "bg-blue-600" : "bg-neutral-800 hover:bg-neutral-700"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
