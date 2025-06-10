import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { MockOllamaMCPBridge, MockAgentManager, mockConfig } from './mocks/index.js';

// Mock the external modules to avoid import issues
jest.mock('../src/ollama-bridge.js', () => ({
    OllamaMCPBridge: MockOllamaMCPBridge
}));

jest.mock('../src/config.js', () => ({
    config: mockConfig
}));

jest.mock('../src/agents/agent-manager.js', () => ({
    AgentManager: MockAgentManager
}));

describe('Web API Integration (Simplified)', () => {
    let app: express.Application;
    let bridge: MockOllamaMCPBridge;
    let agentManager: MockAgentManager;

    beforeEach(() => {
        // Create Express app with similar setup to the real web API
        app = express();
        bridge = new MockOllamaMCPBridge();
        agentManager = new MockAgentManager();

        // Setup middleware
        app.use(cors({
            origin: ['http://localhost:3001', 'http://localhost:3003'],
            credentials: true
        }));
        app.use(express.json({ limit: '10mb' }));

        // Setup routes
        setupRoutes();
    });

    function setupRoutes() {
        // Health check endpoint
        app.get('/api/health', async (req, res) => {
            try {
                await bridge.connect();
                res.json({
                    status: 'ok',
                    success: true,
                    timestamp: new Date().toISOString(),
                    mcpConnected: bridge.isConnected(),
                    message: 'Mock Web API server',
                    config: mockConfig.getFullConfig()
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Get available tools
        app.get('/api/tools', async (req, res) => {
            try {
                await bridge.connect();
                const tools = await bridge.getAvailableTools();
                res.json({
                    success: true,
                    tools,
                    message: 'Available MCP tools',
                    count: tools.length,
                    mcpConnected: true
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Get available agents
        app.get('/api/agents', (req, res) => {
            try {
                const agents = agentManager.getAvailableAgents();
                res.json({
                    success: true,
                    agents,
                    message: 'Available agents',
                    count: Object.keys(agents).length
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Call a specific tool
        app.post('/api/tools/:toolName', async (req, res) => {
            try {
                await bridge.connect();
                const { toolName } = req.params;
                const args = req.body || {};

                const result = await bridge.callTool(toolName, args);
                res.json({
                    success: true,
                    result,
                    toolName,
                    args,
                    timestamp: new Date().toISOString(),
                    mcpConnected: true
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    toolName: req.params.toolName
                });
            }
        });

        // Smart chat endpoint
        app.post('/api/chat/smart', async (req, res) => {
            try {
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                await bridge.connect();
                const response = await bridge.processWithTools(message, model);

                res.json({
                    success: true,
                    response,
                    model: model || 'llama2',
                    usedTools: true,
                    mcpConnected: true,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });

        // Agent chat endpoint
        app.post('/api/chat/agent', async (req, res) => {
            try {
                const { message } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                await bridge.connect();
                const result = await agentManager.routeRequest(message);

                res.json({
                    success: true,
                    response: result.response,
                    agentUsed: result.agentName,
                    confidence: result.confidence,
                    toolsUsed: result.toolsUsed,
                    mcpConnected: true,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }

    describe('Health Check Endpoint', () => {
        test('should return server health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    status: 'ok',
                    success: true,
                    mcpConnected: true,
                    message: 'Mock Web API server'
                })
            );
            expect(response.body.timestamp).toBeDefined();
            expect(response.body.config).toBeDefined();
        });
    });

    describe('Tools Endpoint', () => {
        test('should return available MCP tools', async () => {
            const response = await request(app)
                .get('/api/tools')
                .expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    message: 'Available MCP tools',
                    mcpConnected: true
                })
            );
            expect(response.body.tools).toBeInstanceOf(Array);
            expect(response.body.count).toBeGreaterThan(0);
        });

        test('should call a specific tool', async () => {
            const response = await request(app)
                .post('/api/tools/calculator')
                .send({ operation: 'add', a: 2, b: 3 })
                .expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    toolName: 'calculator',
                    mcpConnected: true
                })
            );
            expect(response.body.result).toBeDefined();
            expect(response.body.args).toEqual({ operation: 'add', a: 2, b: 3 });
        });

        test('should handle unknown tool calls', async () => {
            const response = await request(app)
                .post('/api/tools/unknown_tool')
                .send({})
                .expect(500);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: false,
                    toolName: 'unknown_tool'
                })
            );
        });
    });

    describe('Agents Endpoint', () => {
        test('should return available agents', async () => {
            const response = await request(app)
                .get('/api/agents')
                .expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    message: 'Available agents'
                })
            );
            expect(response.body.agents).toBeDefined();
            expect(response.body.count).toBeGreaterThan(0);
        });
    });

    describe('Chat Endpoints', () => {
        test('should handle smart chat requests', async () => {
            const response = await request(app)
                .post('/api/chat/smart')
                .send({
                    message: 'What is the weather like?',
                    model: 'llama2'
                })
                .expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    usedTools: true,
                    mcpConnected: true,
                    model: 'llama2'
                })
            );
            expect(response.body.response).toContain('What is the weather like?');
        });

        test('should handle agent chat requests', async () => {
            const response = await request(app)
                .post('/api/chat/agent')
                .send({ message: 'Hello, I need help with something' })
                .expect(200);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: true,
                    agentUsed: 'general',
                    mcpConnected: true
                })
            );
            expect(response.body.confidence).toBeDefined();
            expect(response.body.toolsUsed).toBeInstanceOf(Array);
        });

        test('should require message in chat requests', async () => {
            const response = await request(app)
                .post('/api/chat/smart')
                .send({})
                .expect(400);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: false,
                    error: 'Message is required'
                })
            );
        });
    });

    describe('Error Handling', () => {
        test('should handle bridge connection errors gracefully', async () => {
            // Simulate connection error
            const originalConnect = bridge.connect;
            bridge.connect = jest.fn().mockRejectedValue(new Error('Connection failed'));

            const response = await request(app)
                .get('/api/health')
                .expect(500);

            expect(response.body).toEqual(
                expect.objectContaining({
                    status: 'error',
                    success: false,
                    error: 'Connection failed'
                })
            );

            // Restore original method
            bridge.connect = originalConnect;
        });

        test('should handle tool execution errors', async () => {
            // Simulate tool error
            const originalCallTool = bridge.callTool;
            bridge.callTool = jest.fn().mockRejectedValue(new Error('Tool execution failed'));

            const response = await request(app)
                .post('/api/tools/calculator')
                .send({ operation: 'add', a: 1, b: 2 })
                .expect(500);

            expect(response.body).toEqual(
                expect.objectContaining({
                    success: false,
                    error: 'Tool execution failed',
                    toolName: 'calculator'
                })
            );

            // Restore original method
            bridge.callTool = originalCallTool;
        });
    });
});
