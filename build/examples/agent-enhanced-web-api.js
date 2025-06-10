import express from 'express';
import cors from 'cors';
import { OllamaMCPBridge } from '../ollama-bridge.js';
import { config } from '../config.js';
import { AgentManager } from '../agents/agent-manager.js';
/**
 * Agent-Enhanced MCP Web API Server
 * Integrates specialized agents for intelligent request routing and processing
 */
class AgentEnhancedWebAPIServer {
    app;
    bridge;
    agentManager;
    isConnected = false;
    server;
    constructor() {
        this.app = express();
        this.bridge = new OllamaMCPBridge();
        this.agentManager = new AgentManager(this.bridge);
        this.agentManager = new AgentManager(this.bridge);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        // Enable CORS for frontend access
        this.app.use(cors({
            origin: [
                'http://localhost:3001', 'http://127.0.0.1:3001', // Minimal frontend
                'http://localhost:3003', 'http://127.0.0.1:3003' // MCP Bridge frontend
            ],
            credentials: true
        }));
        // Parse JSON bodies
        this.app.use(express.json({ limit: '10mb' })); // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }
    setupRoutes() {
        // Enhanced health check with agent information
        this.app.get('/api/health', async (req, res) => {
            try {
                await this.ensureConnected();
                const mcpConfig = config.getFullConfig();
                const availableAgents = this.agentManager.getAvailableAgents();
                res.json({
                    status: 'ok',
                    success: true,
                    timestamp: new Date().toISOString(),
                    mcpConnected: this.isConnected,
                    message: 'Agent-Enhanced MCP Web API server with intelligent routing',
                    config: mcpConfig,
                    agents: availableAgents,
                    endpoints: [
                        'GET /api/health',
                        'GET /api/agents',
                        'GET /api/tools',
                        'GET /api/ollama/models',
                        'POST /api/chat',
                        'POST /api/chat/smart',
                        'POST /api/chat/agent',
                        'POST /api/agents/:agentName/chat',
                        'POST /api/tools/:toolName'
                    ]
                });
            }
            catch (error) {
                res.json({
                    status: 'ok',
                    success: true,
                    timestamp: new Date().toISOString(),
                    mcpConnected: false,
                    message: 'MCP connection failed, but server running',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Get available agents
        this.app.get('/api/agents', (req, res) => {
            try {
                const agents = this.agentManager.getAvailableAgents();
                res.json({
                    success: true,
                    agents,
                    message: 'Available specialized agents',
                    count: Object.keys(agents).length
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Get available MCP tools
        this.app.get('/api/tools', async (req, res) => {
            try {
                await this.ensureConnected();
                const tools = await this.bridge.getAvailableTools();
                res.json({
                    success: true,
                    tools: tools,
                    message: 'Available MCP tools',
                    count: tools.length,
                    mcpConnected: true
                });
            }
            catch (error) {
                console.error('Error getting MCP tools:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    message: 'Failed to connect to MCP server'
                });
            }
        });
        // Call a specific MCP tool directly
        this.app.post('/api/tools/:toolName', async (req, res) => {
            try {
                await this.ensureConnected();
                const { toolName } = req.params;
                const args = req.body || {};
                console.log(`🔧 Direct tool call: ${toolName} with args:`, args);
                const result = await this.bridge.callTool(toolName, args);
                res.json({
                    success: true,
                    result,
                    toolName,
                    args,
                    timestamp: new Date().toISOString(),
                    mcpConnected: true
                });
            }
            catch (error) {
                console.error(`Error calling MCP tool ${req.params.toolName}:`, error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    toolName: req.params.toolName,
                    args: req.body
                });
            }
        }); // Direct chat with Ollama (no agents)
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
                    agentUsed: 'none',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('Chat error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }); // Smart chat with tool selection (original MCP bridge)
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
                const response = await this.bridge.processWithTools(message, model);
                res.json({
                    success: true,
                    response,
                    model: model || config.getOllamaConfig().defaultModel,
                    usedTools: true,
                    mcpConnected: true,
                    agentUsed: 'smart-bridge',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('Smart chat error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }); // Agent-routed chat (NEW: Intelligent agent routing)
        this.app.post('/api/chat/agent', async (req, res) => {
            try {
                const { message, conversationId, agent, model } = req.body;
                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }
                await this.ensureConnected();
                console.log(`🤖 Agent chat request: "${message}" ${agent ? `(explicit: ${agent})` : '(auto-route)'}`);
                const result = await this.agentManager.routeMessage(message, conversationId || 'web-session', agent);
                res.json({
                    success: true,
                    response: result.response,
                    agentUsed: result.agentUsed,
                    toolsUsed: result.toolsUsed,
                    routing: result.routing,
                    conversationId: conversationId || 'web-session',
                    model: model || config.getOllamaConfig().defaultModel,
                    mcpConnected: true,
                    timestamp: new Date().toISOString(),
                    context: {
                        messageCount: result.context.messages?.length || 0,
                        lastActivity: result.context.timestamp
                    }
                });
            }
            catch (error) {
                console.error('Agent chat error:', error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }); // Direct chat with specific agent
        this.app.post('/api/agents/:agentName/chat', async (req, res) => {
            try {
                const { agentName } = req.params;
                const { message, conversationId } = req.body;
                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }
                const agent = this.agentManager.getAgent(agentName);
                if (!agent) {
                    return res.status(404).json({
                        success: false,
                        error: `Agent '${agentName}' not found`
                    });
                }
                await this.ensureConnected();
                console.log(`🎯 Direct agent chat: ${agentName} - "${message}"`);
                const result = await agent.processRequest(message, conversationId || `${agentName}-session`);
                res.json({
                    success: true,
                    response: result.response,
                    agentUsed: agentName,
                    toolsUsed: result.toolsUsed,
                    conversationId: conversationId || `${agentName}-session`,
                    mcpConnected: true,
                    timestamp: new Date().toISOString(),
                    context: {
                        messageCount: result.context.messages?.length || 0
                    }
                });
            }
            catch (error) {
                console.error(`Agent ${req.params.agentName} chat error:`, error);
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    agentName: req.params.agentName
                });
            }
        });
        // Get conversation history for an agent
        this.app.get('/api/agents/:agentName/history/:conversationId?', (req, res) => {
            try {
                const { agentName, conversationId } = req.params;
                const history = this.agentManager.getAgentHistory(agentName, conversationId);
                res.json({
                    success: true,
                    history,
                    agentName,
                    conversationId: conversationId || 'default',
                    messageCount: history.length
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Clear conversation history for an agent
        this.app.delete('/api/agents/:agentName/history/:conversationId?', (req, res) => {
            try {
                const { agentName, conversationId } = req.params;
                const cleared = this.agentManager.clearAgentContext(agentName, conversationId);
                res.json({
                    success: cleared,
                    message: cleared ? 'History cleared successfully' : 'Agent not found',
                    agentName,
                    conversationId: conversationId || 'default'
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
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
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
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
                error: 'Endpoint not found',
                availableEndpoints: [
                    'GET /api/health',
                    'GET /api/agents',
                    'GET /api/tools',
                    'POST /api/chat/agent',
                    'POST /api/agents/:agentName/chat'
                ]
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
            console.log('🚀 Starting Agent-Enhanced MCP Web API server...');
            // Start the server
            this.server = this.app.listen(port, () => {
                console.log(`\n🚀 Agent-Enhanced MCP Web API Server running on port ${port}`);
                console.log(`📡 Frontend can access: http://localhost:${port}`);
                console.log(`🤖 Agent System: ENABLED with intelligent routing`);
                console.log('\n📋 Available endpoints:');
                console.log(`   GET  /api/health             - Server health check (with agent info)`);
                console.log(`   GET  /api/agents             - List available agents`);
                console.log(`   GET  /api/tools              - List MCP tools`);
                console.log(`   POST /api/chat               - Direct Ollama chat (no agents)`);
                console.log(`   POST /api/chat/smart         - Smart chat with MCP tools`);
                console.log(`   POST /api/chat/agent         - 🆕 Intelligent agent routing`);
                console.log(`   POST /api/agents/:name/chat  - 🆕 Direct agent chat`);
                console.log(`   GET  /api/ollama/models      - Get available Ollama models`);
                console.log('\n🎯 Agent Examples:');
                console.log(`   curl -X POST http://localhost:${port}/api/chat/agent \\`);
                console.log(`     -H "Content-Type: application/json" \\`);
                console.log(`     -d '{"message": "What\\'s the weather in Tokyo?"}'`);
                console.log('\n🌤️  Weather Agent Example:');
                console.log(`   curl -X POST http://localhost:${port}/api/agents/weather/chat \\`);
                console.log(`     -H "Content-Type: application/json" \\`);
                console.log(`     -d '{"message": "Will it rain tomorrow in London?"}'`);
            });
            // Try to connect to MCP on startup
            try {
                await this.ensureConnected();
                console.log(`\n✅ MCP server connected successfully!`);
                const tools = await this.bridge.getAvailableTools();
                const agents = this.agentManager.getAvailableAgents();
                console.log(`📋 Available MCP tools: ${tools.map(t => t.name).join(', ')}`);
                console.log(`🤖 Available agents: ${Object.keys(agents).join(', ')}`);
            }
            catch (error) {
                console.log(`\n⚠️  MCP server not ready yet (will connect on first request)`);
                console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
        }
        catch (error) {
            console.error('❌ Failed to start server:', error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    }
    async shutdown() {
        console.log('\n🔄 Shutting down Agent-Enhanced MCP Web API server...');
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
const port = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const server = new AgentEnhancedWebAPIServer();
server.start(port);
export { AgentEnhancedWebAPIServer };
//# sourceMappingURL=agent-enhanced-web-api.js.map