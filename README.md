# Model Context Protocol (MCP)

A protocol implementation that enables AI models to interact with external tools and resources through standardized interfaces. This repository contains reference implementations of MCP agents for file system operations and weather data retrieval.

## Project Structure

```
mcp/
├── file-system-agent/    # File system operations agent
│   ├── fileSystem.js     # Core implementation
│   └── fileSystemClient.js # Client interface
│
└── weather-agent/        # Weather data agent
    ├── client/          # Weather chat client
    │   ├── chat.js      # CLI interface
    │   └── weatherClient.js
    └── server/          # Weather data server
        └── src/         # Server implementation
```

## Available Agents

### 1. File System Agent
- 📁 List directory contents
- ℹ️ Get file information and metadata
- 🔌 Standardized filesystem operations
- 🔄 Automatic connection management

[Learn more about File System Agent](file-system-agent/README.md)

### 2. Weather Agent
- 🌤️ Real-time weather information
- 📅 5-day weather forecasts
- 💬 Natural language query processing (client)
- 🤖 AWS Bedrock (Claude) integration (client)
- 🌍 OpenWeather API integration (server)

- [Weather Client Documentation](weather-agent/client/README.md)
- [Weather Server Documentation](weather-agent/server/README.md)

## Getting Started

### Prerequisites
- Node.js v14 or higher
- AWS account with Bedrock access (for Weather Chat client)
- OpenWeather API key (for Weather Server)
- AWS credentials configured

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp
```

2. Install dependencies for each agent:

```bash
# File System Agent
cd file-system-agent
npm install

# Weather Client
cd ../weather-agent/client
npm install

# Weather Server
cd ../server
npm install
npm run build
```

## Integration with Claude Desktop

To use these agents with Claude Desktop, add their configurations to your Claude Desktop settings:

On MacOS:
```bash
# Edit ~/Library/Application Support/Claude/claude_desktop_config.json
```

On Windows:
```bash
# Edit %APPDATA%/Claude/claude_desktop_config.json
```

Example configuration:
```json
{
  "mcpServers": {
    "file-system": {
      "command": "node",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/allowed/directory"
      ]
    },
    "weather-server": {
      "command": "/path/to/weather-server/build/index.js",
      "env": {
        "OPENWEATHER_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Development

Each agent in this repository follows MCP specifications for tool and resource implementations. Refer to individual agent documentation for specific development guidelines and requirements.

## License

This project is licensed under the ISC License.
