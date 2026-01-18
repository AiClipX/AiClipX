# Evidence Capture Guide with Jam

## Overview

This guide explains how to capture evidence for bug reports and feature reviews using Evidence Mode and Jam.dev.

## What is Evidence Mode?

Evidence Mode is a developer tool that displays:
- **RequestID** for every API call
- **Last 5 API calls** with method, endpoint, status, and requestId
- **Real-time tracking** of all network requests
- **Copy-to-clipboard** functionality for easy sharing

## How to Enable Evidence Mode

### Method 1: URL Parameter
Add `?evidence=true` to any URL:
```
https://www.aiclipgo.com/dashboard?evidence=true
```

### Method 2: Toggle Button
Click the "Evidence OFF/ON" button in the bottom-left corner of the screen.

### Method 3: Browser Console
```javascript
localStorage.setItem('evidence_mode', 'true');
// Then refresh the page
```

## What to Record with Jam

### 1. Setup Jam.dev
1. Install Jam extension: https://jam.dev
2. Sign up for free account
3. Configure privacy settings

### 2. What to Capture

#### ✅ DO Record:
- **User actions**: Clicks, form inputs, navigation
- **RequestIDs**: Visible in Evidence Mode panel
- **Error messages**: User-friendly messages only
- **Status codes**: 200, 201, 401, 403, 500, etc.
- **Timestamps**: When actions occurred
- **UI state**: Loading, success, error states

#### ❌ DON'T Record:
- **Tokens**: Authentication tokens
- **Passwords**: User credentials
- **Personal data**: Emails, phone numbers (mask them)
- **API keys**: Any sensitive keys
- **Full payloads**: Request/response bodies

### 3. Recording Workflow

#### For Bug Reports:
```
1. Enable Evidence Mode
2. Start Jam recording
3. Reproduce the bug
4. Show Evidence Mode panel with RequestID
5. Highlight the error message
6. Stop recording
7. Add Jam link to bug report
```

#### For Feature Reviews:
```
1. Enable Evidence Mode
2. Start Jam recording
3. Perform the feature workflow:
   - Create action → Show RequestID
   - List action → Show RequestID
   - Detail action → Show RequestID
4. Show Evidence Mode panel with all calls
5. Stop recording
6. Add Jam link to review comment
```

## Evidence Mode Panel Features

### Last Action Section
- Shows the most recent API call
- Highlighted in yellow for visibility
- Displays:
  - HTTP method (GET, POST, DELETE, etc.)
  - Status code with color coding
  - Endpoint path
  - RequestID (clickable to copy)

### API Calls History
- Shows last 5 API calls
- Each call displays:
  - Timestamp
  - Method and status
  - Endpoint
  - RequestID
  - Error message (if failed)
- Color coding:
  - 🟢 Green: 2xx success
  - 🟡 Yellow: 4xx client errors
  - 🔴 Red: 5xx server errors

### Copy RequestID
- Click clipboard icon next to any RequestID
- "Copied!" confirmation appears
- Paste into bug reports or support tickets

## Example Evidence Packages

### Example 1: Create Video Success
```
Recording: https://jam.dev/c/abc123
Steps:
1. Navigate to dashboard
2. Click "Create Video"
3. Fill form with title and prompt
4. Submit
5. Show RequestID: req_1234567890_abc123
6. Status: 201 Created
```

### Example 2: Auth Error
```
Recording: https://jam.dev/c/def456
Steps:
1. Edit localStorage token to invalid value
2. Refresh page
3. Try to access dashboard
4. Show error: "Phiên đăng nhập đã hết hạn"
5. Show RequestID: req_1234567891_def456
6. Status: 401 Unauthorized
7. Redirected to login
```

### Example 3: List Videos
```
Recording: https://jam.dev/c/ghi789
Steps:
1. Navigate to dashboard
2. Videos list loads
3. Show Evidence Mode panel
4. RequestID: req_1234567892_ghi789
5. Status: 200 OK
6. 10 videos displayed
```

## Masking Sensitive Data

### In Jam:
1. Use Jam's built-in blur tool
2. Blur tokens in localStorage view
3. Blur email addresses
4. Blur any personal information

### In Screenshots:
1. Use image editor to blur/redact
2. Replace with placeholders:
   - Token: `***REDACTED***`
   - Email: `user@example.com`
   - Phone: `+84 xxx xxx xxx`

## Where to Paste Jam Links

### GitHub Issues:
```markdown
## Evidence
- Jam Recording: https://jam.dev/c/abc123
- RequestID: req_1234567890_abc123
- Status: 401 Unauthorized
```

### Jira Tickets:
```
Evidence:
Jam Link: https://jam.dev/c/abc123
RequestID: req_1234567890_abc123
Environment: Staging
```

### Slack/Discord:
```
🐛 Bug found!
📹 Recording: https://jam.dev/c/abc123
🔍 RequestID: req_1234567890_abc123
❌ Status: 500 Internal Server Error
```

## Troubleshooting

### Evidence Mode Not Showing
- Check if `?evidence=true` is in URL
- Check localStorage: `localStorage.getItem('evidence_mode')`
- Try toggling the button
- Refresh the page

### RequestID Not Appearing
- Check if API call completed
- Look in Evidence Mode panel
- Check browser console for errors
- Verify API response headers

### Jam Not Recording
- Check Jam extension is installed
- Check permissions are granted
- Try restarting browser
- Check Jam.dev status page

## Best Practices

1. **Always enable Evidence Mode** before recording
2. **Show RequestID** for every important action
3. **Mask sensitive data** before sharing
4. **Include context** in Jam description
5. **Test the Jam link** before submitting
6. **Add timestamps** for long recordings
7. **Keep recordings short** (< 2 minutes)
8. **Focus on the issue** - don't record unnecessary steps

## Quick Reference

| Action | Shortcut |
|--------|----------|
| Enable Evidence Mode | Click toggle or `?evidence=true` |
| Copy RequestID | Click clipboard icon |
| Clear history | Click X in panel header |
| Collapse panel | Click chevron icon |
| Start Jam recording | Click Jam extension |
| Stop Jam recording | Click Jam extension again |

## Support

If you need help with evidence capture:
1. Check this guide first
2. Ask in #dev-support channel
3. Contact DevOps team
4. Email: support@aiclipx.com