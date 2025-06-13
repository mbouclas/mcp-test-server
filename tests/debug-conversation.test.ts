// Debug test to understand the conversation history issue
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { AgentManager } from '../src/agents/agent-manager.js';
import { OllamaMCPBridge } from '../src/ollama-bridge.js';

// Mock the OllamaMCPBridge
jest.mock('../src/ollama-bridge.js');
const MockOllamaMCPBridge = jest.mocked(OllamaMCPBridge);

describe('Debug Conversation History', () => {
    let mockBridge: jest.Mocked<OllamaMCPBridge>;
    let agentManager: AgentManager; beforeEach(() => {
        jest.clearAllMocks();
        mockBridge = new MockOllamaMCPBridge() as jest.Mocked<OllamaMCPBridge>;

        // Setup default mock implementations
        mockBridge.callTool = jest.fn<(name: string, args: any) => Promise<string>>().mockResolvedValue('Mocked weather data for requested location');
        mockBridge.chatWithOllama = jest.fn<(message: string, model?: string) => Promise<string>>().mockResolvedValue('Mocked weather response from Ollama');
        mockBridge.processWithTools = jest.fn<(userMessage: string, model?: string) => Promise<string>>().mockResolvedValue('Mocked processWithTools response');
        mockBridge.getAvailableTools = jest.fn<() => Promise<any[]>>().mockResolvedValue([
            { name: 'weather_info', description: 'Get weather information' },
            { name: 'get_datetime', description: 'Get current date and time' }
        ]);

        agentManager = new AgentManager(mockBridge);
    });

    afterEach(() => {
        // Clear agent manager and bridge references
        if (agentManager) {
            agentManager = null as any;
        }
        if (mockBridge) {
            mockBridge = null as any;
        }
    });

    test('debug conversation history step by step', async () => {
        console.log('=== Step 1: Initial request ===');
        await agentManager.routeMessage('Weather in Tokyo?', 'session1');

        let history1 = agentManager.getAgentHistory('weather', 'session1');
        console.log('History after first message:', history1.length, history1.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' })));

        console.log('=== Step 2: Request for London ===');
        await agentManager.routeMessage('Weather in London?', 'session2');

        let history2 = agentManager.getAgentHistory('weather', 'session2');
        console.log('History session2 after first message:', history2.length, history2.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' })));

        console.log('=== Step 3: Follow-up request ===');
        await agentManager.routeMessage('What about tomorrow?', 'session1');

        history1 = agentManager.getAgentHistory('weather', 'session1');
        console.log('History session1 after follow-up:', history1.length, history1.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' })));

        history2 = agentManager.getAgentHistory('weather', 'session2');
        console.log('History session2 (unchanged):', history2.length, history2.map(m => ({ role: m.role, content: m.content.substring(0, 50) + '...' })));

        // Expected: session1 should have 4 messages, session2 should have 2
        expect(history1.length).toBe(4);
        expect(history2.length).toBe(2);
    });
});
