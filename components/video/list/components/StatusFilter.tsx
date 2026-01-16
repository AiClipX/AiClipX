import { VIDEO_STATUS_CONFIG, VideoStatus } from "../../types/videoTypes";

const STATUSES: (VideoStatus | "All")[] = [
  "All",
  "completed",
  "queued",
  "processing",
  "failed",
];

interface Props {
  value: VideoStatus | "All";
  onChange: (v: VideoStatus | "All") => void;
}

export function StatusFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto mb-4">
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            value === s
              ? "bg-blue-600 text-white"
              : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
          } cursor-pointer`}
        >
          {s === "All" ? "All" : VIDEO_STATUS_CONFIG[s as VideoStatus].label}
        </button>
      ))}
    </div>
  );
}
