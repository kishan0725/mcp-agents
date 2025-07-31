# Weather MCP Server - Docker Deployment

This guide shows how to containerize and deploy the Weather MCP server using Docker.

## Files Created

- `Dockerfile` - Container definition
- `docker-compose.yml` - Easy deployment with Docker Compose
- `.dockerignore` - Optimizes build by excluding unnecessary files
- `README_Docker.md` - This documentation

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and run the container
docker compose up --build

# Run in background
docker compose up -d --build

# Stop the container
docker compose down
```

### Option 2: Using Docker Commands

```bash
# Build the image
docker build -t weather-mcp .

# Run the container
docker run -p 8123:8123 weather-mcp

# Run in background
docker run -d -p 8123:8123 --name weather-mcp-server weather-mcp
```

## Access the Server

Once running, the MCP server will be available at:

- **HTTP Streaming**: `http://localhost:8123/mcp`
- **SSE**: `http://localhost:8123/sse` (if FastMCP supports both)

## Test the Deployment

### Using the MCP Client

```bash
# Test with the Python client
python mcp_client.py http://localhost:8123/mcp

# Test a specific tool
python mcp_client.py http://localhost:8123/mcp --test
```

### Using curl

```bash
# Initialize connection
curl -X POST http://localhost:8123/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

## Configuration

### Environment Variables

You can customize the server using environment variables:

```bash
# Custom port
docker run -p 8080:8080 -e PORT=8080 weather-mcp

# Or in docker-compose.yml:
environment:
  - PORT=8080
```

### Command Line Arguments

The container supports these arguments:

- `--port`: Port to listen on (default: 8123)
- `--host`: Host to bind to (default: 0.0.0.0 for Docker)

```bash
# Custom arguments
docker run -p 9000:9000 weather-mcp python weather.py --port 9000
```

## Health Check

The container includes a health check that verifies the server is responding. View health status:

```bash
# Check container health
docker ps

# View health check logs
docker inspect weather-mcp-server
```

## Available Tools

The containerized server exposes these MCP tools:

1. **get_alerts** - Get weather alerts for US states
   - Parameter: `state` (2-letter US state code)

2. **get_forecast** - Get weather forecast for coordinates
   - Parameters: `latitude`, `longitude`

## Production Deployment

### With Reverse Proxy

For production, consider putting the container behind a reverse proxy:

```nginx
# Nginx configuration
server {
    listen 80;
    server_name your-domain.com;
    
    location /mcp {
        proxy_pass http://localhost:8123/mcp;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### With SSL

Use Let's Encrypt or similar for HTTPS in production.

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs weather-mcp-server

# Run interactively
docker run -it -p 8123:8123 weather-mcp /bin/bash
```

### Network issues

- Ensure port 8123 is available
- Check firewall settings
- Verify the container is binding to 0.0.0.0, not localhost

### Health check failing

The health check may fail if the FastMCP server doesn't have a `/health` endpoint. You can disable it in docker-compose.yml:

```yaml
# Remove or comment out the healthcheck section
# healthcheck:
#   test: ["CMD", "python", "-c", "import httpx; httpx.get('http://localhost:8123/health', timeout=5)"]
