import React from 'react';
import { config, getApiHost } from '../../lib/config';

interface EnvironmentBadgeProps {
  position?: 'header' | 'footer';
  className?: string;
}

const EnvironmentBadge: React.FC<EnvironmentBadgeProps> = ({ 
  position = 'footer', 
  className = '' 
}) => {
  // Don't show in production unless explicitly needed
  if (config.isProduction && config.environment === 'prod') {
    return null;
  }

  const badgeColors = {
    local: 'bg-blue-100 text-blue-800 border-blue-200',
    staging: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    prod: 'bg-green-100 text-green-800 border-green-200'
  };

  const apiHost = getApiHost();

  return (
    <div className={`
      inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border
      ${badgeColors[config.environment]}
      ${className}
    `}>
      <span className="mr-1">🌐</span>
      <span className="font-semibold">{config.environment.toUpperCase()}</span>
      <span className="mx-1">•</span>
      <span className="font-mono text-xs">{apiHost}</span>
    </div>
  );
};

export default EnvironmentBadge;