# Weather Chat

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](package.json)

A command-line interface chatbot that provides real-time weather information and forecasts using natural language processing. Built with AWS Bedrock (Claude) for query understanding and MCP Server for weather data retrieval.

## Features

- 🌤️ Get current weather information for any city
- 📅 View weather forecasts
- 💬 Natural language query processing
- 🎨 Interactive CLI with colored output
- 🤖 AWS Bedrock (Claude) integration for smart query analysis
- 🔌 MCP Server integration for weather data

## Prerequisites

Before you begin, ensure you have:

- Node.js installed (v14 or higher)
- An AWS account with Bedrock access
- AWS credentials configured
- MCP Weather Server set up and running

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd weather-chat
```

2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create your environment file:
```bash
cp .env.local .env
```

2. Configure your .env file with the following:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
```

3. Update the MCP server location in weatherClient.js if needed:
```javascript
args: ["/path/to/your/weather-server/build/index.js"]
```

## Usage

1. Start the application:
```bash
npm start
```

2. Example queries:
- "What's the weather in Tokyo?"
- "Show me the forecast for London"
- Type "exit" to quit

The chatbot will:
- Analyze your query using Claude
- Fetch weather data through the MCP server
- Present formatted results with temperature, conditions, humidity, and wind speed

## Technical Architecture

### Components

1. **chat.js (Main Application)**
   - Handles CLI interface using inquirer
   - Integrates with AWS Bedrock for query processing
   - Manages user interactions and response formatting

2. **weatherClient.js (MCP Client)**
   - Implements MCP client functionality
   - Manages connection to weather server
   - Provides methods for current weather and forecasts

3. **AWS Bedrock Integration**
   - Uses Claude v2 model for natural language understanding
   - Processes user queries into structured commands
   - Formats weather data into readable responses

4. **MCP Server Communication**
   - Handles weather data retrieval
   - Provides standardized weather information interface
   - Manages server connections and disconnections

## Dependencies

- @aws-sdk/client-bedrock-runtime - AWS Bedrock integration
- @modelcontextprotocol/sdk - MCP protocol implementation
- chalk - Terminal styling
- dotenv - Environment configuration
- inquirer - Interactive CLI interface

## Development

### Project Structure
```
weather-chat/
├── chat.js           # Main application entry
├── weatherClient.js  # MCP client implementation
├── .env.local        # Environment template
└── package.json      # Project configuration
```

## License

This project is licensed under the ISC License.
