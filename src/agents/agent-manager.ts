import { BaseAgent } from './base-agent.js';
import { WeatherAgent } from './weather-agent.js';
import { OllamaMCPBridge } from '../ollama-bridge.js';

/**
 * Agent Manager - Routes requests to appropriate specialized agents
 * Manages agent lifecycle and provides a unified interface
 */

export interface AgentRegistry {
    [key: string]: BaseAgent;
}

export interface RouteResult {
    agentName: string;
    confidence: number;
    reason: string;
}

export class AgentManager {
    private agents: AgentRegistry = {};
    private bridge: OllamaMCPBridge;
    private defaultAgent: string = 'general';

    constructor(bridge: OllamaMCPBridge) {
        this.bridge = bridge;
        this.initializeAgents();
    }

    /**
     * Initialize all available agents
     */
    private initializeAgents(): void {
        // Register Weather Agent
        this.agents.weather = new WeatherAgent(this.bridge);

        // TODO: Add more specialized agents
        // this.agents.calculator = new CalculatorAgent(this.bridge);
        // this.agents.database = new DatabaseAgent(this.bridge);
        // this.agents.api = new APIAgent(this.bridge);

        console.log('🤖 AgentManager: Initialized agents:', Object.keys(this.agents));
    }

    /**
     * Route a message to the most appropriate agent
     */
    async routeMessage(
        message: string,
        conversationId?: string,
        explicitAgent?: string
    ): Promise<{
        response: string;
        agentUsed: string;
        toolsUsed: string[];
        routing: RouteResult;
        context: any;
    }> {
        let selectedAgent: string;
        let routing: RouteResult;

        if (explicitAgent && this.agents[explicitAgent]) {
            // Use explicitly requested agent
            selectedAgent = explicitAgent;
            routing = {
                agentName: explicitAgent,
                confidence: 1.0,
                reason: 'Explicitly requested'
            };
        } else {
            // Route based on message content
            routing = await this.analyzeAndRoute(message);
            selectedAgent = routing.agentName;
        }

        // Fallback to general processing if no specific agent found
        if (!this.agents[selectedAgent]) {
            return await this.handleGeneralRequest(message, conversationId, routing);
        }

        try {
            console.log(`🎯 Routing to ${selectedAgent} agent (confidence: ${routing.confidence})`);

            const result = await this.agents[selectedAgent].processRequest(
                message,
                conversationId
            );

            return {
                response: result.response,
                agentUsed: selectedAgent,
                toolsUsed: result.toolsUsed,
                routing,
                context: result.context
            };

        } catch (error) {
            console.error(`Error with ${selectedAgent} agent:`, error);

            // Fallback to general processing
            return await this.handleGeneralRequest(message, conversationId, {
                agentName: 'general',
                confidence: 0.5,
                reason: `Fallback due to ${selectedAgent} agent error: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }

    /**
     * Analyze message content and route to appropriate agent
     */
    private async analyzeAndRoute(message: string): Promise<RouteResult> {
        const lowerMessage = message.toLowerCase();

        // Weather-related routing
        const weatherKeywords = [
            'weather', 'temperature', 'rain', 'snow', 'sunny', 'cloudy',
            'forecast', 'climate', 'humidity', 'wind', 'storm', 'cold', 'hot',
            'celsius', 'fahrenheit', 'degrees'
        ];

        if (weatherKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                agentName: 'weather',
                confidence: 0.9,
                reason: 'Message contains weather-related keywords'
            };
        }

        // Math/Calculator routing
        const mathKeywords = [
            'calculate', 'math', 'factorial', 'fibonacci', 'prime',
            'addition', 'subtraction', 'multiplication', 'division',
            '+', '-', '*', '/', 'equals', 'sum', 'product'
        ];

        if (mathKeywords.some(keyword => lowerMessage.includes(keyword)) ||
            /\d+[\+\-\*\/]\d+/.test(message)) {
            return {
                agentName: 'calculator',
                confidence: 0.85,
                reason: 'Message contains mathematical expressions or keywords'
            };
        }

        // Database/Query routing
        const dbKeywords = [
            'query', 'database', 'select', 'users', 'table', 'sql',
            'data', 'records', 'search', 'find'
        ];

        if (dbKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                agentName: 'database',
                confidence: 0.8,
                reason: 'Message contains database-related keywords'
            };
        }

        // API/Service routing
        const apiKeywords = [
            'api', 'service', 'endpoint', 'call', 'request', 'health',
            'status', 'server', 'connection'
        ];

        if (apiKeywords.some(keyword => lowerMessage.includes(keyword))) {
            return {
                agentName: 'api',
                confidence: 0.75,
                reason: 'Message contains API/service-related keywords'
            };
        }

        // Default to general handling
        return {
            agentName: 'general',
            confidence: 0.5,
            reason: 'No specific agent patterns matched'
        };
    }

    /**
     * Handle general requests using the original bridge functionality
     */
    private async handleGeneralRequest(
        message: string,
        conversationId?: string,
        routing?: RouteResult
    ): Promise<{
        response: string;
        agentUsed: string;
        toolsUsed: string[];
        routing: RouteResult;
        context: any;
    }> {
        try {
            console.log('🔄 Using general MCP bridge processing');

            const response = await this.bridge.processWithTools(message);

            // Extract tool information from the response (this is a simple approach)
            const toolsUsed = this.extractToolsFromResponse(response);

            return {
                response,
                agentUsed: 'general',
                toolsUsed,
                routing: routing || {
                    agentName: 'general',
                    confidence: 0.5,
                    reason: 'General processing'
                },
                context: { conversationId, timestamp: new Date().toISOString() }
            };

        } catch (error) {
            return {
                response: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}`,
                agentUsed: 'error',
                toolsUsed: [],
                routing: routing || {
                    agentName: 'error',
                    confidence: 0,
                    reason: 'Error in processing'
                },
                context: { error: true, timestamp: new Date().toISOString() }
            };
        }
    }

    /**
     * Extract tools used from response text (simple implementation)
     */
    private extractToolsFromResponse(response: string): string[] {
        const tools = ['calculator', 'weather_info', 'service_health', 'execute_query', 'query_custom_service', 'get_datetime', 'file_operations'];
        const usedTools: string[] = [];

        for (const tool of tools) {
            if (response.toLowerCase().includes(tool.toLowerCase())) {
                usedTools.push(tool);
            }
        }

        return usedTools;
    }

    /**
     * Get information about all available agents
     */
    getAvailableAgents(): { [key: string]: { name: string; description: string; tools: string[] } } {
        const agentInfo: { [key: string]: { name: string; description: string; tools: string[] } } = {};

        for (const [key, agent] of Object.entries(this.agents)) {
            const info = agent.getInfo();
            agentInfo[key] = {
                name: info.name,
                description: info.description,
                tools: info.availableTools
            };
        }

        return agentInfo;
    }

    /**
     * Get specific agent by name
     */
    getAgent(name: string): BaseAgent | undefined {
        return this.agents[name];
    }

    /**
     * Add a new agent to the registry
     */
    registerAgent(name: string, agent: BaseAgent): void {
        this.agents[name] = agent;
        console.log(`🔧 Registered new agent: ${name}`);
    }

    /**
     * Remove an agent from the registry
     */
    unregisterAgent(name: string): boolean {
        if (this.agents[name]) {
            delete this.agents[name];
            console.log(`🗑️  Unregistered agent: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Clear conversation context for a specific agent
     */
    clearAgentContext(agentName: string, conversationId?: string): boolean {
        const agent = this.agents[agentName];
        if (agent) {
            agent.clearContext(conversationId);
            return true;
        }
        return false;
    }

    /**
     * Get conversation history from a specific agent
     */
    getAgentHistory(agentName: string, conversationId?: string): any[] {
        const agent = this.agents[agentName];
        if (agent) {
            return agent.getConversationHistory(conversationId);
        }
        return [];
    }

    /**
     * Process a batch of messages (useful for testing or bulk operations)
     */
    async processBatch(
        messages: { message: string; conversationId?: string; agent?: string }[]
    ): Promise<Array<{
        request: string;
        response: string;
        agentUsed: string;
        toolsUsed: string[];
        routing: RouteResult;
    }>> {
        const results = [];

        for (const { message, conversationId, agent } of messages) {
            try {
                const result = await this.routeMessage(message, conversationId, agent);
                results.push({
                    request: message,
                    response: result.response,
                    agentUsed: result.agentUsed,
                    toolsUsed: result.toolsUsed,
                    routing: result.routing
                });
            } catch (error) {
                results.push({
                    request: message,
                    response: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    agentUsed: 'error',
                    toolsUsed: [],
                    routing: { agentName: 'error', confidence: 0, reason: 'Processing error' }
                });
            }
        }

        return results;
    }
}
