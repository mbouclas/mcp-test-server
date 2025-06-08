import express from 'express';
import cors from 'cors';
import { OllamaMCPBridge } from '../../build/ollama-bridge.js';
import { config } from '../../build/config.js';

/**
 * Web API server that exposes MCP + Ollama functionality via REST endpoints
 * This allows frontend applications to interact with your MCP tools and Ollama
 */

class WebAPIServer {
    constructor() {
        this.app = express();
        this.bridge = new OllamaMCPBridge();
        this.isConnected = false;
        this.setupMiddleware();
        this.setupRoutes();
    } setupMiddleware() {
        // Enable CORS for frontend access (support both frontends)
        this.app.use(cors({
            origin: [
                'http://localhost:3001', // minimal frontend
                'http://localhost:3003', // MCP bridge frontend
                'http://127.0.0.1:3001',
                'http://127.0.0.1:3003'
            ],
            credentials: true
        }));

        // Parse JSON bodies
        this.app.use(express.json({ limit: '10mb' }));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                mcpConnected: this.isConnected,
                config: config.getFullConfig()
            });
        });

        // Get available MCP tools
        this.app.get('/api/tools', async (req, res) => {
            try {
                await this.ensureConnected();
                const tools = await this.bridge.getAvailableTools();
                res.json({ success: true, tools });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Call a specific MCP tool
        this.app.post('/api/tools/:toolName', async (req, res) => {
            try {
                await this.ensureConnected();
                const { toolName } = req.params;
                const args = req.body || {};

                const result = await this.bridge.callTool(toolName, args);
                res.json({
                    success: true,
                    result,
                    toolName,
                    args
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Chat with Ollama (simple chat)
        this.app.post('/api/chat', async (req, res) => {
            try {
                await this.ensureConnected();
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                const response = await this.bridge.chatWithOllama(message, model);
                res.json({
                    success: true,
                    response,
                    model: model || config.getOllamaConfig().defaultModel
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Chat with Ollama using MCP tools (intelligent chat)
        this.app.post('/api/chat/smart', async (req, res) => {
            try {
                await this.ensureConnected();
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                const response = await this.bridge.processWithTools(message, model);
                res.json({
                    success: true,
                    response,
                    model: model || config.getOllamaConfig().defaultModel,
                    usedTools: true
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Stream chat responses (for real-time chat UIs)
        this.app.post('/api/chat/stream', async (req, res) => {
            try {
                await this.ensureConnected();
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                // Set up Server-Sent Events
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                });

                // Send initial event
                res.write(`data: ${JSON.stringify({ type: 'start', message: 'Processing...' })}\n\n`);

                try {
                    const response = await this.bridge.processWithTools(message, model);
                    res.write(`data: ${JSON.stringify({
                        type: 'response',
                        response,
                        model: model || config.getOllamaConfig().defaultModel
                    })}\n\n`);
                } catch (error) {
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        error: error.message
                    })}\n\n`);
                }

                res.write(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
                res.end();
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Get Ollama models
        this.app.get('/api/ollama/models', async (req, res) => {
            try {
                const ollamaConfig = config.getOllamaConfig();
                const response = await fetch(`${ollamaConfig.baseUrl}${ollamaConfig.tagsEndpoint}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch Ollama models');
                }

                const data = await response.json();
                res.json({
                    success: true,
                    models: data.models || [],
                    defaultModel: ollamaConfig.defaultModel
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found'
            });
        });
    }

    async ensureConnected() {
        if (!this.isConnected) {
            await this.bridge.connect();
            this.isConnected = true;
        }
    }
    async start(port = 3002) {
        try {
            // Start the server first, then connect to MCP bridge on demand
            console.log('🚀 Starting web API server...');

            // Start the server
            this.server = this.app.listen(port, () => {
                console.log(`\n🚀 MCP Web API Server running on port ${port}`);
                console.log(`📡 Frontend can access: http://localhost:${port}`);
                console.log('\n📋 Available endpoints:');
                console.log(`   GET  /api/health           - Server health check`);
                console.log(`   GET  /api/tools            - List available MCP tools`);
                console.log(`   POST /api/tools/:toolName  - Call a specific tool`);
                console.log(`   POST /api/chat             - Simple chat with Ollama`);
                console.log(`   POST /api/chat/smart       - Smart chat with MCP tools`);
                console.log(`   POST /api/chat/stream      - Streaming chat responses`);
                console.log(`   GET  /api/ollama/models    - Get available Ollama models`);
                console.log('\n💡 Example frontend usage:');
                console.log(`   fetch('http://localhost:${port}/api/chat/smart', {`);
                console.log(`     method: 'POST',`);
                console.log(`     headers: { 'Content-Type': 'application/json' },`);
                console.log(`     body: JSON.stringify({ message: 'Is my API running?' })`);
                console.log(`   })`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());

        } catch (error) {
            console.error('❌ Failed to start server:', error.message);
            process.exit(1);
        }
    }

    async shutdown() {
        console.log('\n🔄 Shutting down server...');

        if (this.server) {
            this.server.close();
        }

        if (this.isConnected) {
            await this.bridge.disconnect();
        }

        console.log('✅ Server shutdown complete');
        process.exit(0);
    }
}

// Start the server if this file is run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const port = process.env.PORT || 3002;
    const server = new WebAPIServer();
    server.start(port);
}

export { WebAPIServer };
