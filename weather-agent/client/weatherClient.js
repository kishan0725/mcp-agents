import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class WeatherClient {
    constructor() {
        this.client = null;
    }

    async connect() {
        if (this.client) return;

        const transport = new StdioClientTransport({
            command: "node",
            args: ["/Users/kishan/Documents/HAI/POCs/MCP/weather-mcp-server/build/index.js"]
        });

        this.client = new Client(
            {
                name: "weather-chat-client",
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

    async getCurrentWeather(city) {
        console.log("Calling get_current_weather tool")
        await this.connect();
        return this.client.callTool({
            name: "get_current_weather",
            arguments: { city }
        });
    }

    async getWeatherForecast(city) {
        await this.connect();
        return this.client.callTool({
            name: "get_weather_forecast",
            arguments: { city }
        });
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }
}
