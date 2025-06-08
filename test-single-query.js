#!/usr/bin/env node

import { OllamaMCPBridge } from './build/ollama-bridge.js';

async function testSingleQuery() {
    console.log('🔧 Testing single query: "Is my API running okay?"\n');

    const bridge = new OllamaMCPBridge();

    try {
        await bridge.connect();
        console.log('✅ Connected to MCP server\n');

        const response = await bridge.processWithTools('Is my API running okay?');
        console.log('🤖 Ollama Response:');
        console.log(response);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await bridge.disconnect();
    }
}

testSingleQuery();
