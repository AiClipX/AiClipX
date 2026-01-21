import { useLanguage } from "../../../../contexts/LanguageContext";

interface Props {
  onClick: () => void;
}

export function CreateVideoButton({ onClick }: Props) {
  const { t } = useLanguage();
  
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-500"
    >
      + {t('videoList.createVideo')}
    </button>
  );
}
