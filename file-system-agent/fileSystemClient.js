import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class FileSystemClient {
    constructor() {
        this.client = null;
    }

    async connect() {
        if (this.client) return;

        const transport = new StdioClientTransport({
            command: "npx",
            args: [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                "/Users/kishan/Documents/HAI/cline",
                "/Users/kishan/Documents/HAI/modernize-api"
            ]
        });

        this.client = new Client(
            {
                name: "file-system-client",
                version: "1.0.0"
            },
            {
                capabilities: {
                    prompts: {},
                    resources: {},
                    tools: {}
                }
            }
        );

        await this.client.connect(transport);
    }

    async listDirectory(path) {
        console.log("Calling list_directory tool")
        await this.connect();
        return this.client.callTool({
            name: "list_directory",
            arguments: { path }
        });
    }

    async getFileInfo(path) {
        await this.connect();
        return this.client.callTool({
            name: "get_file_info",
            arguments: { path }
        });
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }
}
