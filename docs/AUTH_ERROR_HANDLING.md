# Auth Error Handling Guide

## Overview

This document describes the authentication error handling system implemented in FE-STG12-003.

## Key Features

### 1. Consistent 401/403 Handling

All authentication errors (401 Unauthorized, 403 Forbidden) are handled consistently across the application:

- **Clear token** from localStorage immediately
- **Show user-friendly message** via toast notification
- **Redirect to /login** after a short delay
- **Prevent redirect loops** with flag system

### 2. Clean Logout Flow

The logout action properly cleans up all auth state:

```typescript
// Usage
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { logout } = useAuth();
  
  return <button onClick={logout}>Logout</button>;
}
```

**Logout process:**
1. Clear token from localStorage
2. Clear user state from context
3. Show success toast
4. Redirect to /login

### 3. Token Presence Check

On app load, the system checks for token presence:

- **No token** → Redirect to /login (for protected pages)
- **Token exists** → Allow access, validate on first API call
- **Invalid token** → Clear and redirect with message

### 4. Safe Error Messages

Never expose sensitive data in error messages:

- **No raw server errors** displayed to users
- **No token values** in logs or UI
- **RequestId included** for support tracking
- **User-friendly messages** in Vietnamese

## Implementation Details

### Auth Error Handler (`lib/authErrorHandler.ts`)

Central utility for handling auth errors:

```typescript
import { handleAuthError } from '../lib/authErrorHandler';

// In API calls
if (response.status === 401 || response.status === 403) {
  handleAuthError({
    status: response.status,
    message: "Authentication failed",
    requestId: "req_123456"
  });
}
```

### API Client Interceptor

Axios interceptor automatically handles auth errors:

```typescript
// Automatically applied to all axios requests
axiosInstance.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      handleAuthError({...});
    }
    return Promise.reject(error);
  }
);
```

### Video Service Integration

All video service functions use consistent error handling:

```typescript
export async function fetchVideosCursor(params) {
  const requestId = generateRequestId();
  
  const response = await fetch(url, {
    headers: {
      "X-Request-Id": requestId,
      "Authorization": `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      handleAuthError({
        status: response.status,
        message: "Authentication failed",
        requestId
      });
    }
    throw new Error(getSafeErrorMessage(error, requestId));
  }
}
```

## Error Flow Diagram

```
API Call with Token
       ↓
   Response 401/403?
       ↓ Yes
   handleAuthError()
       ↓
   ├─ Clear localStorage token
   ├─ Dispatch 'auth:token-expired' event
   ├─ Show toast: "Phiên đăng nhập đã hết hạn"
   └─ Redirect to /login (after 1.5s)
       ↓
   AuthContext receives event
       ↓
   Clear token & user state
       ↓
   User sees login page
```

## Testing Scenarios

### 1. Normal Logout
```
1. User clicks logout button
2. Confirmation dialog appears
3. User confirms
4. Toast: "Đã đăng xuất thành công"
5. Redirect to /login
6. Cannot access dashboard without login
```

### 2. Invalid Token
```
1. Edit localStorage: aiclipx_token = "invalid"
2. Refresh page
3. First API call returns 401
4. Toast: "Phiên đăng nhập đã hết hạn"
5. Auto redirect to /login
6. Token cleared from localStorage
```

### 3. Token Expiry During Use
```
1. User is on dashboard
2. Token expires on server
3. Next API call returns 401
4. Toast: "Phiên đăng nhập đã hết hạn"
5. Auto redirect to /login
6. No stuck state or loops
```

## Security Features

### No Sensitive Data Exposure

- ✅ Tokens never logged to console
- ✅ Tokens never displayed in UI
- ✅ Raw server errors sanitized
- ✅ Only safe messages shown to users

### Request Tracking

- ✅ Every API call has unique requestId
- ✅ RequestId shown in error messages
- ✅ RequestId logged for debugging
- ✅ Format: `req_timestamp_random`

### Redirect Loop Prevention

- ✅ Flag system prevents multiple redirects
- ✅ Timer-based redirect (1.5s delay)
- ✅ Event-based state synchronization
- ✅ Single source of truth for auth state

## Usage Examples

### Using Logout Button

```tsx
import LogoutButton from '../components/common/LogoutButton';

function Header() {
  return (
    <div>
      <LogoutButton variant="button" showIcon={true} />
    </div>
  );
}
```

### Checking Auth Status

```tsx
import { useAuth } from '../contexts/AuthContext';

function ProtectedPage() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Protected content</div>;
}
```

### Handling API Errors

```tsx
try {
  await createVideoTask(payload);
} catch (error) {
  // Auth errors handled automatically
  // Just show user-friendly message
  const message = getSafeErrorMessage(error, requestId);
  toastError(message);
}
```

## Troubleshooting

### Issue: Redirect Loop
**Solution**: Check that `isRedirecting` flag is working properly in `authErrorHandler.ts`

### Issue: Token Not Cleared
**Solution**: Verify `handleAuthError()` is called on 401/403 responses

### Issue: No Toast Message
**Solution**: Ensure Toast component is imported and working

### Issue: Multiple Redirects
**Solution**: Check that only one place calls `router.push('/login')` per error

## Best Practices

1. **Always use handleAuthError()** for 401/403 responses
2. **Include requestId** in all API calls
3. **Use getSafeErrorMessage()** for user-facing errors
4. **Never log tokens** or sensitive data
5. **Test with invalid tokens** regularly
6. **Monitor redirect loops** in production