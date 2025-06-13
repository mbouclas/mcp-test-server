// Enhanced Jest setup with comprehensive mocking and resource tracking
import { jest } from '@jest/globals';

// Global resource tracking arrays for cleanup
(global as any).globalTimerIds = [];
(global as any).globalProcesses = [];
(global as any).globalEventListeners = [];

// Override console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = (...args: any[]) => {
    // Only log important test messages, filter out noise
    const message = args.join(' ');
    if (message.includes('Test') || message.includes('Error') || message.includes('Failed')) {
        originalConsoleLog(...args);
    }
};

console.error = (...args: any[]) => {
    // Always log errors but filter out known Jest worker warnings
    const message = args.join(' ');
    if (!message.includes('worker process has failed to exit gracefully')) {
        originalConsoleError(...args);
    }
};

console.warn = (...args: any[]) => {
    // Filter out common warnings
    const message = args.join(' ');
    if (!message.includes('ExperimentalWarning') && !message.includes('VM Modules')) {
        originalConsoleWarn(...args);
    }
};

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Default fetch mock responses
mockFetch.mockImplementation(async (url: any) => {
    const urlStr = url.toString();

    if (urlStr.includes('/api/chat')) {
        return {
            ok: true,
            status: 200,
            json: async () => ({ message: { content: 'Hello from Ollama!' } })
        } as Response;
    }

    if (urlStr.includes('/api/models')) {
        return {
            ok: true,
            status: 200,
            json: async () => ({ models: [{ name: 'gemma3:4b' }] })
        } as Response;
    }

    // Default error response
    return {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Mocked error' })
    } as Response;
});

// Mock child_process to prevent real process spawning
jest.mock('child_process', () => ({
    spawn: jest.fn().mockReturnValue({
        stdout: { on: jest.fn(), pipe: jest.fn() },
        stderr: { on: jest.fn(), pipe: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        pid: 12345
    }),
    exec: jest.fn().mockImplementation((command, callback) => {
        if (callback) callback(null, 'mocked output', '');
    }),
    execSync: jest.fn().mockReturnValue('mocked output')
}));

// Mock MCP Client
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        listTools: jest.fn().mockResolvedValue({
            tools: [
                { name: 'calculator', description: 'Perform calculations' },
                { name: 'weather_info', description: 'Get weather information' },
                { name: 'get_datetime', description: 'Get current date and time' },
                { name: 'query_custom_data', description: 'Query custom data' },
                { name: 'execute_query', description: 'Execute database query' },
                { name: 'service_health', description: 'Check service health' },
                { name: 'file_operations', description: 'File operations' },
                { name: 'url_utilities', description: 'URL utilities' }
            ]
        }),
        callTool: jest.fn().mockImplementation(({ name, arguments: args }) => {
            if (name === 'calculator') {
                if (args?.expression) {
                    return Promise.resolve({
                        content: [{
                            type: 'text',
                            text: `Calculation Result:\nOperation: evaluate\nExpression: ${args.expression}\nResult: 8`
                        }]
                    });
                }
                if (args?.operation && args?.n !== undefined) {
                    return Promise.resolve({
                        content: [{
                            type: 'text',
                            text: `Calculation Result:\nOperation: ${args.operation}\nNumber: ${args.n}\nResult: 42`
                        }]
                    });
                }
                throw new Error('Tool execution failed');
            }

            if (name === 'weather_info') {
                return Promise.resolve({
                    content: [{
                        type: 'text',
                        text: 'Weather data for location'
                    }]
                });
            }

            return Promise.resolve({
                content: [{
                    type: 'text',
                    text: `Tool ${name} executed successfully`
                }]
            });
        }),
        onclose: undefined,
        onopen: undefined,
        onerror: undefined
    }))
}));

// Mock stdio transport
jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        send: jest.fn().mockResolvedValue(undefined)
    }))
}));

// Override timer functions to track IDs for cleanup
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

global.setTimeout = ((callback: any, delay?: number, ...args: any[]) => {
    const id = originalSetTimeout(callback, delay, ...args);
    (global as any).globalTimerIds.push(id);
    return id;
}) as typeof setTimeout;

global.setInterval = ((callback: any, delay?: number, ...args: any[]) => {
    const id = originalSetInterval(callback, delay, ...args);
    (global as any).globalTimerIds.push(id);
    return id;
}) as typeof setInterval;

global.clearTimeout = ((id: NodeJS.Timeout) => {
    const index = (global as any).globalTimerIds.indexOf(id);
    if (index > -1) {
        (global as any).globalTimerIds.splice(index, 1);
    }
    return originalClearTimeout(id);
}) as typeof clearTimeout;

global.clearInterval = ((id: NodeJS.Timeout) => {
    const index = (global as any).globalTimerIds.indexOf(id);
    if (index > -1) {
        (global as any).globalTimerIds.splice(index, 1);
    }
    return originalClearInterval(id);
}) as typeof clearInterval;

// Global cleanup function for timers
(global as any).cleanupTimers = () => {
    const timerIds = (global as any).globalTimerIds;
    if (timerIds && timerIds.length > 0) {
        timerIds.forEach((id: any) => {
            try {
                clearTimeout(id);
                clearInterval(id);
            } catch (error) {
                // Ignore cleanup errors
            }
        });
        (global as any).globalTimerIds = [];
    }
};

// Process exit cleanup handlers
const cleanupAndExit = () => {
    try {
        (global as any).cleanupTimers();
    } catch (error) {
        // Ignore cleanup errors
    }
};

process.on('exit', cleanupAndExit);
process.on('SIGINT', cleanupAndExit);
process.on('SIGTERM', cleanupAndExit);
process.on('beforeExit', cleanupAndExit);

// Additional Jest globals setup
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;