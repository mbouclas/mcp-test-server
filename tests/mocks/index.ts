// Mock implementations for tests to avoid import issues

// Mock OllamaMCPBridge
export class MockOllamaMCPBridge {
    private connected = false;
    private transport: any = null;
    private childProcess: any = null;

    async connect() {
        this.connected = true;
        // Mock transport and child process without actually creating them
        this.transport = { mock: true };
        this.childProcess = { mock: true, killed: true };
        return Promise.resolve();
    }

    async disconnect() {
        this.connected = false;
        this.transport = null;
        this.childProcess = null;
        return Promise.resolve();
    }

    isConnected() {
        return this.connected;
    }

    get client() {
        return this.connected ? { mock: true } : undefined;
    }

    async getAvailableTools() {
        return [
            { name: 'calculator', description: 'Perform calculations' },
            { name: 'weather_info', description: 'Get weather information' },
            { name: 'get_datetime', description: 'Get current date and time' },
            { name: 'service_health', description: 'Check service health' }
        ];
    }

    async callTool(name: string, args: any) {
        switch (name) {
            case 'calculator':
                return { result: 'calculation complete', args };
            case 'weather_info':
                return { result: 'weather data', location: args.location };
            case 'get_datetime':
                return { result: new Date().toISOString() };
            case 'service_health':
                return { result: 'healthy', status: 'ok' };
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }

    async chatWithOllama(message: string, model?: string) {
        return `Mock response to: ${message}`;
    }

    async processWithTools(message: string, model?: string) {
        return `Mock tool-enhanced response to: ${message}`;
    }
}

// Mock AgentManager
export class MockAgentManager {
    private agents = {
        weather: { name: 'weather', description: 'Weather specialist' },
        general: { name: 'general', description: 'General purpose agent' }
    };

    getAvailableAgents() {
        return this.agents;
    }

    getAgent(name: string) {
        return this.agents[name] || null;
    }

    async routeRequest(message: string) {
        return {
            agentName: 'general',
            confidence: 0.8,
            response: `Mock agent response to: ${message}`,
            toolsUsed: []
        };
    }
}

// Mock config
export const mockConfig = {
    getFullConfig: () => ({
        service: { baseUrl: 'http://localhost:3000' },
        ollama: {
            baseUrl: 'http://localhost:11434',
            defaultModel: 'llama2',
            chatEndpoint: '/api/chat',
            tagsEndpoint: '/api/tags'
        },
        mcp: { serverCommand: 'node build/index.js' }
    }),
    getOllamaConfig: () => ({
        baseUrl: 'http://localhost:11434',
        defaultModel: 'llama2',
        chatEndpoint: '/api/chat',
        tagsEndpoint: '/api/tags'
    }),
    getServiceConfig: () => ({
        baseUrl: 'http://localhost:3000'
    }),
    getMcpConfig: () => ({
        serverCommand: 'node build/index.js'
    })
};
