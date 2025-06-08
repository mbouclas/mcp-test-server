#!/usr/bin/env node

/**
 * Simple test to verify Ollama connectivity without MCP server dependency
 */

import { OllamaMCPBridge } from './build/ollama-bridge.js';

async function testOllamaOnly() {
    console.log('🔧 Testing Ollama connectivity only...');

    const bridge = new OllamaMCPBridge();

    try {
        // Test 1: Direct Ollama chat without MCP connection
        console.log('\n1. Testing direct Ollama chat...');

        // Mock the getAvailableTools to avoid MCP connection
        bridge.getAvailableTools = async () => [
            { name: 'test_tool', description: 'A test tool' }
        ];

        const result = await bridge.chatWithOllama('Hello, can you respond with a short greeting?', 'gemma3:4b');
        console.log('✅ Ollama response:', result);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testOllamaOnly().catch(console.error);
