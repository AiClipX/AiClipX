import { useLanguage } from "../../contexts/LanguageContext";

interface Props {
  open: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  open,
  title,
  description,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useLanguage();
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-sm text-white">
        <h3 className="text-lg font-semibold mb-2">{title || t('confirm.delete.title')}</h3>
        <p className="text-sm text-neutral-400 mb-4">{description || t('confirm.delete.message')}</p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50"
          >
            {t('action.cancel')}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
          >
            {loading ? t('loading.deleting') : t('confirm.delete.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
