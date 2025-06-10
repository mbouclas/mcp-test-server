import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AgentEnhancedWebAPIServer } from '../src/examples/agent-enhanced-web-api.js';

// Mock external dependencies
jest.mock('../src/ollama-bridge.js');
jest.mock('../src/agents/agent-manager.js');
jest.mock('node-fetch');

const mockFetch = jest.mocked(fetch);

describe('Agent Enhanced Web API Integration', () => {
    let app: express.Application;
    let server: any;
    let apiServer: AgentEnhancedWebAPIServer;

    beforeAll(async () => {
        // Create a test version of the API server
        apiServer = new AgentEnhancedWebAPIServer();
        app = apiServer['app'];

        // Mock the bridge and agent manager
        const mockBridge = {
            connect: jest.fn().mockResolvedValue(undefined),
            isConnected: jest.fn().mockReturnValue(true),
            getAvailableTools: jest.fn().mockResolvedValue([
                { name: 'calculator', description: 'Perform calculations' },
                { name: 'weather_info', description: 'Get weather information' }
            ]),
            callTool: jest.fn().mockResolvedValue('Tool result'),
            chatWithOllama: jest.fn().mockResolvedValue('Ollama response'),
            processWithTools: jest.fn().mockResolvedValue('Smart response with tools')
        };

        const mockAgentManager = {
            getAvailableAgents: jest.fn().mockReturnValue({
                weather: { name: 'WeatherAgent', description: 'Weather specialist' },
                general: { name: 'GeneralAgent', description: 'General purpose' }
            }),
            routeMessage: jest.fn().mockResolvedValue({
                response: 'Agent response',
                agentUsed: 'weather',
                toolsUsed: ['weather_info'],
                routing: { agentName: 'weather', confidence: 0.9, reason: 'Weather keywords detected' },
                context: { conversationId: 'test-session', messages: [] }
            }),
            getAgent: jest.fn().mockReturnValue({
                processRequest: jest.fn().mockResolvedValue({
                    response: 'Direct agent response',
                    toolsUsed: ['weather_info'],
                    context: { conversationId: 'test-session', messages: [] }
                })
            }),
            clearAgentHistory: jest.fn(),
            getAgentHistory: jest.fn().mockReturnValue([])
        };

        apiServer['bridge'] = mockBridge as any;
        apiServer['agentManager'] = mockAgentManager as any;
        apiServer['isConnected'] = true;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockReset();
    });

    describe('Health Check Endpoint', () => {
        test('GET /api/health should return server status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'ok',
                success: true,
                mcpConnected: true,
                message: expect.stringContaining('Agent-Enhanced MCP Web API')
            });

            expect(response.body.agents).toBeDefined();
            expect(response.body.endpoints).toBeInstanceOf(Array);
            expect(response.body.timestamp).toBeDefined();
        });

        test('should handle MCP connection errors gracefully', async () => {
            // Temporarily break the connection
            apiServer['isConnected'] = false;

            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body.mcpConnected).toBe(false);

            // Restore connection
            apiServer['isConnected'] = true;
        });
    });

    describe('Agent Management Endpoints', () => {
        test('GET /api/agents should return available agents', async () => {
            const response = await request(app)
                .get('/api/agents')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                agents: {
                    weather: { name: 'WeatherAgent' },
                    general: { name: 'GeneralAgent' }
                },
                count: 2
            });
        });

        test('should handle agent manager errors', async () => {
            const mockAgentManager = apiServer['agentManager'];
            (mockAgentManager.getAvailableAgents as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Agent manager error');
            });

            const response = await request(app)
                .get('/api/agents')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Agent manager error');
        });
    });

    describe('Tools Endpoint', () => {
        test('GET /api/tools should return available MCP tools', async () => {
            const response = await request(app)
                .get('/api/tools')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                tools: expect.arrayContaining([
                    { name: 'calculator', description: 'Perform calculations' },
                    { name: 'weather_info', description: 'Get weather information' }
                ]),
                count: 2,
                mcpConnected: true
            });
        });

        test('POST /api/tools/:toolName should execute specific tools', async () => {
            const response = await request(app)
                .post('/api/tools/calculator')
                .send({ operation: 'add', a: 5, b: 3 })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                result: 'Tool result',
                toolName: 'calculator',
                args: { operation: 'add', a: 5, b: 3 },
                mcpConnected: true
            });

            expect(apiServer['bridge'].callTool).toHaveBeenCalledWith(
                'calculator',
                { operation: 'add', a: 5, b: 3 }
            );
        });

        test('should handle tool execution errors', async () => {
            (apiServer['bridge'].callTool as jest.Mock).mockRejectedValueOnce(
                new Error('Tool execution failed')
            );

            const response = await request(app)
                .post('/api/tools/calculator')
                .send({ operation: 'divide', a: 5, b: 0 })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Tool execution failed');
        });
    });

    describe('Chat Endpoints', () => {
        test('POST /api/chat should handle direct Ollama chat', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Hello world', model: 'llama3.2' })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                response: 'Ollama response',
                model: 'llama3.2',
                mcpConnected: true,
                agentUsed: 'none'
            });

            expect(apiServer['bridge'].chatWithOllama).toHaveBeenCalledWith(
                'Hello world',
                'llama3.2'
            );
        });

        test('POST /api/chat/smart should use intelligent tool selection', async () => {
            const response = await request(app)
                .post('/api/chat/smart')
                .send({ message: 'What is 25 factorial?', model: 'llama3.2' })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                response: 'Smart response with tools',
                model: 'llama3.2',
                usedTools: true,
                mcpConnected: true,
                agentUsed: 'smart-bridge'
            });

            expect(apiServer['bridge'].processWithTools).toHaveBeenCalledWith(
                'What is 25 factorial?',
                'llama3.2'
            );
        });

        test('POST /api/chat/agent should use intelligent agent routing', async () => {
            const response = await request(app)
                .post('/api/chat/agent')
                .send({
                    message: 'What is the weather in Tokyo?',
                    conversationId: 'test-session'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                response: 'Agent response',
                agentUsed: 'weather',
                toolsUsed: ['weather_info'],
                conversationId: 'test-session',
                routing: {
                    agentName: 'weather',
                    confidence: 0.9,
                    reason: 'Weather keywords detected'
                }
            });

            expect(apiServer['agentManager'].routeMessage).toHaveBeenCalledWith(
                'What is the weather in Tokyo?',
                'test-session',
                undefined
            );
        });

        test('should handle missing message parameter', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ model: 'llama3.2' })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Message is required');
        });

        test('should handle explicit agent selection', async () => {
            const response = await request(app)
                .post('/api/chat/agent')
                .send({
                    message: 'Hello there',
                    agent: 'weather',
                    conversationId: 'test-session'
                })
                .expect(200);

            expect(apiServer['agentManager'].routeMessage).toHaveBeenCalledWith(
                'Hello there',
                'test-session',
                'weather'
            );
        });
    });

    describe('Direct Agent Communication', () => {
        test('POST /api/agents/:agentName/chat should communicate directly with agents', async () => {
            const response = await request(app)
                .post('/api/agents/weather/chat')
                .send({
                    message: 'Will it rain tomorrow?',
                    conversationId: 'weather-session'
                })
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                response: 'Direct agent response',
                agentUsed: 'weather',
                toolsUsed: ['weather_info'],
                conversationId: 'weather-session',
                mcpConnected: true
            });
        });

        test('should handle non-existent agent', async () => {
            (apiServer['agentManager'].getAgent as jest.Mock).mockReturnValueOnce(undefined);

            const response = await request(app)
                .post('/api/agents/nonexistent/chat')
                .send({ message: 'Hello' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain("Agent 'nonexistent' not found");
        });

        test('GET /api/agents/:agentName/history/:conversationId should return conversation history', async () => {
            const mockHistory = [
                { role: 'user', content: 'Previous question', timestamp: new Date() },
                { role: 'assistant', content: 'Previous answer', timestamp: new Date() }
            ];

            (apiServer['agentManager'].getAgentHistory as jest.Mock).mockReturnValueOnce(mockHistory);

            const response = await request(app)
                .get('/api/agents/weather/history/session-123')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                history: mockHistory,
                agentName: 'weather',
                conversationId: 'session-123'
            });
        });

        test('DELETE /api/agents/:agentName/history/:conversationId should clear conversation history', async () => {
            const response = await request(app)
                .delete('/api/agents/weather/history/session-123')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: 'Conversation history cleared',
                agentName: 'weather',
                conversationId: 'session-123'
            });

            expect(apiServer['agentManager'].clearAgentHistory).toHaveBeenCalledWith(
                'weather',
                'session-123'
            );
        });
    });

    describe('Ollama Models Endpoint', () => {
        test('GET /api/ollama/models should return available models', async () => {
            const mockModels = [
                { name: 'llama3.2:latest', size: 1234567890 },
                { name: 'codellama:latest', size: 2345678901 }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({ models: mockModels })
            } as any);

            const response = await request(app)
                .get('/api/ollama/models')
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                models: mockModels,
                count: 2
            });
        });

        test('should handle Ollama API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            } as any);

            const response = await request(app)
                .get('/api/ollama/models')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Failed to fetch models');
        });
    });

    describe('Error Handling', () => {
        test('should handle internal server errors', async () => {
            (apiServer['bridge'].chatWithOllama as jest.Mock).mockRejectedValueOnce(
                new Error('Internal bridge error')
            );

            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test message' })
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Internal bridge error');
        });

        test('should handle MCP connection failures', async () => {
            const mockEnsureConnected = jest.spyOn(apiServer as any, 'ensureConnected');
            mockEnsureConnected.mockRejectedValueOnce(new Error('Connection failed'));

            const response = await request(app)
                .get('/api/tools')
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Connection failed');
        });

        test('should handle malformed request bodies', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send('invalid json')
                .expect(400);

            // Express should handle JSON parsing errors
        });
    });

    describe('CORS and Middleware', () => {
        test('should handle CORS preflight requests', async () => {
            const response = await request(app)
                .options('/api/health')
                .set('Origin', 'http://localhost:3001')
                .set('Access-Control-Request-Method', 'GET')
                .expect(204);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        test('should accept requests from allowed origins', async () => {
            const response = await request(app)
                .get('/api/health')
                .set('Origin', 'http://localhost:3001')
                .expect(200);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    describe('Performance and Load', () => {
        test('should handle concurrent requests', async () => {
            const requests = Array(10).fill(0).map((_, i) =>
                request(app)
                    .post('/api/chat')
                    .send({ message: `Test message ${i}` })
            );

            const responses = await Promise.all(requests);

            responses.forEach((response, i) => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });

        test('should handle large request payloads', async () => {
            const largeMessage = 'A'.repeat(10000);

            const response = await request(app)
                .post('/api/chat')
                .send({ message: largeMessage })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(apiServer['bridge'].chatWithOllama).toHaveBeenCalledWith(
                largeMessage,
                undefined
            );
        });
    });

    describe('Response Format Validation', () => {
        test('should return consistent response format for success', async () => {
            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test' })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('response');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        test('should return consistent error format', async () => {
            (apiServer['bridge'].chatWithOllama as jest.Mock).mockRejectedValueOnce(
                new Error('Test error')
            );

            const response = await request(app)
                .post('/api/chat')
                .send({ message: 'Test' })
                .expect(500);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
        });
    });

    describe('Agent Context Management', () => {
        test('should maintain separate conversation contexts', async () => {
            // First request to session1
            await request(app)
                .post('/api/chat/agent')
                .send({
                    message: 'Weather in Tokyo?',
                    conversationId: 'session1'
                })
                .expect(200);

            // Second request to session2  
            await request(app)
                .post('/api/chat/agent')
                .send({
                    message: 'Weather in London?',
                    conversationId: 'session2'
                })
                .expect(200);

            // Verify both sessions were handled
            expect(apiServer['agentManager'].routeMessage).toHaveBeenCalledWith(
                'Weather in Tokyo?',
                'session1',
                undefined
            );
            expect(apiServer['agentManager'].routeMessage).toHaveBeenCalledWith(
                'Weather in London?',
                'session2',
                undefined
            );
        });

        test('should handle missing conversation ID', async () => {
            const response = await request(app)
                .post('/api/chat/agent')
                .send({ message: 'Test without conversation ID' })
                .expect(200);

            expect(response.body.success).toBe(true);
            // Should generate or use default conversation ID
        });
    });
});
