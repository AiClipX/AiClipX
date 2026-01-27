import React from 'react';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCapabilities } from '../../lib/capabilities';

interface CapabilityBannerProps {
  capability: keyof import('../../lib/capabilities').Capabilities;
  requiredValue: boolean;
  message: string;
  type?: 'warning' | 'info' | 'error';
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function CapabilityBanner({ 
  capability, 
  requiredValue, 
  message, 
  type = 'warning',
  dismissible = false,
  onDismiss 
}: CapabilityBannerProps) {
  const { t } = useLanguage();
  const { capabilities } = useCapabilities();

  // Don't show banner if capability matches required value
  if (capabilities[capability] === requiredValue) {
    return null;
  }

  const getStyles = () => {
    switch (type) {
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: 'text-red-500',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'text-blue-500',
        };
      default:
        return {
          container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          icon: 'text-yellow-500',
        };
    }
  };

  const styles = getStyles();
  const Icon = type === 'info' ? InformationCircleIcon : ExclamationTriangleIcon;

  return (
    <div className={`border rounded-lg p-3 ${styles.container}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.icon}`} />
        <div className="flex-1">
          <p className="text-sm">{message}</p>
        </div>
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={`p-1 hover:opacity-75 transition-opacity ${styles.icon}`}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Specific banner components for common use cases
export function EngineDisabledBanner() {
  const { t } = useLanguage();
  
  return (
    <CapabilityBanner
      capability="engineRunwayEnabled"
      requiredValue={true}
      message={t('capability.engineDisabled')}
      type="warning"
    />
  );
}

export function DownloadDisabledBanner() {
  const { t } = useLanguage();
  
  return (
    <CapabilityBanner
      capability="signedUrlEnabled"
      requiredValue={true}
      message={t('capability.downloadDisabled')}
      type="info"
    />
  );
}

export function CancelDisabledBanner() {
  const { t } = useLanguage();
  
  return (
    <CapabilityBanner
      capability="cancelEnabled"
      requiredValue={true}
      message={t('capability.cancelDisabled')}
      type="info"
    />
  );
}

export function PublishDisabledBanner() {
  const { t } = useLanguage();
  
  return (
    <CapabilityBanner
      capability="publishEnabled"
      requiredValue={true}
      message="Publishing features are currently disabled."
      type="info"
    />
  );
}

// Hook for managing banner dismissal state
export function useDismissibleBanner(bannerId: string) {
  const [dismissed, setDismissed] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`banner_dismissed_${bannerId}`) === 'true';
  });

  const dismiss = React.useCallback(() => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`banner_dismissed_${bannerId}`, 'true');
    }
  }, [bannerId]);

  const reset = React.useCallback(() => {
    setDismissed(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`banner_dismissed_${bannerId}`);
    }
  }, [bannerId]);

  return { dismissed, dismiss, reset };
}