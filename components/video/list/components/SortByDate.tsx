import { useLanguage } from "../../../../contexts/LanguageContext";
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Props {
  value: "newest" | "oldest";
  onChange: (v: "newest" | "oldest") => void;
}

export function SortByDate({ value, onChange }: Props) {
  const { t } = useLanguage();
  
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as any)}
        className="appearance-none bg-neutral-800 border border-neutral-700 text-white text-sm px-4 py-2 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
      >
        <option value="newest">{t('videoList.sortNewest')}</option>
        <option value="oldest">{t('videoList.sortOldest')}</option>
      </select>
      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
    </div>
  );
}
