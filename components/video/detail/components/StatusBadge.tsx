import React from 'react';
import { VideoStatus } from '../../types/videoTypes';
import {
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid';

interface StatusBadgeProps {
  status: VideoStatus;
  progress?: number;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, progress, className = '' }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'queued':
        return {
          icon: ClockIcon,
          text: 'Queued',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
        };
      case 'processing':
        return {
          icon: ArrowPathIcon,
          text: progress !== undefined ? `Processing ${progress}%` : 'Generating...',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-500',
          animate: true,
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          text: 'Completed',
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          iconColor: 'text-green-500',
        };
      case 'failed':
        return {
          icon: XCircleIcon,
          text: 'Failed',
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          iconColor: 'text-red-500',
        };
      default:
        return {
          icon: ClockIcon,
          text: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-500',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg
        ${config.bgColor} ${config.textColor}
        ${className}
      `}
    >
      <Icon
        className={`
          w-5 h-5 ${config.iconColor}
          ${config.animate ? 'animate-spin' : ''}
        `}
      />
      <span className="font-semibold">{config.text}</span>
    </div>
  );
};

export default StatusBadge;