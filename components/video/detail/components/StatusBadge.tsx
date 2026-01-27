import React from 'react';
import { VideoStatus } from '../../types/videoTypes';
import { useLanguage } from '../../../../contexts/LanguageContext';
import {
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  StopCircleIcon,
} from '@heroicons/react/24/solid';

interface StatusBadgeProps {
  status: VideoStatus;
  progress?: number;
  className?: string;
  showProgress?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  progress, 
  className = '', 
  showProgress = true 
}) => {
  const { t } = useLanguage();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          icon: ClockIcon,
          text: 'Draft',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          description: 'Video is in draft state',
        };
      case 'queued':
        return {
          icon: ClockIcon,
          text: t('status.queued'),
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-500',
          description: 'Video is waiting to be processed',
        };
      case 'processing':
        return {
          icon: ArrowPathIcon,
          text: progress !== undefined && showProgress 
            ? t('status.processingWithProgress', { progress: Math.round(progress) }) 
            : t('status.processing'),
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          animate: true,
          description: 'Video is being processed',
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          text: t('status.completed'),
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          iconColor: 'text-green-500',
          description: 'Video processing completed successfully',
        };
      case 'failed':
        return {
          icon: XCircleIcon,
          text: t('status.failed'),
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          iconColor: 'text-red-500',
          description: 'Video processing failed',
        };
      case 'cancelled':
        return {
          icon: StopCircleIcon,
          text: 'Cancelled',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          description: 'Video processing was cancelled',
        };
      default:
        return {
          icon: ClockIcon,
          text: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
          description: `Status: ${status}`,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      <div
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg
          ${config.bgColor} ${config.textColor}
          ${className}
        `}
        title={config.description}
      >
        <Icon
          className={`
            w-5 h-5 ${config.iconColor}
            ${config.animate ? 'animate-spin' : ''}
          `}
        />
        <span className="font-semibold">{config.text}</span>
      </div>
      
      {/* Progress bar for processing status */}
      {status === 'processing' && progress !== undefined && showProgress && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-sm text-blue-700 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBadge;