#!/usr/bin/env node

import { OllamaMCPBridge } from '../../build/ollama-bridge.js';
import { createInterface } from 'readline';

/**
 * Interactive chat with Ollama using MCP tools
 * This script allows you to chat with Ollama while having access to your MCP service tools
 */

class InteractiveChat {
    constructor() {
        this.bridge = new OllamaMCPBridge();
        this.rl = createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    async start() {
        console.log('🚀 Starting Interactive MCP + Ollama Chat\n');
        console.log('This chat connects Ollama to your MCP service tools.');
        console.log('Type "exit" to quit, "tools" to see available tools.\n');

        try {
            // Connect to MCP server
            console.log('Connecting to MCP server...');
            await this.bridge.connect();
            console.log('✅ Connected to MCP server');

            // Show available tools
            const tools = await this.bridge.getAvailableTools();
            console.log('\n📋 Available tools:');
            tools.forEach(tool => {
                console.log(`   - ${tool.name}: ${tool.description}`);
            });

            console.log('\n💬 You can now chat with Ollama. Try asking:');
            console.log('   - "Is my API running okay?"');
            console.log('   - "Check the health of my service"');
            console.log('   - "Query my database"');
            console.log('   - "What\'s the status of my service?"\n');

            await this.chatLoop();

        } catch (error) {
            console.error('❌ Error starting chat:', error.message);
        } finally {
            await this.cleanup();
        }
    }

    async chatLoop() {
        while (true) {
            const userInput = await this.getUserInput('\n🤖 You: ');

            if (userInput.toLowerCase() === 'exit') {
                console.log('👋 Goodbye!');
                break;
            }

            if (userInput.toLowerCase() === 'tools') {
                const tools = await this.bridge.getAvailableTools();
                console.log('\n📋 Available tools:');
                tools.forEach(tool => {
                    console.log(`   - ${tool.name}: ${tool.description}`);
                });
                continue;
            }

            if (userInput.trim() === '') {
                continue;
            }

            console.log('\n🔄 Processing with MCP tools and Ollama...');

            try {
                const response = await this.bridge.processWithTools(userInput);
                console.log('\n🤖 Ollama: ' + response);
            } catch (error) {
                console.error('\n❌ Error:', error.message);
            }
        }
    }

    getUserInput(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer);
            });
        });
    }

    async cleanup() {
        this.rl.close();
        await this.bridge.disconnect();
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n\n👋 Goodbye!');
    process.exit(0);
});

// Start the interactive chat
const chat = new InteractiveChat();
chat.start().catch(console.error);
