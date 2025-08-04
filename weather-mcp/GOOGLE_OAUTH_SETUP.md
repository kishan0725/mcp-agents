# Google OAuth Setup for Weather MCP Server

This guide shows how to configure Google Cloud Console for OAuth client registration to work with the weather MCP server and universal OAuth client.

## Google Cloud Console Configuration

### 1. Application Settings

- **Application type**: `Web application` ✅ (Already correct)
- **Name**: `MCPClient1` ✅ (Good descriptive name)

### 2. Authorized JavaScript Origins

Add these origins for the universal OAuth client frontend:

```
http://localhost:3000
http://localhost:8080
http://localhost:5173
https://your-mcp-client-domain.com
```

**Why these URLs?**
- `localhost:3000` - Common React/Next.js dev server port
- `localhost:8080` - Common web dev server port
- `localhost:5173` - Vite dev server default port
- `your-domain.com` - Your production domain (replace with actual)

### 3. Authorized Redirect URIs

Add these redirect URIs for OAuth callback:

```
http://localhost:3000/auth/callback
http://localhost:8080/auth/callback
http://localhost:5173/auth/callback
https://your-mcp-client-domain.com/auth/callback
```

**For Testing Only** (optional):
```
https://developers.google.com/oauthplayground
```

## Complete Configuration Example

```
Application type: Web application
Name: MCPClient1

Authorized JavaScript origins:
+ http://localhost:3000
+ http://localhost:8080  
+ http://localhost:5173
+ https://your-production-domain.com

Authorized redirect URIs:
+ http://localhost:3000/auth/callback
+ http://localhost:8080/auth/callback
+ http://localhost:5173/auth/callback
+ https://your-production-domain.com/auth/callback
+ https://developers.google.com/oauthplayground (for testing)
```

## After Creating the Client

1. **Copy the Client ID**: You'll get a client ID like `123456789.apps.googleusercontent.com`

2. **Update Environment Variables**:
   ```bash
   # In weather-mcp/.env
   GOOGLE_OAUTH_CLIENT_ID=123456789.apps.googleusercontent.com
   ```

3. **Update Universal OAuth Client Config**:
   ```javascript
   const mcpServer = {
     name: "Weather Service",
     url: "http://localhost:8123/mcp",
     oauth: {
       provider: "google",
       clientId: "123456789.apps.googleusercontent.com",
       authUrl: "https://accounts.google.com/oauth/authorize",
       tokenUrl: "https://oauth2.googleapis.com/token",
       scopes: ["openid", "email", "profile"],
       redirectUri: "http://localhost:3000/auth/callback"
     }
   }
   ```

## Testing the Setup

### Option 1: Google OAuth Playground (Immediate Testing)

1. Go to: https://developers.google.com/oauthplayground/
2. Click the gear icon (⚙️) in top-right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID (leave Client Secret blank)
5. In left panel, select:
   - `Google OAuth2 API v2` → `https://www.googleapis.com/auth/userinfo.email`
   - `Google OAuth2 API v2` → `https://www.googleapis.com/auth/userinfo.profile`
6. Click "Authorize APIs"
7. Copy the Access Token
8. Test with weather server:

```bash
curl -X POST http://localhost:8123/mcp/ \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_alerts",
      "arguments": {"state": "CA"}
    }
  }'
```

### Option 2: Quick Test Script

Run our test script to verify the setup works:

```bash
cd weather-mcp
# Set your client ID
export GOOGLE_OAUTH_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
python test_auth.py
```

## Universal OAuth Client Architecture

This setup enables the universal OAuth client to:

1. **Handle Multiple Providers**: Google is just one provider
2. **Manage Token Storage**: Store and refresh tokens automatically  
3. **Route to MCP Servers**: Send authenticated requests to weather server
4. **User-Friendly Interface**: Web UI for OAuth configuration

### Example Client Configuration UI

```javascript
// Universal OAuth Client - Server Configuration
const servers = [
  {
    name: "Weather Service",
    url: "http://localhost:8123/mcp/",
    description: "Get weather alerts and forecasts",
    oauth: {
      provider: "google",
      clientId: "123456789.apps.googleusercontent.com",
      scopes: ["openid", "email"],
      // Auto-configured based on provider
      authUrl: "https://accounts.google.com/oauth/authorize",
      tokenUrl: "https://oauth2.googleapis.com/token"
    },
    tools: [
      { name: "get_alerts", description: "Get weather alerts for US states" },
      { name: "get_forecast", description: "Get weather forecast for coordinates" }
    ]
  }
  // Add more MCP servers here...
];
```

## Security Notes

✅ **Client ID is Public**: Safe to include in frontend JavaScript
✅ **No Client Secret**: Our server validates using Google's public keys
✅ **HTTPS Required**: Use HTTPS for production redirect URIs
⚠️ **Scope Permissions**: Only request necessary scopes
⚠️ **Domain Validation**: Google validates redirect URIs match registered domains

## Next Steps

1. **Create OAuth Client** in Google Console with above settings
2. **Test with OAuth Playground** to get a real token
3. **Build Universal OAuth Client** frontend for user-friendly management
4. **Add More Providers** (Microsoft, Auth0, etc.) following same pattern

The weather MCP server is now ready for production OAuth authentication! 🔐✨
