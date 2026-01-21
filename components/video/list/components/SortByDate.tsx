import { useLanguage } from "../../../../contexts/LanguageContext";

interface Props {
  value: "newest" | "oldest";
  onChange: (v: "newest" | "oldest") => void;
}

export function SortByDate({ value, onChange }: Props) {
  const { t } = useLanguage();
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as any)}
      className="bg-neutral-800 text-sm px-3 py-1 rounded mb-6"
    >
      <option value="newest">{t('videoList.sortNewest')}</option>
      <option value="oldest">{t('videoList.sortOldest')}</option>
    </select>
  );
}
