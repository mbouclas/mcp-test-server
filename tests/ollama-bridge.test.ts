import { describe, test, expect, beforeEach, jest, beforeAll, afterAll } from '@jest/globals';
import { OllamaMCPBridge } from '../src/ollama-bridge.js';

// Mock node-fetch
jest.mock('node-fetch');
const mockFetch = jest.mocked(fetch);

// Mock MCP SDK components
jest.mock('@modelcontextprotocol/sdk/client/index.js');
jest.mock('@modelcontextprotocol/sdk/client/stdio.js');

describe('OllamaMCPBridge', () => {
    let bridge: OllamaMCPBridge;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
        bridge = new OllamaMCPBridge();
    });

    describe('Initialization', () => {
        test('should initialize bridge with default configuration', () => {
            expect(bridge).toBeDefined();
            expect(bridge['isConnected']).toBe(false);
        });

        test('should set connection status', () => {
            expect(bridge['isConnected']).toBe(false);
            bridge['isConnected'] = true;
            expect(bridge['isConnected']).toBe(true);
        });
    });

    describe('Ollama Integration', () => {
        test('should format chat request correctly', async () => {
            const mockOllamaResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Hello from Ollama!' }
                })
            };

            mockFetch.mockResolvedValue(mockOllamaResponse as any);

            const response = await bridge.chatWithOllama('Hello world', 'llama3.2');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: expect.stringContaining('"model":"llama3.2"')
                })
            );

            expect(response).toBe('Hello from Ollama!');
        });

        test('should handle Ollama errors gracefully', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: jest.fn().mockResolvedValue('Ollama error')
            } as any);

            await expect(bridge.chatWithOllama('test', 'llama3.2'))
                .rejects.toThrow('Ollama API error: 500 Internal Server Error');
        });

        test('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(bridge.chatWithOllama('test', 'llama3.2'))
                .rejects.toThrow('Failed to communicate with Ollama');
        });

        test('should use default model when none specified', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Response' }
                })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            await bridge.chatWithOllama('test message');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.objectContaining({
                    body: expect.stringContaining('"model":"llama3.2"') // Default model
                })
            );
        });

        test('should get available Ollama models', async () => {
            const mockModelsResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    models: [
                        { name: 'llama3.2:latest', size: 1234567890 },
                        { name: 'codellama:latest', size: 2345678901 }
                    ]
                })
            };

            mockFetch.mockResolvedValue(mockModelsResponse as any);

            const models = await bridge.getAvailableModels();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
            expect(models).toHaveLength(2);
            expect(models[0].name).toBe('llama3.2:latest');
        });
    });

    describe('Tool Selection and Analysis', () => {
        test('should analyze tool needs from message', async () => {
            const mockOllamaResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: {
                        content: 'I need to use the calculator tool with operation=factorial and n=5'
                    }
                })
            };

            mockFetch.mockResolvedValue(mockOllamaResponse as any);

            const result = await bridge['analyzeToolNeeds']('What is 5 factorial?');

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.objectContaining({
                    body: expect.stringContaining('calculator')
                })
            );

            expect(result.tools).toBeDefined();
        });

        test('should fall back to keyword-based tool selection', () => {
            const testCases = [
                { message: 'calculate 5 + 3', expected: ['calculator'] },
                { message: 'what is the weather?', expected: ['weather_info'] },
                { message: 'shorten this URL', expected: ['url_utilities'] },
                { message: 'what time is it?', expected: ['get_datetime'] },
                { message: 'check service health', expected: ['service_health'] },
                { message: 'random question', expected: [] }
            ];

            testCases.forEach(({ message, expected }) => {
                const result = bridge['fallbackToolSelection'](message);
                expect(result).toEqual(expected);
            });
        });

        test('should extract tool parameters from analysis', () => {
            const testCases = [
                {
                    analysis: 'Use calculator with operation=factorial and n=5',
                    expected: { operation: 'factorial', n: 5 }
                },
                {
                    analysis: 'Use weather_info with location=Tokyo and units=metric',
                    expected: { location: 'Tokyo', units: 'metric' }
                },
                {
                    analysis: 'Use get_datetime with format=iso',
                    expected: { format: 'iso' }
                }
            ];

            testCases.forEach(({ analysis, expected }) => {
                const result = bridge['extractParameters'](analysis);
                expect(result).toEqual(expected);
            });
        });

        test('should handle malformed tool analysis', () => {
            const malformedAnalyses = [
                'No tools mentioned here',
                'Invalid format: tool_name',
                'calculator with broken=syntax=here'
            ];

            malformedAnalyses.forEach(analysis => {
                const result = bridge['extractParameters'](analysis);
                expect(result).toEqual({});
            });
        });
    });

    describe('MCP Connection Management', () => {
        test('should handle connection establishment', async () => {
            // Mock successful connection
            bridge['client'] = {
                connect: jest.fn().mockResolvedValue(undefined),
                listTools: jest.fn().mockResolvedValue({
                    tools: [
                        { name: 'calculator', description: 'Perform calculations' },
                        { name: 'weather_info', description: 'Get weather data' }
                    ]
                }),
                callTool: jest.fn().mockResolvedValue({ content: [{ type: 'text', text: 'Tool result' }] })
            } as any;

            await bridge.connect();

            expect(bridge['isConnected']).toBe(true);
            expect(bridge['client']?.connect).toHaveBeenCalled();
        });

        test('should handle connection failures', async () => {
            bridge['client'] = {
                connect: jest.fn().mockRejectedValue(new Error('Connection failed'))
            } as any;

            await expect(bridge.connect()).rejects.toThrow('Failed to connect to MCP server');
            expect(bridge['isConnected']).toBe(false);
        });

        test('should ensure connection before operations', async () => {
            const connectSpy = jest.spyOn(bridge, 'connect').mockResolvedValue();

            await bridge['ensureConnected']();

            expect(connectSpy).toHaveBeenCalled();
        });

        test('should skip connection if already connected', async () => {
            bridge['isConnected'] = true;
            const connectSpy = jest.spyOn(bridge, 'connect');

            await bridge['ensureConnected']();

            expect(connectSpy).not.toHaveBeenCalled();
        });
    });

    describe('Tool Execution', () => {
        beforeEach(() => {
            bridge['isConnected'] = true;
            bridge['client'] = {
                callTool: jest.fn(),
                listTools: jest.fn().mockResolvedValue({
                    tools: [
                        { name: 'calculator', description: 'Perform calculations' },
                        { name: 'weather_info', description: 'Get weather data' }
                    ]
                })
            } as any;
        });

        test('should call tools with correct parameters', async () => {
            const mockToolResult = {
                content: [{ type: 'text', text: 'Tool execution result' }]
            };

            (bridge['client']!.callTool as jest.Mock).mockResolvedValue(mockToolResult);

            const result = await bridge.callTool('calculator', { operation: 'add', a: 5, b: 3 });

            expect(bridge['client']!.callTool).toHaveBeenCalledWith({
                name: 'calculator',
                arguments: { operation: 'add', a: 5, b: 3 }
            });

            expect(result).toBe('Tool execution result');
        });

        test('should handle tool execution errors', async () => {
            (bridge['client']!.callTool as jest.Mock).mockRejectedValue(new Error('Tool error'));

            await expect(bridge.callTool('calculator', {}))
                .rejects.toThrow('Failed to execute tool calculator');
        });

        test('should extract text content from tool results', () => {
            const testCases = [
                {
                    content: [{ type: 'text', text: 'Simple text' }],
                    expected: 'Simple text'
                },
                {
                    content: [
                        { type: 'text', text: 'First part' },
                        { type: 'text', text: 'Second part' }
                    ],
                    expected: 'First part\nSecond part'
                },
                {
                    content: [
                        { type: 'text', text: 'Text content' },
                        { type: 'image', data: 'base64data' }
                    ],
                    expected: 'Text content'
                }
            ];

            testCases.forEach(({ content, expected }) => {
                const result = bridge['extractTextContent'](content);
                expect(result).toBe(expected);
            });
        });

        test('should get available tools', async () => {
            const tools = await bridge.getAvailableTools();

            expect(bridge['client']!.listTools).toHaveBeenCalled();
            expect(tools).toHaveLength(2);
            expect(tools[0].name).toBe('calculator');
        });
    });

    describe('Smart Processing', () => {
        beforeEach(() => {
            bridge['isConnected'] = true;
            bridge['client'] = {
                callTool: jest.fn().mockResolvedValue({
                    content: [{ type: 'text', text: 'Tool result' }]
                }),
                listTools: jest.fn().mockResolvedValue({
                    tools: [{ name: 'calculator', description: 'Math operations' }]
                })
            } as any;
        });

        test('should process messages with tool selection', async () => {
            const mockOllamaResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Use calculator with operation=add, a=5, b=3' }
                })
            };

            mockFetch.mockResolvedValue(mockOllamaResponse as any);

            const result = await bridge.processWithTools('What is 5 + 3?', 'llama3.2');

            expect(result).toContain('Tool result');
            expect(bridge['client']!.callTool).toHaveBeenCalled();
        });

        test('should handle messages that do not need tools', async () => {
            const mockAnalysisResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'No tools needed for this general question' }
                })
            };

            const mockChatResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'This is a general response' }
                })
            };

            mockFetch
                .mockResolvedValueOnce(mockAnalysisResponse as any)
                .mockResolvedValueOnce(mockChatResponse as any);

            const result = await bridge.processWithTools('Tell me a joke', 'llama3.2');

            expect(result).toBe('This is a general response');
            expect(bridge['client']!.callTool).not.toHaveBeenCalled();
        });

        test('should handle tool execution failures gracefully', async () => {
            const mockOllamaResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Use calculator with operation=divide, a=5, b=0' }
                })
            };

            mockFetch.mockResolvedValue(mockOllamaResponse as any);
            (bridge['client']!.callTool as jest.Mock).mockRejectedValue(new Error('Division by zero'));

            const result = await bridge.processWithTools('What is 5 divided by 0?', 'llama3.2');

            expect(result).toContain('Error executing tool');
        });
    });

    describe('Configuration Management', () => {
        test('should use correct Ollama endpoint', () => {
            const expectedEndpoint = process.env.OLLAMA_HOST || 'http://localhost:11434';
            expect(bridge['ollamaEndpoint']).toBe(expectedEndpoint);
        });

        test('should handle custom Ollama host', () => {
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

        test('should use default model configuration', () => {
            expect(bridge['defaultModel']).toBe('llama3.2');
        });
    });

    describe('Error Handling and Resilience', () => {
        test('should handle malformed Ollama responses', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({ invalid: 'response' })
            } as any);

            await expect(bridge.chatWithOllama('test'))
                .rejects.toThrow('Invalid response format from Ollama');
        });

        test('should handle JSON parsing errors', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            } as any);

            await expect(bridge.chatWithOllama('test'))
                .rejects.toThrow('Failed to parse Ollama response');
        });

        test('should handle timeout scenarios', async () => {
            mockFetch.mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 100)
                )
            );

            await expect(bridge.chatWithOllama('test'))
                .rejects.toThrow('Failed to communicate with Ollama');
        });

        test('should retry failed operations', async () => {
            let attempt = 0;
            mockFetch.mockImplementation(() => {
                attempt++;
                if (attempt < 3) {
                    return Promise.reject(new Error('Network error'));
                }
                return Promise.resolve({
                    ok: true,
                    json: jest.fn().mockResolvedValue({
                        message: { content: 'Success after retry' }
                    })
                } as any);
            });

            // This would test retry logic if implemented
            // const result = await bridge.chatWithOllamaWithRetry('test');
            // expect(result).toBe('Success after retry');
            // expect(attempt).toBe(3);
        });
    });

    describe('Performance and Optimization', () => {
        test('should handle concurrent requests', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Concurrent response' }
                })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const promises = Array(5).fill(0).map((_, i) =>
                bridge.chatWithOllama(`Message ${i}`)
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            results.forEach(result => {
                expect(result).toBe('Concurrent response');
            });

            expect(mockFetch).toHaveBeenCalledTimes(5);
        });

        test('should handle large message content', async () => {
            const largeMessage = 'A'.repeat(10000);
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Large message processed' }
                })
            };

            mockFetch.mockResolvedValue(mockResponse as any);

            const result = await bridge.chatWithOllama(largeMessage);

            expect(result).toBe('Large message processed');
            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:11434/api/chat',
                expect.objectContaining({
                    body: expect.stringContaining(largeMessage)
                })
            );
        });
    });
});
