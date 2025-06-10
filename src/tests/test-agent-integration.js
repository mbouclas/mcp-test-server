#!/usr/bin/env node

/**
 * Agent Integration Demo - Test the new agent architecture
 * This script demonstrates the enhanced MCP server with intelligent agent routing
 */

import { AgentManager } from '../../build/agents/agent-manager.js';
import { OllamaMCPBridge } from '../../build/ollama-bridge.js';

async function runAgentDemo() {
    console.log('🤖 Agent Integration Demo\n');
    console.log('Testing the new agent architecture with weather tools...\n');

    let bridge;
    let agentManager;

    try {
        // Initialize the MCP bridge
        console.log('🔗 Connecting to MCP server...');
        bridge = new OllamaMCPBridge();
        await bridge.connect();
        console.log('✅ Connected to MCP server\n');

        // Initialize agent manager
        console.log('🤖 Initializing Agent Manager...');
        agentManager = new AgentManager(bridge);
        console.log('✅ Agent Manager initialized\n');

        // Display available agents
        console.log('📋 Available Agents:');
        const agents = agentManager.getAvailableAgents();
        for (const [key, agent] of Object.entries(agents)) {
            console.log(`  - ${key}: ${agent.description}`);
            console.log(`    Tools: ${agent.tools.join(', ')}`);
        }
        console.log('');

        // Test weather agent routing
        console.log('🌤️  Testing Weather Agent Routing:');
        console.log('='.repeat(50));

        const weatherTests = [
            "What's the weather like in Tokyo?",
            "Will it rain tomorrow in London?",
            "What's the temperature in New York in Fahrenheit?",
            "Show me the weather forecast for Paris this week",
            "Is it sunny in Sydney right now?"
        ];

        for (const [index, testMessage] of weatherTests.entries()) {
            console.log(`\n${index + 1}. Testing: "${testMessage}"`);
            console.log('-'.repeat(40));

            try {
                const result = await agentManager.routeMessage(testMessage, `demo-${index}`);

                console.log(`🎯 Routed to: ${result.agentUsed}`);
                console.log(`🔧 Tools used: ${result.toolsUsed.join(', ') || 'none'}`);
                console.log(`📊 Confidence: ${result.routing.confidence}`);
                console.log(`💭 Reason: ${result.routing.reason}`);
                console.log(`📝 Response: ${result.response.substring(0, 150)}${result.response.length > 150 ? '...' : ''}`);

            } catch (error) {
                console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Test direct weather agent usage
        console.log('\n\n🎯 Testing Direct Weather Agent Usage:');
        console.log('='.repeat(50));

        const weatherAgent = agentManager.getAgent('weather');
        if (weatherAgent) {
            console.log('\n📍 Direct weather query for multiple locations...');

            const locations = ['Tokyo', 'London', 'New York'];

            for (const location of locations) {
                try {
                    console.log(`\n🌍 Getting weather for ${location}:`);
                    const result = await weatherAgent.getWeather(location, {
                        units: 'metric',
                        forecast: true
                    });
                    console.log(result.substring(0, 200) + '...');
                } catch (error) {
                    console.error(`❌ Error for ${location}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }

        // Test conversation continuity
        console.log('\n\n💬 Testing Conversation Continuity:');
        console.log('='.repeat(50));

        const conversationId = 'continuity-test';
        const conversationTests = [
            "What's the weather in Berlin?",
            "What about the forecast?",
            "And what about tomorrow?",
            "Should I bring an umbrella?"
        ];

        for (const [index, message] of conversationTests.entries()) {
            console.log(`\n${index + 1}. "${message}"`);

            try {
                const result = await agentManager.routeMessage(message, conversationId);
                console.log(`🤖 ${result.agentUsed}: ${result.response.substring(0, 100)}...`);
            } catch (error) {
                console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Test fallback to general processing
        console.log('\n\n🔄 Testing Fallback to General Processing:');
        console.log('='.repeat(50));

        const generalTests = [
            "What is 25 factorial?",
            "Check the service health",
            "What's the current time?"
        ];

        for (const testMessage of generalTests) {
            console.log(`\n📝 Testing: "${testMessage}"`);

            try {
                const result = await agentManager.routeMessage(testMessage, 'general-test');
                console.log(`🎯 Routed to: ${result.agentUsed}`);
                console.log(`🔧 Tools used: ${result.toolsUsed.join(', ') || 'none'}`);
                console.log(`📝 Response: ${result.response.substring(0, 150)}...`);
            } catch (error) {
                console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        console.log('\n\n✅ Agent Demo completed successfully!');
        console.log('\n🎉 Key Features Demonstrated:');
        console.log('  ✓ Intelligent agent routing based on message content');
        console.log('  ✓ Specialized weather agent with tool integration');
        console.log('  ✓ Conversation continuity and context management');
        console.log('  ✓ Fallback to general MCP processing');
        console.log('  ✓ Multiple conversation sessions');
        console.log('  ✓ Tool usage tracking and reporting');

    } catch (error) {
        console.error('\n❌ Demo failed:', error instanceof Error ? error.message : 'Unknown error');
        console.error('\nMake sure:');
        console.error('  1. MCP server is built (npm run build)');
        console.error('  2. Ollama is running (ollama serve)');
        console.error('  3. All dependencies are installed (npm install)');
    } finally {
        // Cleanup
        if (bridge) {
            try {
                await bridge.disconnect();
                console.log('\n🔐 Disconnected from MCP server');
            } catch (error) {
                console.error('Error disconnecting:', error);
            }
        }
    }
}

// Run the demo
runAgentDemo().catch(console.error);
