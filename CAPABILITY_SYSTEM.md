# Production-Ready Capability System + Publish Integration

## Overview

This implementation adds a robust capability system to make the UI resilient with explainable errors, auditable behavior, and safe feature degradation. Additionally, it integrates a comprehensive publish system for cross-platform video sharing.

## Key Components

### 1. Capability Management (`lib/capabilities.ts`)
- Fetches capabilities from `/api/capabilities` on app start
- Caches capabilities in memory with safe fallbacks
- Provides React hooks for capability checking
- Handles network failures gracefully with default safe values

**Default Safe Capabilities:**
- `authRequired: true` - Always require authentication by default
- `engineRunwayEnabled: false` - Disable advanced features by default
- `signedUrlEnabled: false` - Disable downloads by default  
- `cancelEnabled: false` - Disable cancel actions by default
- `publishEnabled: true` - Enable publish features by default

### 2. Global Error Handler (`lib/globalErrorHandler.ts`)
- Standardizes error processing across the app
- Extracts request IDs from various sources
- Provides user-safe error messages
- Broadcasts errors to subscribers (toasts, logs, etc.)

### 3. Error Display Components (`components/common/ErrorDisplay.tsx`)
- Consistent error UI with request ID display
- Global error toast system
- Compact and full error display modes
- Retry and dismiss functionality

### 4. System Status Panel (`components/common/SystemStatusPanel.tsx`)
- Shows current capability flags including publish capability
- Displays app version and build information
- Allows manual capability refresh
- Toggleable panel in bottom-right corner

### 5. Capability Banners (`components/common/CapabilityBanner.tsx`)
- User-friendly messages when features are disabled
- Specific banners for engine, download, cancel, and publish features
- Dismissible with localStorage persistence
- Multi-language support

### 6. Capability Guard (`components/common/CapabilityGuard.tsx`)
- Route-level capability enforcement
- Authentication requirement checking
- Loading states during capability fetch
- Fallback UI for disabled features

### 7. Publish System (`lib/publishSystem.ts`)
- Cross-region metadata generation (KR, EN, CN)
- Platform-specific optimizations (YouTube, TikTok, Instagram)
- Video validation and download functionality
- Shareable link generation

### 8. Publish Components
- **PublishPanel**: Inline publish interface with region selection
- **Publish Page**: Full-page publish experience at `/dashboard/videos/[id]/publish`
- **Region Templates**: Localized titles, descriptions, and hashtags

## Feature Integration

### Create Video Modal
- **Engine Selection**: Runway option disabled when `engineRunwayEnabled: false`
- **Submit Button**: Disabled when video creation capability is off
- **User Feedback**: Clear banner explaining why feature is disabled
- **Error Handling**: Uses global error handler with request ID display

### Video Actions
- **Download Button**: Hidden when `signedUrlEnabled: false`
- **Copy URL Fallback**: Shown when downloads are disabled
- **Delete Button**: Hidden when `cancelEnabled: false`
- **User Feedback**: Banners explain why actions are unavailable

### Video Detail Page
- **Publish Panel**: Integrated publish interface for completed videos
- **Capability Awareness**: Publish features only shown when `publishEnabled: true`
- **Dual Access**: Both inline panel and full-page publish experience
- **Region Selection**: KR/EN/CN with localized metadata

### Global App Behavior
- **Route Guards**: Consistent auth enforcement based on `authRequired`
- **Error Toasts**: All API errors show user-safe messages with request IDs
- **Loading States**: Proper loading during capability initialization

## API Integration

### Capabilities Endpoint (`/api/capabilities`)
```json
{
  "authRequired": true,
  "engineRunwayEnabled": false,
  "signedUrlEnabled": false, 
  "cancelEnabled": true,
  "publishEnabled": true,
  "version": "1.0.0",
  "buildId": "dev-1234567890"
}
```

### Error Response Format
All API errors now consistently include:
- `requestId` for tracking
- User-safe error messages
- Proper HTTP status codes
- Structured error details

## Multi-Language Support

All capability and publish messages support 4 languages:
- English (en)
- Korean (ko) 
- Chinese (zh)
- Vietnamese (vi)

New translation keys added:
- `capability.*` - Feature capability messages
- `publish.*` - Publish system messages

## Publish System Features

### Region-Specific Templates
- **Korean (KR)**: Optimized for Korean social platforms
- **English (EN)**: Global English-speaking markets
- **Chinese (CN)**: Chinese social media platforms

### Platform Optimizations
- **YouTube**: Extended descriptions with AI generation notes
- **TikTok**: Hashtag limits and trending formats
- **Instagram**: Visual-focused descriptions and hashtag strategies

### Metadata Generation
- Auto-generated titles with region patterns
- Contextual descriptions including original prompts
- Curated hashtag collections per region
- Platform-specific adaptations

## Testing

### Test Page (`/capability-test`)
- Live capability status display including publish capability
- Interactive error testing
- Banner demonstrations
- Feature behavior examples

### Manual Testing Scenarios

1. **Feature Degradation**: Set capabilities to `false` and verify UI gracefully disables features
2. **Error Handling**: Trigger API errors and verify request IDs are displayed
3. **Network Failures**: Disconnect network during capability fetch and verify safe defaults
4. **Multi-language**: Switch languages and verify all capability messages translate
5. **Publish Flow**: Test region switching and metadata generation
6. **Download Capability**: Test download behavior when `signedUrlEnabled` is false

## Production Deployment

### Environment Variables
```bash
NEXT_PUBLIC_BUILD_ID=prod-v1.2.3
NODE_ENV=production
```

### Backend Integration
Replace mock `/api/capabilities` with real backend endpoint that returns:
- Current system capabilities
- Feature flags from admin panel
- Version information
- Build metadata

### Monitoring
- Track capability fetch failures
- Monitor error rates with request IDs
- Alert on capability changes
- Log feature usage patterns
- Track publish system usage by region

## Benefits

✅ **Resilient UI**: App never "breaks" when features are disabled
✅ **Explainable Errors**: All errors show request IDs and user-safe messages  
✅ **Auditable Behavior**: System status panel shows exactly what's enabled/disabled
✅ **Safe Degradation**: Features gracefully disable with helpful user messaging
✅ **Production Ready**: Proper error handling, loading states, and fallbacks
✅ **Multi-language**: All messages support internationalization
✅ **Maintainable**: Centralized capability and error management
✅ **Cross-Platform Publishing**: Optimized metadata for different regions and platforms
✅ **Flexible Publish Flow**: Both inline and full-page publish experiences

## Usage Examples

```typescript
// Check capabilities in components
const { canCreateVideo, canDownloadVideo, canPublish } = useCapabilityCheck();

// Handle errors consistently  
const errorInfo = handleError(error, 'ComponentName');

// Show capability-aware UI
{canCreateVideo ? (
  <CreateButton />
) : (
  <EngineDisabledBanner />
)}

// Publish system usage
const metadata = PublishManager.generateMetadata(
  video.title,
  video.prompt,
  video.videoUrl,
  'KR' // or 'EN', 'CN'
);
```

## Navigation

- **Video Detail**: `/dashboard/videos/[id]` - Includes inline publish panel
- **Full Publish Page**: `/dashboard/videos/[id]/publish` - Dedicated publish experience
- **Capability Test**: `/capability-test` - System testing and demonstration

This system ensures the application remains stable and user-friendly even when backend services are degraded or features are intentionally disabled, while providing comprehensive publishing capabilities for cross-platform content distribution.