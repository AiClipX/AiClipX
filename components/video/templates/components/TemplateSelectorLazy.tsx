import React, { Suspense, lazy } from 'react';
import { TemplateListSkeleton } from './TemplateListSkeleton';
import { TemplateErrorBoundary } from './TemplateErrorBoundary';
import type { TemplateSelectorProps } from './TemplateSelector';

// Lazy load the TemplateSelector component for code splitting
const TemplateSelectorComponent = lazy(() => 
  import('./TemplateSelector').then(module => ({ default: module.TemplateSelector }))
);

interface TemplateSelectorLazyProps extends TemplateSelectorProps {
  fallback?: React.ReactNode;
}

export function TemplateSelectorLazy({
  fallback,
  ...props
}: TemplateSelectorLazyProps) {
  const defaultFallback = fallback || (
    <TemplateListSkeleton 
      showRecentSection={true}
      recentCount={2}
      templateCount={4}
    />
  );

  return (
    <TemplateErrorBoundary context="TemplateSelectorLazy">
      <Suspense fallback={defaultFallback}>
        <TemplateSelectorComponent {...props} />
      </Suspense>
    </TemplateErrorBoundary>
  );
}

export default TemplateSelectorLazy;