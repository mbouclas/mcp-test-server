import express from 'express';
import cors from 'cors';

/**
 * Minimal Web API server to test frontend integration without MCP complexity
 * This allows frontend applications to interact with Ollama directly
 */

class MinimalWebAPIServer {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    } setupMiddleware() {
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

    setupRoutes() {        // Health check endpoint - MCP compatible response
        this.app.get('/api/health', (req, res) => {
            res.json({
                status: 'ok',
                success: true,
                timestamp: new Date().toISOString(),
                mcpConnected: false, // Minimal server doesn't have real MCP
                message: 'Minimal Web API server is running (Mock MCP tools)',
                config: {
                    ollama: {
                        defaultModel: 'gemma3:4b',
                        baseUrl: 'http://localhost:11434'
                    }
                },
                endpoints: [
                    'GET /api/health',
                    'GET /api/tools',
                    'GET /api/ollama/models',
                    'POST /api/chat',
                    'POST /api/chat/smart',
                    'POST /api/test'
                ]
            });
        });

        // Test endpoint
        this.app.post('/api/test', (req, res) => {
            res.json({
                success: true,
                message: 'Test endpoint working',
                received: req.body,
                timestamp: new Date().toISOString()
            });
        });

        // Direct chat with Ollama (no MCP)
        this.app.post('/api/chat', async (req, res) => {
            try {
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                // Call Ollama directly
                const response = await this.chatWithOllama(message, model);
                res.json({
                    success: true,
                    response,
                    model: model || 'gemma3:4b',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });        // Smart chat endpoint with tool intelligence
        this.app.post('/api/chat/smart', async (req, res) => {
            try {
                const { message, model } = req.body;

                if (!message) {
                    return res.status(400).json({
                        success: false,
                        error: 'Message is required'
                    });
                }

                // Analyze the message to see if we should use a tool
                const toolAnalysis = this.analyzeMessageForTools(message);

                if (toolAnalysis.shouldUseTool) {
                    console.log(`🔧 Using tool: ${toolAnalysis.tool} for query: "${message}"`);

                    // Execute the appropriate tool
                    const toolResult = await this.executeToolByName(toolAnalysis.tool, toolAnalysis.args);

                    // Generate a natural response based on tool result
                    const naturalResponse = this.formatToolResponse(toolAnalysis.tool, toolResult, message);

                    res.json({
                        success: true,
                        response: naturalResponse,
                        model: model || 'gemma3:4b',
                        usedTools: true,
                        toolUsed: toolAnalysis.tool,
                        toolResult: toolResult,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // No tool needed, use regular Ollama chat
                    const response = await this.chatWithOllama(message, model);
                    res.json({
                        success: true,
                        response,
                        model: model || 'gemma3:4b',
                        usedTools: false,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error('Smart chat error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });// Get available tools endpoint (mock tools for demo)
        this.app.get('/api/tools', async (req, res) => {
            // Mock tools to demonstrate frontend functionality
            const mockTools = [
                {
                    name: "get_current_time",
                    description: "Get the current date and time",
                    inputSchema: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                },
                {
                    name: "check_api_health",
                    description: "Check the health status of the API server",
                    inputSchema: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                },
                {
                    name: "get_system_info",
                    description: "Get basic system information",
                    inputSchema: {
                        type: "object",
                        properties: {},
                        required: []
                    }
                },
                {
                    name: "calculate",
                    description: "Perform basic mathematical calculations",
                    inputSchema: {
                        type: "object",
                        properties: {
                            expression: {
                                type: "string",
                                description: "Mathematical expression to evaluate"
                            }
                        },
                        required: ["expression"]
                    }
                }
            ];

            res.json({
                success: true,
                tools: mockTools,
                message: 'Mock tools available (MCP bridge not connected yet)',
                count: mockTools.length
            });
        });

        // Get Ollama models
        this.app.get('/api/ollama/models', async (req, res) => {
            try {
                const response = await fetch('http://127.0.0.1:11434/api/tags');

                if (!response.ok) {
                    throw new Error('Failed to fetch Ollama models');
                }

                const data = await response.json(); res.json({
                    success: true,
                    models: data.models || [],
                    defaultModel: 'gemma3:4b'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });

        // Call a specific tool endpoint (mock implementation)
        this.app.post('/api/tools/:toolName', async (req, res) => {
            try {
                const { toolName } = req.params;
                const args = req.body || {};

                // Mock tool implementations
                let result;
                switch (toolName) {
                    case 'get_current_time':
                        result = {
                            current_time: new Date().toISOString(),
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            formatted: new Date().toLocaleString()
                        };
                        break;

                    case 'check_api_health':
                        result = {
                            status: 'healthy',
                            uptime: process.uptime(),
                            memory_usage: process.memoryUsage(),
                            timestamp: new Date().toISOString()
                        };
                        break;

                    case 'get_system_info':
                        result = {
                            platform: process.platform,
                            node_version: process.version,
                            architecture: process.arch,
                            pid: process.pid
                        };
                        break;

                    case 'calculate':
                        try {
                            // Simple safe evaluation (only basic math)
                            const expression = args.expression || '';
                            const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
                            const calculationResult = Function('"use strict"; return (' + safeExpression + ')')();
                            result = {
                                expression: expression,
                                result: calculationResult,
                                safe_expression: safeExpression
                            };
                        } catch (error) {
                            result = {
                                error: 'Invalid mathematical expression',
                                expression: args.expression
                            };
                        }
                        break;

                    default:
                        return res.status(404).json({
                            success: false,
                            error: `Tool '${toolName}' not found`
                        });
                }

                res.json({
                    success: true,
                    result,
                    toolName,
                    args,
                    timestamp: new Date().toISOString()
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

    /**
     * Analyze user message to determine if we should use a tool
     */
    analyzeMessageForTools(message) {
        const lowerMessage = message.toLowerCase();

        // API health check patterns
        if (lowerMessage.includes('api') && (lowerMessage.includes('health') || lowerMessage.includes('running') || lowerMessage.includes('status') || lowerMessage.includes('okay'))) {
            return {
                shouldUseTool: true,
                tool: 'check_api_health',
                args: {},
                confidence: 0.9
            };
        }

        // Time-related queries
        if (lowerMessage.includes('time') || lowerMessage.includes('date') || lowerMessage.includes('now') || lowerMessage.includes('current')) {
            return {
                shouldUseTool: true,
                tool: 'get_current_time',
                args: {},
                confidence: 0.8
            };
        }

        // System info queries
        if (lowerMessage.includes('system') && (lowerMessage.includes('info') || lowerMessage.includes('details') || lowerMessage.includes('version'))) {
            return {
                shouldUseTool: true,
                tool: 'get_system_info',
                args: {},
                confidence: 0.8
            };
        }

        // Math calculation patterns
        const mathPattern = /[\d+\-*/()]/;
        if (mathPattern.test(lowerMessage) && (lowerMessage.includes('calculate') || lowerMessage.includes('math') || lowerMessage.includes('solve') || lowerMessage.includes('='))) {
            // Extract mathematical expression
            const expressionMatch = lowerMessage.match(/[\d+\-*/().\s]+/);
            return {
                shouldUseTool: true,
                tool: 'calculate',
                args: { expression: expressionMatch ? expressionMatch[0].trim() : lowerMessage },
                confidence: 0.7
            };
        }

        return {
            shouldUseTool: false,
            confidence: 0
        };
    }

    /**
     * Execute a tool by name with given arguments
     */
    async executeToolByName(toolName, args = {}) {
        switch (toolName) {
            case 'get_current_time':
                return {
                    current_time: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    formatted: new Date().toLocaleString()
                };

            case 'check_api_health':
                return {
                    status: 'healthy',
                    uptime: Math.round(process.uptime()),
                    memory_usage: process.memoryUsage(),
                    timestamp: new Date().toISOString(),
                    endpoints_active: 6
                };

            case 'get_system_info':
                return {
                    platform: process.platform,
                    node_version: process.version,
                    architecture: process.arch,
                    pid: process.pid
                };

            case 'calculate':
                try {
                    const expression = args.expression || '';
                    const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
                    const result = Function('"use strict"; return (' + safeExpression + ')')();
                    return {
                        expression: expression,
                        result: result,
                        safe_expression: safeExpression
                    };
                } catch (error) {
                    return {
                        error: 'Invalid mathematical expression',
                        expression: args.expression
                    };
                }

            default:
                throw new Error(`Tool '${toolName}' not implemented`);
        }
    }

    /**
     * Format tool result into a natural language response
     */
    formatToolResponse(toolName, toolResult, originalMessage) {
        switch (toolName) {
            case 'check_api_health':
                if (toolResult.status === 'healthy') {
                    return `✅ Your API is running perfectly! It's been up for ${toolResult.uptime} seconds and all ${toolResult.endpoints_active} endpoints are active. Memory usage is normal at ${Math.round(toolResult.memory_usage.heapUsed / 1024 / 1024)}MB.`;
                } else {
                    return `⚠️ There might be some issues with your API. Status: ${toolResult.status}`;
                }

            case 'get_current_time':
                return `🕐 The current time is ${toolResult.formatted} (${toolResult.timezone}). The precise timestamp is ${toolResult.current_time}.`;

            case 'get_system_info':
                return `💻 System Information:\n- Platform: ${toolResult.platform}\n- Node.js Version: ${toolResult.node_version}\n- Architecture: ${toolResult.architecture}\n- Process ID: ${toolResult.pid}`;

            case 'calculate':
                if (toolResult.error) {
                    return `❌ I couldn't calculate that: ${toolResult.error}. Please check your mathematical expression.`;
                } else {
                    return `🧮 Calculation result: ${toolResult.expression} = ${toolResult.result}`;
                }

            default:
                return `Tool '${toolName}' executed successfully with result: ${JSON.stringify(toolResult)}`;
        }
    }

    async chatWithOllama(message, model = 'gemma3:4b') {
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: message,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.response;
    }

    async start(port = 3002) {
        try {
            console.log('🚀 Starting minimal web API server...');

            // Start the server
            this.server = this.app.listen(port, () => {
                console.log(`\n🚀 Minimal Web API Server running on port ${port}`);
                console.log(`📡 Frontend can access: http://localhost:${port}`);
                console.log('\n📋 Available endpoints:');
                console.log(`   GET  /api/health           - Server health check`);
                console.log(`   POST /api/test             - Test endpoint`);
                console.log(`   POST /api/chat             - Direct chat with Ollama`);
                console.log(`   GET  /api/ollama/models    - Get available Ollama models`);
                console.log('\n💡 Example usage:');
                console.log(`   curl -X POST http://localhost:${port}/api/chat \\`);
                console.log(`     -H "Content-Type: application/json" \\`);
                console.log(`     -d '{"message": "Hello, how are you?"}'`);
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

        console.log('✅ Server shutdown complete');
        process.exit(0);
    }
}

// Auto-start the server
const port = process.env.PORT || 3002;
const server = new MinimalWebAPIServer();
server.start(port);

export { MinimalWebAPIServer };
