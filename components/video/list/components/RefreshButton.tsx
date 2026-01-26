import { useLanguage } from "../../../../contexts/LanguageContext";
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  onRefresh: () => void;
  loading?: boolean;
}

export function RefreshButton({ onRefresh, loading = false }: Props) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors disabled:cursor-not-allowed"
    >
      <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      {t('action.refresh')}
    </button>
  );
}