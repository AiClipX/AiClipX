# Polling & Performance Hardening

## Overview

This document describes the polling and performance optimization system implemented in FE-STG12-004.

## Key Features

### 1. Smart Polling with PollingManager

The `PollingManager` class provides intelligent polling with built-in guardrails:

```typescript
const pollingManager = new PollingManager(
  async () => {
    // Your polling callback
    await fetchData();
  },
  {
    interval: 4000,              // 4 seconds
    enableWhenHidden: false,     // Stop when tab hidden
    hiddenInterval: 12000,       // 12s when hidden (if enabled)
    maxConcurrent: 1,            // Prevent concurrent requests
  }
);

pollingManager.start();
```

**Features:**
- ✅ Sensible interval (4 seconds)
- ✅ Page Visibility API integration
- ✅ In-flight request deduplication
- ✅ Automatic cleanup
- ✅ Manual refresh support

### 2. State Preservation During Polling

Polling does NOT reset user state:
- ✅ Current page preserved
- ✅ Filters preserved
- ✅ Search query preserved
- ✅ Sort order preserved

**Implementation:**
```typescript
// Preserve current page during polling
const pageToRefresh = currentPage;
pagesCache.current.delete(pageToRefresh);
await fetchPage(pageToRefresh, true, true); // Silent refresh
```

### 3. Request Deduplication

Prevents concurrent duplicate calls:

```typescript
// In-flight tracking
private inFlightRequests = new Set<string>();

// Check before making request
if (this.inFlightRequests.size >= this.config.maxConcurrent) {
  console.warn('Skipping poll - too many in-flight requests');
  return;
}
```

### 4. Page Visibility API

Automatically adjusts polling based on tab visibility:

```typescript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab hidden - stop or slow down polling
    pollingManager.stop();
  } else {
    // Tab visible - resume normal polling
    pollingManager.start();
  }
});
```

### 5. Manual Refresh Button

Provides user control over data refresh:

```typescript
<RefreshButton
  onRefresh={manualRefresh}
  lastUpdated={lastUpdated}
  isPolling={isPolling}
/>
```

**Features:**
- Shows "Last updated" timestamp
- Manual refresh button
- Loading state during refresh
- Auto-refresh indicator when polling

## Configuration

### Polling Intervals

```typescript
const POLL_INTERVAL_MS = 4000;  // 4 seconds - active tab
const HIDDEN_INTERVAL_MS = 12000; // 12 seconds - hidden tab (if enabled)
```

**Why 4 seconds?**
- Fast enough for real-time updates
- Slow enough to avoid server spam
- Balances UX and performance

### Request Limits

```typescript
maxConcurrent: 1  // Only 1 request at a time
```

Prevents "request storms" when:
- Network is slow
- Server is slow
- Multiple tabs open

## Usage Examples

### Basic Polling Setup

```typescript
import { PollingManager } from '../lib/pollingManager';

const pollingManager = new PollingManager(
  async () => {
    await fetchData();
  },
  {
    interval: 4000,
    enableWhenHidden: false,
    maxConcurrent: 1,
  }
);

// Start polling
pollingManager.start();

// Stop polling
pollingManager.stop();

// Manual refresh
await pollingManager.refresh();

// Cleanup
pollingManager.destroy();
```

### Conditional Polling

```typescript
useEffect(() => {
  const hasActiveItems = items.some(item => item.status === 'processing');
  
  if (hasActiveItems) {
    pollingManager.start();
  } else {
    pollingManager.stop();
  }
  
  return () => pollingManager.destroy();
}, [items]);
```

### State Preservation

```typescript
// ❌ BAD - Resets state
const poll = () => {
  setPage(1);  // Resets to page 1
  setFilter('All');  // Resets filter
  fetchData();
};

// ✅ GOOD - Preserves state
const poll = () => {
  const currentPage = page;  // Preserve
  const currentFilter = filter;  // Preserve
  fetchData(currentPage, currentFilter);
};
```

## Performance Optimizations

### 1. Silent Refresh

Polling uses silent refresh to avoid UI flicker:

```typescript
await fetchPage(currentPage, true, true);
//                            ↑     ↑
//                         force  silent
```

**Benefits:**
- No loading spinner during poll
- No UI flicker
- Smooth updates

### 2. Cache Invalidation

Only invalidate cache for current page:

```typescript
// ❌ BAD - Clears all cache
pagesCache.clear();

// ✅ GOOD - Only current page
pagesCache.delete(currentPage);
```

### 3. Debounced Search

Search is debounced to prevent spam:

```typescript
const SEARCH_DEBOUNCE_MS = 800;

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(search);
  }, SEARCH_DEBOUNCE_MS);
  
  return () => clearTimeout(timer);
}, [search]);
```

### 4. Request Cancellation

Prevent concurrent requests:

```typescript
const isFetchingRef = useRef(false);

if (isFetchingRef.current) {
  console.log('Skipping - already fetching');
  return;
}

isFetchingRef.current = true;
try {
  await fetchData();
} finally {
  isFetchingRef.current = false;
}
```

## Testing Scenarios

### 1. State Preservation Test

```
1. Set filter to "processing"
2. Search for "test"
3. Go to page 2
4. Wait for polling refresh
5. ✅ Verify: Still on page 2, filter="processing", search="test"
```

### 2. No Request Spam Test

```
1. Open Network tab
2. Enable polling (create a processing video)
3. Wait 30 seconds
4. ✅ Verify: Requests every 4 seconds (not faster)
5. ✅ Verify: No concurrent requests
```

### 3. Tab Visibility Test

```
1. Start polling
2. Switch to another tab
3. Wait 10 seconds
4. Switch back
5. ✅ Verify: Polling stopped when hidden
6. ✅ Verify: Polling resumed when visible
```

### 4. Manual Refresh Test

```
1. Click "Refresh" button
2. ✅ Verify: Loading state shows
3. ✅ Verify: Data updates
4. ✅ Verify: "Last updated" timestamp changes
5. ✅ Verify: No UI flicker
```

## Monitoring

### Network Tab

Check for:
- ✅ Stable request cadence (4s intervals)
- ✅ No request bursts
- ✅ No concurrent duplicates
- ✅ Proper request IDs

### Console Logs

```javascript
// Enable polling debug logs
localStorage.setItem('debug_polling', 'true');

// Logs will show:
// [PollingManager] Starting poll
// [PollingManager] Poll completed in 234ms
// [PollingManager] Skipping poll - too many in-flight requests
```

### Performance Metrics

Monitor:
- Request frequency
- Response times
- Memory usage
- CPU usage during polling

## Troubleshooting

### Issue: Polling Too Fast
**Solution**: Increase `POLL_INTERVAL_MS` in config

### Issue: State Resets During Poll
**Solution**: Check that polling callback preserves state

### Issue: Concurrent Requests
**Solution**: Verify `maxConcurrent: 1` is set

### Issue: Polling Doesn't Stop
**Solution**: Ensure `pollingManager.destroy()` is called on unmount

### Issue: UI Flickers
**Solution**: Use silent refresh: `fetchPage(page, true, true)`

## Best Practices

1. **Always use PollingManager** - Don't use raw `setInterval`
2. **Preserve user state** - Don't reset page/filter/search
3. **Use silent refresh** - Avoid UI flicker
4. **Stop when hidden** - Save resources
5. **Deduplicate requests** - Prevent spam
6. **Provide manual refresh** - Give users control
7. **Show last updated** - Keep users informed
8. **Clean up on unmount** - Prevent memory leaks

## API Reference

### PollingManager

```typescript
class PollingManager {
  constructor(callback: () => Promise<void>, config: PollingConfig);
  start(): void;
  stop(): void;
  refresh(): Promise<void>;
  destroy(): void;
  getLastPollTime(): number;
  isActive(): boolean;
}
```

### PollingConfig

```typescript
interface PollingConfig {
  interval: number;              // Poll interval in ms
  enableWhenHidden?: boolean;    // Poll when tab hidden
  hiddenInterval?: number;       // Interval when hidden
  maxConcurrent?: number;        // Max concurrent requests
}
```

### formatLastUpdated

```typescript
function formatLastUpdated(timestamp: number): string;
// Returns: "Just now", "5s ago", "2m ago", or "14:30:45"
```

## Performance Metrics

### Target Metrics

- ✅ Poll interval: 4 seconds
- ✅ Request duration: < 500ms
- ✅ UI update: < 100ms
- ✅ Memory stable: No leaks
- ✅ CPU usage: < 5% during polling

### Monitoring Tools

- Chrome DevTools Network tab
- React DevTools Profiler
- Performance tab
- Memory tab