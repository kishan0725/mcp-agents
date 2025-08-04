# Weather MCP Server with Google OAuth Authentication

This is an HTTP-based MCP (Model Context Protocol) server that provides weather information using the National Weather Service API, secured with Google OAuth authentication.

## Features

- 🌤️ Get weather alerts for any US state
- 🌍 Get detailed weather forecasts by coordinates
- 🔐 **Google OAuth Authentication** - Secure access with Google tokens
- 🚀 HTTP transport with FastMCP 2.0
- 🐳 Docker support
- 📝 Request logging with user context

## Security

This server uses Google OAuth JWT tokens for authentication. All requests must include a valid `Authorization: Bearer <token>` header with a Google-issued JWT token.

### Authentication Flow

1. **Token Validation**: Server validates JWT tokens using Google's public keys
2. **User Context**: Each request logs the authenticated user's information
3. **Secure Access**: Only authenticated users can access weather tools

## Installation

### Prerequisites

- Python 3.12+
- Google OAuth 2.0 setup (optional for audience validation)

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration (Optional)

Copy the example environment file and configure if needed:

```bash
cp .env.example .env
```

Edit `.env` to set your Google OAuth Client ID (optional for stricter validation):

```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Run the Server

```bash
python weather.py
```

The server will start on `http://localhost:8123` by default with Google OAuth authentication enabled.

## Authentication Setup

### Google OAuth Configuration

The server is configured to accept JWT tokens issued by Google:

- **JWKS URI**: `https://www.googleapis.com/oauth2/v3/certs`
- **Issuer**: `https://accounts.google.com`
- **Algorithm**: `RS256`
- **Audience**: Optional (set via `GOOGLE_OAUTH_CLIENT_ID` env var)

### Getting Google OAuth Tokens

To test the server, you need a valid Google OAuth token. You can:

1. **Use Google OAuth Playground**: https://developers.google.com/oauthplayground/
2. **Create a web app**: Set up Google OAuth in your application
3. **Use the FastMCP universal OAuth client** (when available)

### Example Token Request

```bash
# Example request with Bearer token
curl -X POST http://localhost:8123/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GOOGLE_JWT_TOKEN" \
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

## Available Tools

All tools require Google OAuth authentication:

### 1. get_alerts

Get weather alerts for any US state.

**Parameters:**
- `state` (string): Two-letter US state code (e.g., "CA", "NY")

**Example:**
```json
{
  "name": "get_alerts",
  "arguments": {"state": "CA"}
}
```

### 2. get_forecast

Get detailed weather forecast for specific coordinates.

**Parameters:**
- `latitude` (float): Latitude coordinate
- `longitude` (float): Longitude coordinate

**Example:**
```json
{
  "name": "get_forecast",
  "arguments": {"latitude": 37.7749, "longitude": -122.4194}
}
```

## Command Line Options

```bash
python weather.py --help
```

Available options:
- `--port`: Port to listen on (default: 8123)
- `--host`: Host to bind to (default: 0.0.0.0)

## Docker Deployment

### Build and Run

```bash
# Build the image
docker build -t weather-mcp-auth .

# Run the container
docker run -p 8123:8123 weather-mcp-auth

# Run with environment variables
docker run -p 8123:8123 -e GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com weather-mcp-auth
```

### Docker Compose

```yaml
version: '3.8'
services:
  weather-mcp:
    build: .
    ports:
      - "8123:8123"
    environment:
      - GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Testing the Authentication

### 1. Without Token (Should Fail)

```bash
curl -X POST http://localhost:8123/mcp \
  -H "Content-Type: application/json" \
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

Expected: `401 Unauthorized`

### 2. With Valid Token (Should Work)

```bash
curl -X POST http://localhost:8123/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_VALID_GOOGLE_JWT" \
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

Expected: Weather alerts data with user logging

## Universal OAuth Client Integration

This server is designed to work with a universal OAuth client that can:

1. **Configure OAuth Provider**: Point to Google OAuth endpoints
2. **Handle Token Flow**: Manage Google OAuth 2.0 flow
3. **Store Tokens**: Maintain JWT tokens for MCP requests  
4. **Automatic Refresh**: Handle token renewal

### Example Client Configuration

```javascript
const mcpServer = {
  name: "Weather Service",
  url: "http://localhost:8123/mcp",
  oauth: {
    provider: "google",
    authUrl: "https://accounts.google.com/oauth/authorize",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email"],
    clientId: "your-client-id.apps.googleusercontent.com"
  }
}
```

## Logging and Monitoring

The server logs all authenticated requests with user context:

```
[INFO] Fetching weather alerts for CA - User: user@example.com
[INFO] Fetching weather forecast for coordinates (37.7749, -122.4194) - User: user@example.com
```

## Security Considerations

- ✅ **No Shared Secrets**: Server only needs Google's public keys
- ✅ **JWT Verification**: Cryptographic signature validation
- ✅ **User Context**: Every request tracks the authenticated user
- ✅ **Token Expiration**: Respects JWT expiration times
- ✅ **Issuer Validation**: Only accepts tokens from Google
- ⚠️ **HTTPS Recommended**: Use HTTPS in production
- ⚠️ **Token Storage**: Clients should securely store tokens

## Development vs Production

### Development
- Audience validation is optional
- Can use Google OAuth Playground tokens
- HTTP is acceptable for localhost

### Production
- Set `GOOGLE_OAUTH_CLIENT_ID` for audience validation
- Use HTTPS with proper certificates
- Implement proper token refresh in clients
- Consider rate limiting and monitoring

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if token is included in Authorization header
   - Verify token format: `Bearer <jwt_token>`
   - Ensure token is not expired

2. **Invalid Token**
   - Token must be issued by Google
   - Check token signature and claims
   - Verify token hasn't expired

3. **Network Issues**
   - Server needs internet access for Google JWKS
   - Check firewall settings
   - Verify Google's certificate endpoints are reachable

### Debug Mode

Add logging to see token validation details:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Architecture

This implementation demonstrates:

- **FastMCP 2.0 Authentication**: Built-in JWT verification
- **Google OAuth Integration**: Standard OIDC provider integration  
- **Secure MCP Pattern**: No shared secrets, public key validation
- **Production Ready**: Proper error handling and logging
- **Universal Client Ready**: Designed for OAuth client integration

## Next Steps

1. **Create Universal OAuth Client**: Web app for multi-provider OAuth
2. **Add More Providers**: Support Microsoft, Auth0, custom OIDC
3. **Scope-Based Permissions**: Different access levels per user
4. **Rate Limiting**: Per-user request limits
5. **Audit Logging**: Enhanced security logging

---

**Made with ☕️ using FastMCP 2.0 and Google OAuth**
