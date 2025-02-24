# FileSystem MCP Client

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](package.json)

A Node.js client implementation for interacting with the Filesystem MCP Server. This client provides a simple interface for performing filesystem operations using the Model Context Protocol.

## Features

- 📁 List directory contents with file/directory indicators
- ℹ️ Get detailed file information and metadata
- 🔌 MCP Server integration for filesystem operations
- 🔄 Automatic connection management

## Prerequisites

Before you begin, ensure you have:

- Node.js installed (v14 or higher)
- An AWS account with Bedrock access
- AWS credentials configured
- The MCP Filesystem Server package (`@modelcontextprotocol/server-filesystem`)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd file-system-agent
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

## Usage

The client provides two main operations:

### List Directory Contents

```javascript
const client = new FileSystemClient();
const contents = await client.listDirectory('/path/to/directory');
```

### Get File Information

```javascript
const client = new FileSystemClient();
const fileInfo = await client.getFileInfo('/path/to/file');
```

### Connection Management

The client automatically manages the connection to the MCP server:
- Connects on first operation
- Reuses existing connection for subsequent operations
- Provides disconnect method for cleanup

```javascript
const client = new FileSystemClient();
await client.disconnect(); // Clean up when done
```

## Technical Architecture

### Components

1. **FileSystemClient Class**
   - Manages MCP server connection
   - Provides high-level methods for filesystem operations
   - Handles connection lifecycle

2. **MCP Server Integration**
   - Uses stdio transport for server communication
   - Configures allowed directory access
   - Implements filesystem operation tools

### Project Structure
```
file-system-agent/
├── fileSystemClient.js  # Main client implementation
├── fileSystem.js # FileSystem agent implementation 
└── package.json        # Project configuration
```

## Dependencies

- @modelcontextprotocol/sdk - MCP protocol implementation
- @modelcontextprotocol/server-filesystem - Filesystem server implementation

## Configuration

The client is configured to work with files in the `/Users/kishan/Documents/HAI/cline` directory by default. To change the allowed directory, modify the `args` array in the `connect()` method:

```javascript
args: [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/path/to/your/directory"
]
```

## License

This project is licensed under the ISC License.
