import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { OllamaMCPBridge } from '../src/ollama-bridge.js';
import { Response } from 'node-fetch';

// Mock fetch at the global level
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock MCP SDK components
const mockClient = {
    connect: jest.fn(),
    listTools: jest.fn(),
    callTool: jest.fn(),
    close: jest.fn()
};

const mockStdioClientTransport = jest.fn();

jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn().mockImplementation(() => mockClient)
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: mockStdioClientTransport
}));

// Mock config
jest.mock('../src/config.js', () => ({
    config: {
        getMcpConfig: () => ({
            serverCommand: 'node',
            serverArgs: ['test-server.js']
        }),
        getServiceConfig: () => ({
            baseUrl: 'http://localhost:3000'
        }),
        getOllamaConfig: () => ({
            baseUrl: 'http://127.0.0.1:11434',
            chatEndpoint: '/api/chat',
            tagsEndpoint: '/api/tags',
            defaultModel: 'gemma3:4b'
        })
    }
}));

describe('OllamaMCPBridge - Fixed', () => {
    let bridge: OllamaMCPBridge;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockClear();
        bridge = new OllamaMCPBridge();
    });

    afterEach(async () => {
        if (bridge) {
            try {
                await bridge.disconnect();
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    });

    describe('Initialization', () => {
        test('should initialize bridge with default configuration', () => {
            expect(bridge).toBeDefined();
            expect(bridge['isConnected']).toBe(false);
        });
    });

    describe('Connection Management', () => {
        test('should connect to MCP server successfully', async () => {
            mockClient.connect.mockResolvedValue(undefined);

            await bridge.connect();

            expect(mockClient.connect).toHaveBeenCalled();
            expect(bridge['isConnected']).toBe(true);
        });

        test('should handle connection failures', async () => {
            mockClient.connect.mockRejectedValue(new Error('Connection failed'));

            await expect(bridge.connect()).rejects.toThrow('Failed to connect to MCP server');
            expect(bridge['isConnected']).toBe(false);
        });

        test('should not reconnect if already connected', async () => {
            mockClient.connect.mockResolvedValue(undefined);

            await bridge.connect();
            await bridge.connect(); // Second call

            expect(mockClient.connect).toHaveBeenCalledTimes(1);
        });
    });

    describe('Tool Management', () => {
        beforeEach(async () => {
            mockClient.connect.mockResolvedValue(undefined);
            mockClient.listTools.mockResolvedValue({
                tools: [
                    { name: 'calculator', description: 'Perform calculations' },
                    { name: 'weather_info', description: 'Get weather data' }
                ]
            });
            await bridge.connect();
        });

        test('should get available tools', async () => {
            const tools = await bridge.getAvailableTools();

            expect(tools).toHaveLength(2);
            expect(tools[0].name).toBe('calculator');
            expect(tools[1].name).toBe('weather_info');
        });

        test('should call a tool successfully', async () => {
            mockClient.callTool.mockResolvedValue({
                content: [{ type: 'text', text: 'Tool result: 42' }]
            }); const result = await bridge.callTool('calculator', { expression: '5 + 3' });

            expect(result).toBe('Tool result: 42');
            expect(mockClient.callTool).toHaveBeenCalledWith({
                name: 'calculator',
                arguments: { expression: '5 + 3' }
            });
        });

        test('should handle tool call failures', async () => {
            mockClient.callTool.mockRejectedValue(new Error('Tool failed'));

            await expect(bridge.callTool('calculator', {}))
                .rejects.toThrow('Failed to execute tool calculator');
        });
    });

    describe('Ollama Integration', () => {
        test('should chat with Ollama successfully', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'Hello from Ollama!' }
                })
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const result = await bridge.chatWithOllama('Hello');

            expect(result).toBe('Hello from Ollama!');
            expect(mockFetch).toHaveBeenCalledWith(
                'http://127.0.0.1:11434/api/chat',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        test('should handle Ollama API errors', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: jest.fn().mockResolvedValue('Ollama error')
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            await expect(bridge.chatWithOllama('Hello'))
                .rejects.toThrow('Ollama API error');
        });

        test('should get available models', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    models: [
                        { name: 'gemma3:4b' },
                        { name: 'llama3.2:1b' }
                    ]
                })
            } as unknown as Response;

            mockFetch.mockResolvedValue(mockResponse);

            const models = await bridge.getAvailableModels();

            expect(models).toHaveLength(2);
            expect(models[0].name).toBe('gemma3:4b');
        });

        test('should handle timeout scenarios', async () => {
            mockFetch.mockImplementation(() =>
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), 100)
                )
            );

            await expect(bridge.chatWithOllama('Hello'))
                .rejects.toThrow('Ollama request timed out');
        });
    });

    describe('Process with Tools', () => {
        beforeEach(async () => {
            mockClient.connect.mockResolvedValue(undefined);
            mockClient.listTools.mockResolvedValue({
                tools: [
                    { name: 'calculator', description: 'Math operations' }
                ]
            });
            await bridge.connect();
        });

        test('should process request with tools', async () => {
            // Mock Ollama response for tool analysis
            const analysisResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    message: {
                        content: '{"needsTools": true, "toolCalls": [{"name": "calculator", "args": {"operation": "add", "a": 5, "b": 3}, "reason": "Math calculation"}]}'
                    }
                })
            } as unknown as Response;

            // Mock tool call result
            mockClient.callTool.mockResolvedValue({
                content: [{ type: 'text', text: '8' }]
            });

            // Mock final Ollama response
            const finalResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'The result is 8' }
                })
            } as unknown as Response;

            mockFetch
                .mockResolvedValueOnce(analysisResponse)
                .mockResolvedValueOnce(finalResponse);

            const result = await bridge.processWithTools('What is 5 + 3?');
            expect(result).toBe('The result is 8');
            expect(mockClient.callTool).toHaveBeenCalledWith({
                name: 'calculator',
                arguments: { expression: '5 + 3' }
            });
        });

        test('should fallback to simple chat when tools fail', async () => {
            // Mock failed tool analysis
            mockFetch.mockRejectedValueOnce(new Error('Analysis failed'));

            // Mock fallback chat response
            const fallbackResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    message: { content: 'General response' }
                })
            } as unknown as Response;

            mockFetch.mockResolvedValueOnce(fallbackResponse);

            const result = await bridge.processWithTools('What is 5 + 3?');

            expect(result).toBe('General response');
        });
    });

    describe('Disconnect', () => {
        test('should disconnect properly', async () => {
            mockClient.connect.mockResolvedValue(undefined);
            mockClient.close.mockResolvedValue(undefined);

            await bridge.connect();
            await bridge.disconnect();

            expect(mockClient.close).toHaveBeenCalled();
            expect(bridge['isConnected']).toBe(false);
        });

        test('should handle disconnect when not connected', async () => {
            await expect(bridge.disconnect()).resolves.not.toThrow();
            expect(mockClient.close).not.toHaveBeenCalled();
        });
    });

    describe('Client Getter', () => {
        test('should return client when connected', async () => {
            mockClient.connect.mockResolvedValue(undefined);
            await bridge.connect();

            const client = bridge.client;
            expect(client).toBeDefined();
        });

        test('should return undefined when not connected', () => {
            const client = bridge.client;
            expect(client).toBeUndefined();
        });
    });
});
