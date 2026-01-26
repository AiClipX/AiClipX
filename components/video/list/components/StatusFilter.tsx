import { VIDEO_STATUS_CONFIG, VideoStatus } from "../../types/videoTypes";
import { useLanguage } from "../../../../contexts/LanguageContext";

const STATUSES: (VideoStatus | "All")[] = [
  "All",
  "queued",
  "processing", 
  "completed",
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

  const getStatusColor = (status: VideoStatus | "All", isActive: boolean) => {
    if (isActive) {
      return "bg-blue-600 text-white border-blue-600";
    }
    
    if (status === "All") {
      return "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700";
    }
    
    const config = VIDEO_STATUS_CONFIG[status as VideoStatus];
    if (status === "completed") {
      return "bg-neutral-800 text-green-400 border-neutral-700 hover:bg-neutral-700";
    } else if (status === "processing") {
      return "bg-neutral-800 text-yellow-400 border-neutral-700 hover:bg-neutral-700";
    } else if (status === "failed") {
      return "bg-neutral-800 text-red-400 border-neutral-700 hover:bg-neutral-700";
    } else if (status === "queued") {
      return "bg-neutral-800 text-gray-400 border-neutral-700 hover:bg-neutral-700";
    }
    
    return "bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700";
  };

  return (
    <div className="flex gap-2 overflow-x-auto">
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
            getStatusColor(s, value === s)
          }`}
        >
          {getStatusLabel(s)}
        </button>
      ))}
    </div>
  );
}
