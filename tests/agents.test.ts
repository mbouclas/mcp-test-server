import { describe, test, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';
import { BaseAgent, AgentContext, AgentMessage } from '../src/agents/base-agent.js';
import { WeatherAgent } from '../src/agents/weather-agent.js';
import { AgentManager } from '../src/agents/agent-manager.js';
import { OllamaMCPBridge } from '../src/ollama-bridge.js';

// Mock the OllamaMCPBridge
jest.mock('../src/ollama-bridge.js');
const MockOllamaMCPBridge = jest.mocked(OllamaMCPBridge);

// Create a concrete implementation of BaseAgent for testing
class TestAgent extends BaseAgent {
    constructor(bridge: OllamaMCPBridge) {
        super(
            'TestAgent',
            'A test agent for unit testing',
            'You are a test agent.',
            ['test_tool'],
            bridge
        );
    }

    async processRequest(
        message: string,
        conversationId: string = 'default',
        context?: Record<string, any>
    ): Promise<{
        response: string;
        toolsUsed: string[];
        context: AgentContext;
    }> {
        const agentContext = this.getOrCreateContext(conversationId);
        this.addMessage(conversationId, 'user', message);

        const response = `Test response to: ${message}`;
        const toolsUsed = ['test_tool'];

        this.addMessage(conversationId, 'assistant', response, toolsUsed);

        return {
            response,
            toolsUsed,
            context: agentContext
        };
    }
}

describe('Agent System', () => {
    let mockBridge: jest.Mocked<OllamaMCPBridge>; beforeEach(() => {
        jest.clearAllMocks();
        mockBridge = new MockOllamaMCPBridge() as jest.Mocked<OllamaMCPBridge>;

        // Setup default mock implementations
        mockBridge.callTool = jest.fn<(name: string, args: any) => Promise<string>>().mockResolvedValue('Mocked tool result');
        mockBridge.chatWithOllama = jest.fn<(message: string, model?: string) => Promise<string>>().mockResolvedValue('Mocked Ollama response');
        mockBridge.processWithTools = jest.fn<(userMessage: string, model?: string) => Promise<string>>().mockResolvedValue('Mocked processWithTools response');
        mockBridge.getAvailableTools = jest.fn<() => Promise<any[]>>().mockResolvedValue([
            { name: 'weather_info', description: 'Get weather information' },
            { name: 'calculator', description: 'Perform calculations' }
        ]);
    });

    afterEach(() => {
        // Clear any cached bridge references
        if (mockBridge) {
            mockBridge = null as any;
        }
    });

    describe('BaseAgent', () => {
        let testAgent: TestAgent;

        beforeEach(() => {
            testAgent = new TestAgent(mockBridge);
        });

        test('should initialize with correct properties', () => {
            expect(testAgent.getInfo()).toEqual({
                name: 'TestAgent',
                description: 'A test agent for unit testing',
                availableTools: ['test_tool']
            });
        });

        test('should create and manage conversation context', () => {
            const context1 = testAgent['getOrCreateContext']('session1');
            const context2 = testAgent['getOrCreateContext']('session2');
            const context1Again = testAgent['getOrCreateContext']('session1');

            expect(context1.conversationId).toBe('session1');
            expect(context2.conversationId).toBe('session2');
            expect(context1Again).toBe(context1); // Should be the same instance
        });

        test('should add messages to conversation history', () => {
            testAgent['addMessage']('test-session', 'user', 'Hello');
            testAgent['addMessage']('test-session', 'assistant', 'Hi there', ['test_tool']);

            const history = testAgent.getConversationHistory('test-session');

            expect(history).toHaveLength(2);
            expect(history[0]).toMatchObject({
                role: 'user',
                content: 'Hello',
                toolsUsed: undefined
            });
            expect(history[1]).toMatchObject({
                role: 'assistant',
                content: 'Hi there',
                toolsUsed: ['test_tool']
            });
        });

        test('should limit conversation history to 20 messages', () => {
            // Add 25 messages
            for (let i = 0; i < 25; i++) {
                testAgent['addMessage']('test-session', 'user', `Message ${i}`);
            }

            const history = testAgent.getConversationHistory('test-session');
            expect(history).toHaveLength(20);
            expect(history[0].content).toBe('Message 5'); // Should start from message 5
            expect(history[19].content).toBe('Message 24'); // Should end at message 24
        });

        test('should check tool availability correctly', () => {
            expect(testAgent['isToolAvailable']('test_tool')).toBe(true);
            expect(testAgent['isToolAvailable']('other_tool')).toBe(false);

            // Test wildcard access
            const wildcardAgent = new TestAgent(mockBridge);
            wildcardAgent['availableTools'] = ['*'];
            expect(wildcardAgent['isToolAvailable']('any_tool')).toBe(true);
        });

        test('should execute tools when available', async () => {
            await testAgent['executeTool']('test_tool', { param: 'value' });

            expect(mockBridge.callTool).toHaveBeenCalledWith('test_tool', { param: 'value' });
        });

        test('should throw error for unavailable tools', async () => {
            await expect(
                testAgent['executeTool']('unavailable_tool', {})
            ).rejects.toThrow('Tool unavailable_tool is not available to agent TestAgent');
        });

        test('should create enhanced prompts with context', () => {
            testAgent['addMessage']('test-session', 'user', 'Previous message');
            testAgent['addMessage']('test-session', 'assistant', 'Previous response', ['test_tool']);

            const context = testAgent['getOrCreateContext']('test-session');
            const prompt = testAgent['createEnhancedPrompt']('Current message', context);

            expect(prompt).toContain('You are a test agent.');
            expect(prompt).toContain('Conversation History:');
            expect(prompt).toContain('Previous message');
            expect(prompt).toContain('Previous response');
            expect(prompt).toContain('Current Request: Current message');
            expect(prompt).toContain('Available Tools: test_tool');
        });

        test('should clear conversation context', () => {
            testAgent['addMessage']('test-session', 'user', 'Test message');
            expect(testAgent.getConversationHistory('test-session')).toHaveLength(1);

            testAgent.clearContext('test-session');
            expect(testAgent.getConversationHistory('test-session')).toHaveLength(0);
        });

        test('should process requests and return results', async () => {
            const result = await testAgent.processRequest('Hello test', 'test-session');

            expect(result.response).toBe('Test response to: Hello test');
            expect(result.toolsUsed).toEqual(['test_tool']);
            expect(result.context.conversationId).toBe('test-session');
        });
    });

    describe('WeatherAgent', () => {
        let weatherAgent: WeatherAgent;

        beforeEach(() => {
            weatherAgent = new WeatherAgent(mockBridge);
        });

        test('should initialize with weather-specific configuration', () => {
            const info = weatherAgent.getInfo();

            expect(info.name).toBe('WeatherAgent');
            expect(info.description).toContain('weather information');
            expect(info.availableTools).toContain('weather_info');
            expect(info.availableTools).toContain('get_datetime');
        });

        test('should process weather requests', async () => {
            mockBridge.callTool
                .mockResolvedValueOnce('Weather: 22°C, partly cloudy in Tokyo')
                .mockResolvedValueOnce('Current time: 2025-06-10T12:00:00Z');

            const result = await weatherAgent.processRequest(
                'What is the weather in Tokyo?',
                'weather-session'
            );

            expect(result.response).toBeDefined();
            expect(result.context.conversationId).toBe('weather-session');
            expect(mockBridge.chatWithOllama).toHaveBeenCalled();
        });

        test('should handle weather requests without location', async () => {
            const result = await weatherAgent.processRequest(
                'How is the weather?',
                'weather-session'
            );

            expect(result.response).toBeDefined();
            expect(mockBridge.chatWithOllama).toHaveBeenCalled();
        });

        test('should maintain conversation context for weather queries', async () => {
            await weatherAgent.processRequest('Weather in London?', 'weather-session');
            await weatherAgent.processRequest('What about tomorrow?', 'weather-session');

            const history = weatherAgent.getConversationHistory('weather-session');
            expect(history).toHaveLength(4); // 2 user messages + 2 assistant responses
            expect(history[0].content).toBe('Weather in London?');
            expect(history[2].content).toBe('What about tomorrow?');
        });
    });

    describe('AgentManager', () => {
        let agentManager: AgentManager;

        beforeEach(() => {
            agentManager = new AgentManager(mockBridge);
        });

        test('should initialize with available agents', () => {
            const agents = agentManager.getAvailableAgents();

            expect(agents).toHaveProperty('weather');
            expect(agents.weather.name).toBe('WeatherAgent');
        });

        test('should route weather-related messages to WeatherAgent', async () => {
            const result = await agentManager.routeMessage(
                'What is the weather in Paris?',
                'test-session'
            );

            expect(result.agentUsed).toBe('weather');
            expect(result.routing.agentName).toBe('weather');
            expect(result.routing.confidence).toBeGreaterThan(0.8);
            expect(result.routing.reason).toContain('weather-related');
        });

        test('should route to explicitly requested agent', async () => {
            const result = await agentManager.routeMessage(
                'Hello there',
                'test-session',
                'weather'
            );

            expect(result.agentUsed).toBe('weather');
            expect(result.routing.agentName).toBe('weather');
            expect(result.routing.confidence).toBe(1.0);
            expect(result.routing.reason).toBe('Explicitly requested');
        }); test('should fallback to general processing for unknown requests', async () => {
            (mockBridge.processWithTools as jest.MockedFunction<typeof mockBridge.processWithTools>)
                .mockResolvedValue('General response');

            const result = await agentManager.routeMessage(
                'Tell me a joke',
                'test-session'
            );

            expect(result.agentUsed).toBe('general');
            expect(result.routing.agentName).toBe('general');
            expect(mockBridge.processWithTools).toHaveBeenCalled();
        }); test('should handle agent errors gracefully', async () => {
            // Mock weather agent to throw an error
            jest.spyOn(agentManager['agents'].weather, 'processRequest')
                .mockRejectedValue(new Error('Weather service unavailable'));

            (mockBridge.processWithTools as jest.MockedFunction<typeof mockBridge.processWithTools>)
                .mockResolvedValue('Fallback response');

            const result = await agentManager.routeMessage(
                'Weather in Tokyo?',
                'test-session'
            );

            expect(result.agentUsed).toBe('general');
            expect(result.routing.reason).toContain('Fallback due to weather agent error');
        });

        test('should analyze message content for routing', async () => {
            const testCases = [
                { message: 'Calculate 5 + 3', expectedAgent: 'calculator' },
                { message: 'What is 10 factorial?', expectedAgent: 'calculator' },
                { message: 'Is it raining?', expectedAgent: 'weather' },
                { message: 'Temperature in New York', expectedAgent: 'weather' },
                { message: 'Query the database', expectedAgent: 'database' },
                { message: 'Random question', expectedAgent: 'general' }
            ];

            for (const testCase of testCases) {
                const routing = await agentManager['analyzeAndRoute'](testCase.message);
                expect(routing.agentName).toBe(testCase.expectedAgent);
                expect(routing.confidence).toBeGreaterThan(0);
            }
        });

        test('should get direct agent access', () => {
            const weatherAgent = agentManager.getAgent('weather');
            expect(weatherAgent).toBeDefined();
            expect(weatherAgent?.getInfo().name).toBe('WeatherAgent');

            const nonExistentAgent = agentManager.getAgent('nonexistent');
            expect(nonExistentAgent).toBeUndefined();
        }); test('should clear agent conversation history', () => {
            // First add some conversation history
            const weatherAgent = agentManager.getAgent('weather');
            weatherAgent?.['addMessage']('test-session', 'user', 'Test message');

            // Verify history exists
            expect(weatherAgent?.getConversationHistory('test-session')).toHaveLength(1);

            // Clear the history
            agentManager.clearAgentContext('weather', 'test-session');

            // Verify history is cleared
            expect(weatherAgent?.getConversationHistory('test-session')).toHaveLength(0);
        });

        test('should get agent conversation history', async () => {
            await agentManager.routeMessage('Weather in London?', 'test-session');

            const history = agentManager.getAgentHistory('weather', 'test-session');
            expect(history.length).toBeGreaterThan(0);
        });
    });

    describe('Agent Integration', () => {
        let agentManager: AgentManager;

        beforeEach(() => {
            agentManager = new AgentManager(mockBridge);
        });

        test('should handle multiple conversations simultaneously', async () => {
            const session1Promise = agentManager.routeMessage('Weather in Tokyo?', 'session1');
            const session2Promise = agentManager.routeMessage('Weather in London?', 'session2');

            const [result1, result2] = await Promise.all([session1Promise, session2Promise]);

            expect(result1.context.conversationId).toBe('session1');
            expect(result2.context.conversationId).toBe('session2');
            expect(result1.agentUsed).toBe('weather');
            expect(result2.agentUsed).toBe('weather');
        });

        test('should maintain separate context per conversation', async () => {
            await agentManager.routeMessage('Weather in Tokyo?', 'session1');
            await agentManager.routeMessage('Weather in London?', 'session2');
            await agentManager.routeMessage('What about tomorrow?', 'session1');

            const history1 = agentManager.getAgentHistory('weather', 'session1');
            const history2 = agentManager.getAgentHistory('weather', 'session2');

            expect(history1.length).toBe(4); // 2 exchanges
            expect(history2.length).toBe(2); // 1 exchange
            expect(history1.some(msg => msg.content.includes('Tokyo'))).toBe(true);
            expect(history2.some(msg => msg.content.includes('London'))).toBe(true);
        });

        test('should handle concurrent requests to same agent', async () => {
            const promises = Array(5).fill(0).map((_, i) =>
                agentManager.routeMessage(`Weather request ${i}`, `session${i}`)
            );

            const results = await Promise.all(promises);

            results.forEach((result, i) => {
                expect(result.agentUsed).toBe('weather');
                expect(result.context.conversationId).toBe(`session${i}`);
            });
        });
    });
});
