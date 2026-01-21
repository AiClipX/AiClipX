import { VIDEO_STATUS_CONFIG, VideoStatus } from "../../types/videoTypes";
import { useLanguage } from "../../../../contexts/LanguageContext";

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
  const { t } = useLanguage();
  
  const getStatusLabel = (status: VideoStatus | "All") => {
    if (status === "All") return t('status.all');
    return t(`status.${status}` as any);
  };

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
          {getStatusLabel(s)}
        </button>
      ))}
    </div>
  );
}
