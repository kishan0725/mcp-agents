#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from 'dotenv';
import { WeatherClient } from './weatherClient.js';

dotenv.config();

const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-west-2'
});

const systemPrompt = `You are a helpful weather assistant. When users ask about weather, silently analyze their query and respond with ONLY a JSON object (no other text) that specifies:
1. The function to call (get_current_weather or get_weather_forecast)
2. The city name

Your response must be ONLY the JSON object, nothing else. For example:
{
    "function": "get_current_weather",
    "city": "London"
}

For non-weather queries, respond with normal text explaining that you can only help with weather information.`;

const weatherClient = new WeatherClient();

async function chat() {
    console.log(chalk.blue.bold('Welcome to WeatherChat!'));
    console.log(chalk.gray('Ask me about weather in any city!'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('- "What\'s the weather in Tokyo?"'));
    console.log(chalk.gray('- "Show me the forecast for London"'));
    console.log(chalk.gray('Type "exit" to quit\n'));

    while (true) {
        const { input } = await inquirer.prompt([{
            type: 'input',
            name: 'input',
            message: chalk.green('You:'),
            prefix: ''
        }]);

        if (input.toLowerCase() === 'exit') {
            console.log(chalk.blue('Goodbye!'));
            break;
        }

        try {
            // Ask Claude to analyze the query
            const prompt = {
                prompt: `\n\nHuman: ${systemPrompt}\n\nHuman: ${input}\n\nAssistant:`,
                max_tokens_to_sample: 1024,
                temperature: 0.7,
                stop_sequences: ["\n\nHuman:"]
            };

            const command = new InvokeModelCommand({
                modelId: "anthropic.claude-v2:1",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(prompt)
            });

            const response = await bedrockClient.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            const reply = responseBody.completion;
            console.log(chalk.blue('\nAssistant:'), reply.trim())

            try {
                // Parse Claude's response
                const parsedReply = JSON.parse(reply.trim());
                
                if (parsedReply.function && parsedReply.city) {
                    // Call the weather server using MCP client
                    const weatherData = await (parsedReply.function === 'get_current_weather' 
                        ? weatherClient.getCurrentWeather(parsedReply.city)
                        : weatherClient.getWeatherForecast(parsedReply.city));

                    // Format the response
                    const formatPrompt = {
                        prompt: `\n\nHuman: Format this weather data in a clean, readable format. ${
                            parsedReply.function === 'get_current_weather' 
                            ? 'Show temperature (°C), conditions, humidity (%), and wind speed (m/s) with proper labels.' 
                            : 'For each date in the forecast, show the date, temperature (°C), conditions, humidity (%), and wind speed (m/s) with proper labels.'
                        } Do not add any introductory text or other messages:\n${JSON.stringify(weatherData)}\n\nAssistant:`,
                        max_tokens_to_sample: 1024,
                        temperature: 0.7,
                        stop_sequences: ["\n\nHuman:"]
                    };

                    const formatCommand = new InvokeModelCommand({
                        modelId: "anthropic.claude-v2:1",
                        contentType: "application/json",
                        accept: "application/json",
                        body: JSON.stringify(formatPrompt)
                    });

                    const formatResponse = await bedrockClient.send(formatCommand);
                    const formatResponseBody = JSON.parse(new TextDecoder().decode(formatResponse.body));
                    console.log(chalk.blue('\n'), formatResponseBody.completion.trim());
                } else {
                    console.log(chalk.blue('\nAssistant:'), reply.trim());
                }
            } catch (e) {
                // Not a weather query
                console.log(chalk.blue('\nAssistant:'), reply.trim());
            }
        } catch (error) {
            console.error('Error:', error);
            console.log(chalk.red('\nSorry, I encountered an error. Please try again.'));
        }
    }
    // Cleanup
    await weatherClient.disconnect();
}

chat().catch(console.error);
