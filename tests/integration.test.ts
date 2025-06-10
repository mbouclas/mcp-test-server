import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { spawn, ChildProcess } from 'child_process';
import request from 'supertest';
import { OllamaMCPBridge } from '../src/ollama-bridge.js';
import { AgentManager } from '../src/agents/agent-manager.js';
import { WeatherAgent } from '../src/agents/weather-agent.js';

// Mock external dependencies for isolated testing
jest.mock('node-fetch');
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');

const mockFetch = jest.mocked(fetch);

describe('End-to-End Integration Tests', () => {
    let bridge: OllamaMCPBridge;
    let agentManager: AgentManager;

    beforeAll(async () => {
        // Initialize components with mocked dependencies
        bridge = new OllamaMCPBridge();
        agentManager = new AgentManager(bridge);

        // Setup global mocks
        setupGlobalMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    function setupGlobalMocks() {
        // Mock successful Ollama responses
        const mockOllamaResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({
                message: { content: 'Mocked Ollama response' }
            })
        };

        // Mock successful MCP client
        const mockMCPClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            listTools: jest.fn().mockResolvedValue({
                tools: [
                    { name: 'calculator', description: 'Perform mathematical calculations' },
                    { name: 'weather_info', description: 'Get weather information' },
                    { name: 'get_datetime', description: 'Get current date and time' },
                    { name: 'url_utilities', description: 'URL manipulation utilities' },
                    { name: 'service_health', description: 'Check service health' },
                    { name: 'file_operations', description: 'File system operations' }
                ]
            }),
            callTool: jest.fn().mockImplementation(({ name, arguments: args }) => {
                return Promise.resolve({
                    content: [{ type: 'text', text: mockToolResponses[name] || 'Generic tool response' }]
                });
            })
        };

        // Setup bridge mocks
        bridge['client'] = mockMCPClient as any;
        bridge['isConnected'] = true;

        mockFetch.mockResolvedValue(mockOllamaResponse as any);
    }

    const mockToolResponses: Record<string, string> = {
        'calculator': JSON.stringify({ result: 42, operation: 'factorial', input: 5 }),
        'weather_info': JSON.stringify({
            location: 'Tokyo',
            temperature: '22°C',
            condition: 'Partly cloudy',
            humidity: '65%',
            wind: '10 km/h'
        }),
        'get_datetime': new Date().toISOString(),
        'url_utilities': JSON.stringify({ shortened_url: 'https://short.ly/abc123' }),
        'service_health': JSON.stringify({ status: 'healthy', uptime: '99.9%' }),
        'file_operations': 'File operation completed successfully'
    };

    describe('Complete Workflow Tests', () => {
        test('should handle weather query workflow end-to-end', async () => {
            // Mock specific responses for weather workflow
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'Use weather_info with location=Tokyo, units=metric' }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'The weather in Tokyo is partly cloudy with 22°C. Perfect for a walk!' }
                    })
                });

            // Execute the complete workflow
            const result = await agentManager.routeMessage(
                'What is the weather like in Tokyo?',
                'weather-test-session'
            );

            // Verify routing
            expect(result.agentUsed).toBe('weather');
            expect(result.routing.confidence).toBeGreaterThan(0.8);
            expect(result.routing.reason).toContain('weather-related');

            // Verify tool usage
            expect(result.toolsUsed.length).toBeGreaterThan(0);
            expect(result.response).toBeDefined();
            expect(result.context.conversationId).toBe('weather-test-session');
        });

        test('should handle calculator query workflow end-to-end', async () => {
            // Mock responses for calculator workflow
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'Use calculator with operation=factorial, n=5' }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'The factorial of 5 is 120.' }
                    })
                });

            const result = await bridge.processWithTools(
                'What is 5 factorial?',
                'llama3.2'
            );

            expect(result).toContain('120');
            expect(bridge['client']!.callTool).toHaveBeenCalledWith({
                name: 'calculator',
                arguments: expect.objectContaining({ operation: 'factorial', n: 5 })
            });
        });

        test('should handle multi-step workflow with multiple tools', async () => {
            // Simulate a complex query requiring multiple tools
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'Use weather_info with location=Tokyo' }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'Use get_datetime with format=local' }
                    })
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'Based on the weather and time, it\'s a great day in Tokyo!' }
                    })
                });

            const weatherAgent = new WeatherAgent(bridge);
            const result = await weatherAgent.processRequest(
                'What\'s the weather in Tokyo and what time is it there?',
                'multi-tool-session'
            );

            expect(result.toolsUsed.length).toBeGreaterThan(0);
            expect(result.response).toBeDefined();
        });
    });

    describe('Error Recovery and Resilience', () => {
        test('should handle tool execution failures gracefully', async () => {
            // Mock a tool failure
            (bridge['client']!.callTool as jest.Mock).mockRejectedValueOnce(
                new Error('Tool execution failed')
            );

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Use calculator with operation=divide, a=5, b=0' }
                })
            });

            const result = await bridge.processWithTools(
                'What is 5 divided by 0?',
                'llama3.2'
            );

            expect(result).toContain('Error executing tool');
        });

        test('should fallback to general processing when agent fails', async () => {
            // Mock agent failure
            const weatherAgent = agentManager['agents'].weather;
            jest.spyOn(weatherAgent, 'processRequest').mockRejectedValueOnce(
                new Error('Weather service unavailable')
            );

            // Mock fallback response
            (bridge.processWithTools as jest.Mock) = jest.fn().mockResolvedValue(
                'I apologize, but I cannot get weather information right now. Please try again later.'
            );

            const result = await agentManager.routeMessage(
                'What is the weather in Tokyo?',
                'fallback-session'
            );

            expect(result.agentUsed).toBe('general');
            expect(result.routing.reason).toContain('Fallback due to weather agent error');
        });

        test('should handle Ollama service unavailability', async () => {
            mockFetch.mockRejectedValue(new Error('Connection refused'));

            await expect(bridge.chatWithOllama('test message'))
                .rejects.toThrow('Failed to communicate with Ollama');
        });

        test('should handle MCP server disconnection', async () => {
            bridge['isConnected'] = false;
            (bridge['client']!.connect as jest.Mock).mockRejectedValue(
                new Error('MCP server not available')
            );

            await expect(bridge.connect())
                .rejects.toThrow('Failed to connect to MCP server');
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle concurrent agent requests', async () => {
            const requests = [
                'What is the weather in Tokyo?',
                'Calculate 10 factorial',
                'What time is it?',
                'Check service health',
                'Weather in London'
            ];

            const promises = requests.map((message, i) =>
                agentManager.routeMessage(message, `concurrent-session-${i}`)
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            results.forEach((result, i) => {
                expect(result.response).toBeDefined();
                expect(result.context.conversationId).toBe(`concurrent-session-${i}`);
            });
        });

        test('should maintain conversation context across multiple exchanges', async () => {
            const conversationId = 'long-conversation';

            // First exchange
            await agentManager.routeMessage(
                'What is the weather in Tokyo?',
                conversationId
            );

            // Second exchange (should maintain context)
            await agentManager.routeMessage(
                'What about tomorrow?',
                conversationId
            );

            // Third exchange
            const result = await agentManager.routeMessage(
                'And the day after?',
                conversationId
            );

            // Verify conversation history is maintained
            const history = agentManager.getAgentHistory('weather', conversationId);
            expect(history.length).toBeGreaterThan(4); // At least 3 user + 3 assistant messages
        });

        test('should handle large message content', async () => {
            const largeMessage = 'Calculate the factorial of ' + 'very '.repeat(1000) + 'large number 10';

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Use calculator with operation=factorial, n=10' }
                })
            });

            const result = await bridge.processWithTools(largeMessage, 'llama3.2');

            expect(result).toBeDefined();
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.objectContaining({
                    body: expect.stringContaining(largeMessage)
                })
            );
        });
    });

    describe('Data Flow Validation', () => {
        test('should properly pass data through the complete pipeline', async () => {
            const testMessage = 'What is the weather in Paris with temperature in Fahrenheit?';
            const sessionId = 'data-flow-test';

            // Track data flow through the system
            const routingResult = await agentManager.routeMessage(testMessage, sessionId);

            // Verify routing decision
            expect(routingResult.agentUsed).toBe('weather');
            expect(routingResult.routing.agentName).toBe('weather');

            // Verify tool calls occurred
            expect(bridge['client']!.callTool).toHaveBeenCalled();

            // Verify response structure
            expect(routingResult).toMatchObject({
                response: expect.any(String),
                agentUsed: 'weather',
                toolsUsed: expect.any(Array),
                routing: expect.objectContaining({
                    agentName: 'weather',
                    confidence: expect.any(Number),
                    reason: expect.any(String)
                }),
                context: expect.objectContaining({
                    conversationId: sessionId
                })
            });
        });

        test('should preserve parameter types through tool execution', async () => {
            const calculatorParams = { operation: 'factorial', n: 5 };

            await bridge.callTool('calculator', calculatorParams);

            expect(bridge['client']!.callTool).toHaveBeenCalledWith({
                name: 'calculator',
                arguments: calculatorParams
            });

            // Verify parameters were passed with correct types
            const callArgs = (bridge['client']!.callTool as jest.Mock).mock.calls[0][0];
            expect(typeof callArgs.arguments.n).toBe('number');
            expect(typeof callArgs.arguments.operation).toBe('string');
        });
    });

    describe('Configuration and Environment', () => {
        test('should respect environment configuration', () => {
            const originalHost = process.env.OLLAMA_HOST;
            process.env.OLLAMA_HOST = 'http://custom-ollama:8080';

            const customBridge = new OllamaMCPBridge();
            expect(customBridge['ollamaEndpoint']).toBe('http://custom-ollama:8080');

            // Restore original
            if (originalHost) {
                process.env.OLLAMA_HOST = originalHost;
            } else {
                delete process.env.OLLAMA_HOST;
            }
        });

        test('should handle missing environment variables gracefully', () => {
            const originalHost = process.env.OLLAMA_HOST;
            delete process.env.OLLAMA_HOST;

            const defaultBridge = new OllamaMCPBridge();
            expect(defaultBridge['ollamaEndpoint']).toBe('http://localhost:11434');

            // Restore
            if (originalHost) {
                process.env.OLLAMA_HOST = originalHost;
            }
        });
    });

    describe('Security and Validation', () => {
        test('should validate tool parameters', async () => {
            const invalidParams = { operation: 'factorial', n: 'not-a-number' };

            // The system should handle invalid parameters gracefully
            await bridge.callTool('calculator', invalidParams);

            expect(bridge['client']!.callTool).toHaveBeenCalledWith({
                name: 'calculator',
                arguments: invalidParams
            });
        });

        test('should handle malicious input safely', async () => {
            const maliciousInput = '<script>alert("xss")</script>';

            const result = await agentManager.routeMessage(maliciousInput, 'security-test');

            expect(result.response).toBeDefined();
            expect(result.response).not.toContain('<script>');
        });

        test('should limit conversation history size', async () => {
            const sessionId = 'history-limit-test';
            const weatherAgent = agentManager.getAgent('weather')!;

            // Add many messages to exceed limit
            for (let i = 0; i < 25; i++) {
                await weatherAgent.processRequest(`Message ${i}`, sessionId);
            }

            const history = weatherAgent.getConversationHistory(sessionId);
            expect(history.length).toBeLessThanOrEqual(20); // Should be limited to 20 messages
        });
    });

    describe('Monitoring and Observability', () => {
        test('should provide meaningful error messages', async () => {
            (bridge['client']!.callTool as jest.Mock).mockRejectedValueOnce(
                new Error('Tool not found: invalid_tool')
            );

            try {
                await bridge.callTool('invalid_tool', {});
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toContain('Failed to execute tool invalid_tool');
            }
        });

        test('should track tool usage statistics', async () => {
            const tools = ['calculator', 'weather_info', 'get_datetime'];

            for (const tool of tools) {
                await bridge.callTool(tool, {});
            }

            expect(bridge['client']!.callTool).toHaveBeenCalledTimes(3);

            // Verify each tool was called
            tools.forEach((tool, index) => {
                expect(bridge['client']!.callTool).toHaveBeenNthCalledWith(index + 1, {
                    name: tool,
                    arguments: {}
                });
            });
        });

        test('should provide system health information', async () => {
            const healthInfo = {
                bridge: {
                    connected: bridge['isConnected'],
                    ollamaEndpoint: bridge['ollamaEndpoint']
                },
                agents: agentManager.getAvailableAgents(),
                tools: await bridge.getAvailableTools()
            };

            expect(healthInfo.bridge.connected).toBe(true);
            expect(healthInfo.agents).toHaveProperty('weather');
            expect(healthInfo.tools.length).toBeGreaterThan(0);
        });
    });
});
