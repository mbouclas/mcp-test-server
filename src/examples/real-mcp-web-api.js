import express from 'express';
import cors from 'cors';
import { OllamaMCPBridge } from '../../build/ollama-bridge.js';
import { config } from '../../build/config.js';

/**
 * Real MCP Web API server that connects to the actual MCP server
 * This provides genuine MCP tool integration with Ollama
 */

class RealMCPWebAPIServer {
    constructor() {
        this.app = express();
        this.bridge = new OllamaMCPBridge();
        this.isConnected = false;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Enable CORS for frontend access
        this.app.use(cors({
            origin: [
                'http://localhost:3001', 'http://127.0.0.1:3001',  // Minimal frontend
                'http://localhost:3003', 'http://127.0.0.1:3003'   // MCP Bridge frontend
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
        // Health check endpoint - now with REAL MCP connection
        this.app.get('/api/health', async (req, res) => {
            try {
                await this.ensureConnected();
                const mcpConfig = config.getFullConfig();

                res.json({
                    status: 'ok',
                    success: true,
                    timestamp: new Date().toISOString(),
                    mcpConnected: this.isConnected,
                    message: 'Real MCP Web API server with actual MCP tools',
                    config: mcpConfig,
                    endpoints: [
                        'GET /api/health',
                        'GET /api/tools',
                        'GET /api/ollama/models',
                        'POST /api/chat',
                        'POST /api/chat/smart',
                        'POST /api/tools/:toolName'
                    ]
                });
            } catch (error) {
                res.json({
                    status: 'ok',
                    success: true,
                    timestamp: new Date().toISOString(),
                    mcpConnected: false,
                    message: 'MCP connection failed, but server running',
                    error: error.message
                });
            }
        });

        // Get REAL MCP tools
        this.app.get('/api/tools', async (req, res) => {
            try {
                await this.ensureConnected();
                const tools = await this.bridge.getAvailableTools();

                res.json({
                    success: true,
                    tools: tools,
                    message: 'Real MCP tools from your server',
                    count: tools.length,
                    mcpConnected: true
                });
            } catch (error) {
                console.error('Error getting MCP tools:', error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    message: 'Failed to connect to MCP server'
                });
            }
        });

        // Call a specific REAL MCP tool
        this.app.post('/api/tools/:toolName', async (req, res) => {
            try {
                await this.ensureConnected();
                const { toolName } = req.params;
                const args = req.body || {};

                console.log(`🔧 Calling real MCP tool: ${toolName} with args:`, args);
                const result = await this.bridge.callTool(toolName, args);

                res.json({
                    success: true,
                    result,
                    toolName,
                    args,
                    timestamp: new Date().toISOString(),
                    mcpConnected: true
                });
            } catch (error) {
                console.error(`Error calling MCP tool ${toolName}:`, error);
                res.status(500).json({
                    success: false,
                    error: error.message,
                    toolName,
                    args: req.body
                });
            }
        });

        // Direct chat with Ollama
        this.app.post('/api/chat', async (req, res) => {
            try {
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                await this.ensureConnected();
                const response = await this.bridge.chatWithOllama(message, model);

                res.json({
                    success: true,
                    response,
                    model: model || config.getOllamaConfig().defaultModel,
                    mcpConnected: this.isConnected,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Chat error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Smart chat with REAL MCP tools
        this.app.post('/api/chat/smart', async (req, res) => {
            try {
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                await this.ensureConnected();
                console.log(`💬 Smart chat request: "${message}"`);

                // Use the bridge's processWithTools method for real MCP integration
                const response = await this.bridge.processWithTools(message, model);

                res.json({
                    success: true,
                    response,
                    model: model || config.getOllamaConfig().defaultModel,
                    usedTools: true,
                    mcpConnected: true,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Smart chat error:', error);
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
            console.log('🔗 Connecting to MCP server...');
            await this.bridge.connect();
            this.isConnected = true;
            console.log('✅ Connected to MCP server');
        }
    }

    async start(port = 3002) {
        try {
            console.log('🚀 Starting REAL MCP Web API server...');

            // Start the server
            this.server = this.app.listen(port, () => {
                console.log(`\n🚀 REAL MCP Web API Server running on port ${port}`);
                console.log(`📡 Frontend can access: http://localhost:${port}`);
                console.log(`🔗 MCP Integration: ENABLED (Real Tools)`);
                console.log('\n📋 Available endpoints:');
                console.log(`   GET  /api/health           - Server health check (with real MCP status)`);
                console.log(`   GET  /api/tools            - List REAL MCP tools`);
                console.log(`   POST /api/tools/:toolName  - Call REAL MCP tools`);
                console.log(`   POST /api/chat             - Direct chat with Ollama`);
                console.log(`   POST /api/chat/smart       - Smart chat with REAL MCP tools`);
                console.log(`   GET  /api/ollama/models    - Get available Ollama models`);
                console.log('\n💡 Example usage with REAL MCP tools:');
                console.log(`   curl -X POST http://localhost:${port}/api/chat/smart \\`);
                console.log(`     -H "Content-Type: application/json" \\`);
                console.log(`     -d '{"message": "Check my service health"}'`);
                console.log('\n🎯 This server now connects to your ACTUAL MCP server!');
            });

            // Try to connect to MCP on startup (but don't fail if it's not ready)
            try {
                await this.ensureConnected();
                console.log(`\n✅ MCP server connected successfully!`);
                const tools = await this.bridge.getAvailableTools();
                console.log(`📋 Available MCP tools: ${tools.map(t => t.name).join(', ')}`);
            } catch (error) {
                console.log(`\n⚠️  MCP server not ready yet (will connect on first request)`);
                console.log(`   Error: ${error.message}`);
            }

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

// Auto-start the server
const port = process.env.PORT || 3002;
const server = new RealMCPWebAPIServer();
server.start(port);

export { RealMCPWebAPIServer };
