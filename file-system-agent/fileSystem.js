#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import dotenv from 'dotenv';
import { FileSystemClient } from './fileSystemClient.js';

dotenv.config();

const bedrockClient = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-west-2'
});

const systemPrompt = `You are a helpful file system assistant. When users ask about any file/directory related queries, silently analyze their query and respond with ONLY a JSON object (no other text) that specifies:
1. The function to call (list_directory or get_file_info)
2. path to directory or file

Your response must be ONLY the JSON object, nothing else. For example:
{
    "function": "list_directory",
    "city": "/path/to/file/or/directory"
}

IMPORTANT: For now, you have access to only list_directory and get_file_info functions. For tasks that are not suitable for these functions, respond with normal text explaining that you can only help with file/directory information.

For queries that are not related to file system, respond with normal text explaining that you can only help with file/directory information.`;

const fileSystemClient = new FileSystemClient();

async function chat() {
    console.log(chalk.blue.bold('Welcome to FileSystemChat!'));
    console.log(chalk.gray('Ask me about any file or directory related questions!'));
    console.log(chalk.gray('Examples:'));
    console.log(chalk.gray('- "What file do I have under /path/to/directory?"'));
    console.log(chalk.gray('- "What is the size of file /path/to/file?"'));
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
            console.log(chalk.yellow('\nAssistant:'), reply.trim())

            try {
                // Parse Claude's response
                const parsedReply = JSON.parse(reply.trim());
                
                if (parsedReply.function && parsedReply.path) {
                    // Call the file server using MCP client
                    const fileSystemData = await (parsedReply.function === 'list_directory' 
                        ? fileSystemClient.listDirectory(parsedReply.path)
                        : fileSystemClient.getFileInfo(parsedReply.path));
                    
                    console.log(chalk.yellow('\nTool Data:'), fileSystemData);
                    // Format the response
                    const formatPrompt = {
                        prompt: `\n\nHuman: Format this file/directory data in a clean, readable format.
                        Do not add any introductory text or other messages:\n${JSON.stringify(fileSystemData)}\n\nAssistant:`,
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
                // Not a file system query
                console.log(chalk.blue('\nAssistant:'), reply.trim());
            }
        } catch (error) {
            console.error('Error:', error);
            console.log(chalk.red('\nSorry, I encountered an error. Please try again.'));
        }
    }
    // Cleanup
    await fileSystemClient.disconnect();
}

chat().catch(console.error);
