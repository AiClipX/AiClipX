import React from 'react';
import { Template } from '../types/templateTypes';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { getLocalizedTemplate } from '../services/templateService';
import { usePrefetchTemplate } from '../hooks/useTemplateQuery';
import { 
  TagIcon, 
  ClockIcon,
  SparklesIcon 
} from '@heroicons/react/24/outline';

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  isRecent?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export type { TemplateCardProps };

export function TemplateCard({ 
  template, 
  onSelect, 
  isRecent = false, 
  disabled = false,
  compact = false
}: TemplateCardProps) {
  const { language, t } = useLanguage();
  const { prefetchTemplate } = usePrefetchTemplate();
  
  // Get localized content for the current language
  const localizedContent = getLocalizedTemplate(template, language);
  
  const handleClick = () => {
    if (!disabled) {
      onSelect(template);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      onSelect(template);
    }
  };

  // Prefetch template details on hover for better UX
  const handleMouseEnter = () => {
    if (!disabled) {
      prefetchTemplate(template.id);
    }
  };

  return (
    <div
      className={`
        relative bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer
        transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        ${compact ? 'p-3 aspect-square' : 'p-4'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isRecent ? 'ring-1 ring-blue-500/30' : ''}
      `}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={t('templates.card.selectTemplate', { name: localizedContent.name })}
    >
      {/* Recent indicator */}
      {isRecent && (
        <div className="absolute top-2 right-2 z-10">
          <div className={`flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-full ${
            compact ? 'text-xs' : 'text-xs'
          }`}>
            <ClockIcon className="w-3 h-3" />
            <span>{t('templates.card.recent')}</span>
          </div>
        </div>
      )}

      {/* Content container with flex layout for square cards */}
      <div className={`h-full flex flex-col ${compact ? 'justify-between' : ''}`}>
        {/* Template header */}
        <div className={compact ? 'mb-2' : 'mb-3'}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className={`text-white font-semibold leading-tight ${
              compact ? 'text-sm' : 'text-lg'
            }`}>
              {localizedContent.name}
            </h3>
            {!isRecent && (
              <SparklesIcon className={`text-blue-400 flex-shrink-0 mt-0.5 ${
                compact ? 'w-4 h-4' : 'w-5 h-5'
              }`} />
            )}
          </div>
          
          <p className={`text-neutral-300 leading-relaxed overflow-hidden ${
            compact ? 'text-xs' : 'text-sm'
          }`}
             style={{ 
               display: '-webkit-box',
               WebkitLineClamp: compact ? 3 : 2,
               WebkitBoxOrient: 'vertical'
             }}>
            {localizedContent.description}
          </p>
        </div>

        {/* Use case - Hidden in compact mode */}
        {!compact && localizedContent.useCase && (
          <div className="mb-3 flex-1">
            <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide mb-1">
              {t('templates.card.useCase')}
            </p>
            <p className="text-neutral-300 text-sm">
              {localizedContent.useCase}
            </p>
          </div>
        )}

        {/* Tags - Always at bottom */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-auto">
            <TagIcon className={`text-neutral-400 flex-shrink-0 ${
              compact ? 'w-3 h-3' : 'w-4 h-4'
            }`} />
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, compact ? 2 : 3).map((tag) => (
                <span
                  key={tag}
                  className={`px-2 py-1 bg-neutral-800 text-neutral-300 rounded-full border border-neutral-700 ${
                    compact ? 'text-xs' : 'text-xs'
                  }`}
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > (compact ? 2 : 3) && (
                <span className={`px-2 py-1 bg-neutral-800 text-neutral-400 rounded-full border border-neutral-700 ${
                  compact ? 'text-xs' : 'text-xs'
                }`}>
                  +{template.tags.length - (compact ? 2 : 3)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-blue-600/5 opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-lg pointer-events-none" />
    </div>
  );
}

export default TemplateCard;