import { useRouter } from "next/router";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { PlusIcon } from '@heroicons/react/24/outline';

interface Props {
  onClick?: () => void;
  variant?: 'modal' | 'page';
}

export function CreateVideoButton({ onClick, variant = 'modal' }: Props) {
  const { t } = useLanguage();
  const router = useRouter();
  
  const handleClick = () => {
    if (variant === 'page') {
      router.push('/create');
    } else if (onClick) {
      onClick();
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
    >
      <PlusIcon className="w-5 h-5" />
      {t('videoList.createVideo')}
    </button>
  );
}
