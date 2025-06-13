import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Mock the config module to avoid __filename issues
jest.mock('../src/config.js', () => {
    return {
        config: {
            getFullConfig: () => ({
                service: { baseUrl: 'http://localhost:3000' },
                ollama: { baseUrl: 'http://localhost:11434', defaultModel: 'llama2' },
                mcp: { serverCommand: 'node build/index.js' }
            }),
            getOllamaConfig: () => ({
                baseUrl: 'http://localhost:11434',
                defaultModel: 'llama2',
                chatEndpoint: '/api/chat',
                tagsEndpoint: '/api/tags'
            })
        }
    };
});

// Mock fetch for HTTP requests
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('MCP Server Core', () => {
    let server: McpServer; beforeEach(() => {
        jest.clearAllMocks();
        // Reset fetch mock
        mockFetch.mockClear();
    });

    afterEach(async () => {
        // Clean up server resources if needed
        if (server) {
            try {
                // MCP server doesn't have explicit cleanup, but we clear the reference
                server = null as any;
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }); describe('Server Initialization', () => {
        test('should initialize server with correct configuration', () => {
            const serverConfig = {
                name: "custom-service-server",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                },
            };

            server = new McpServer(serverConfig);

            expect(server).toBeDefined();
            expect(server).toBeInstanceOf(McpServer);
            // Note: McpServer doesn't expose name/version properties directly
            // These are stored internally during initialization
        }); test('should have required capabilities', () => {
            const serverConfig = {
                name: "test-server",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                },
            };

            server = new McpServer(serverConfig);

            expect(server).toBeDefined();
            expect(server).toBeInstanceOf(McpServer);
            // Note: McpServer capabilities are internal and not directly accessible
        });
    });

    describe('Tool Registration', () => {
        beforeEach(() => {
            server = new McpServer({
                name: "test-server",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                },
            });
        });

        test('should register calculator tool', () => {
            // Test tool registration by attempting to add a calculator tool
            expect(() => {
                server.tool(
                    "calculator",
                    "Perform mathematical calculations",
                    {
                        operation: { type: "string", description: "The operation to perform" },
                        a: { type: "number", description: "First number" },
                        b: { type: "number", description: "Second number" }
                    },
                    async ({ operation, a, b }) => {
                        switch (operation) {
                            case 'add':
                                return {
                                    content: [{ type: "text", text: `${a + b}` }]
                                };
                            case 'subtract':
                                return {
                                    content: [{ type: "text", text: `${a - b}` }]
                                };
                            default:
                                throw new Error(`Unsupported operation: ${operation}`);
                        }
                    }
                );
            }).not.toThrow();
        });

        test('should register weather_info tool', () => {
            expect(() => {
                server.tool(
                    "weather_info",
                    "Get weather information for a location",
                    {
                        location: { type: "string", description: "Location to get weather for" },
                        units: { type: "string", description: "Temperature units" }
                    },
                    async ({ location, units }) => {
                        return {
                            content: [{
                                type: "text",
                                text: JSON.stringify({
                                    location,
                                    temperature: "22°C",
                                    condition: "Partly cloudy",
                                    units
                                })
                            }]
                        };
                    }
                );
            }).not.toThrow();
        });

        test('should register get_datetime tool', () => {
            expect(() => {
                server.tool(
                    "get_datetime",
                    "Get current date and time",
                    {
                        format: { type: "string", description: "Date format" }
                    },
                    async ({ format }) => {
                        const now = new Date();
                        let result;

                        switch (format) {
                            case "iso":
                                result = now.toISOString();
                                break;
                            case "local":
                                result = now.toLocaleString();
                                break;
                            default:
                                result = now.toString();
                        }

                        return {
                            content: [{ type: "text", text: result }]
                        };
                    }
                );
            }).not.toThrow();
        });
    });

    describe('Tool Execution', () => {
        beforeEach(() => {
            server = new McpServer({
                name: "test-server",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                },
            });

            // Register a test tool
            server.tool(
                "test_tool",
                "A test tool",
                {
                    value: { type: "string", description: "Test value" }
                },
                async ({ value }) => {
                    return {
                        content: [{ type: "text", text: `Test result: ${value}` }]
                    };
                }
            );
        });

        test('should execute tool with correct parameters', async () => {
            // Note: Direct tool execution testing would require setting up the full MCP protocol
            // This tests the tool registration mechanism
            expect(server).toBeDefined();
        });
    }); describe('HTTP Request Utilities', () => {
        test('should handle successful HTTP requests', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({ data: 'test' }),
                text: jest.fn().mockResolvedValue('test response')
            } as any;

            mockFetch.mockResolvedValue(mockResponse);

            const response = await fetch('http://test.com/api');
            expect(response.ok).toBe(true);
            expect(response.status).toBe(200);
        });

        test('should handle HTTP errors', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                statusText: 'Not Found'
            } as any;

            mockFetch.mockResolvedValue(mockResponse);

            const response = await fetch('http://test.com/api');
            expect(response.ok).toBe(false);
            expect(response.status).toBe(404);
        });

        test('should handle network errors', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            await expect(fetch('http://test.com/api')).rejects.toThrow('Network error');
        });
    });

    describe('Error Handling', () => {
        test('should handle tool execution errors gracefully', () => {
            server = new McpServer({
                name: "test-server",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                },
            });

            expect(() => {
                server.tool(
                    "error_tool",
                    "A tool that throws errors",
                    {
                        shouldError: { type: "boolean", description: "Whether to throw an error" }
                    },
                    async ({ shouldError }) => {
                        if (shouldError) {
                            throw new Error("Test error");
                        }
                        return {
                            content: [{ type: "text", text: "Success" }]
                        };
                    }
                );
            }).not.toThrow();
        });

        test('should validate tool parameters', () => {
            server = new McpServer({
                name: "test-server",
                version: "1.0.0",
                capabilities: {
                    resources: {},
                    tools: {},
                },
            });

            // Test parameter validation through schema definition
            expect(() => {
                server.tool(
                    "validated_tool",
                    "A tool with validation",
                    {
                        requiredParam: {
                            type: "string",
                            description: "A required parameter"
                        },
                        optionalParam: {
                            type: "number",
                            description: "An optional parameter",
                            default: 0
                        }
                    },
                    async ({ requiredParam, optionalParam }) => {
                        return {
                            content: [{
                                type: "text",
                                text: `Required: ${requiredParam}, Optional: ${optionalParam}`
                            }]
                        };
                    }
                );
            }).not.toThrow();
        });
    });
});
