import { jest } from '@jest/globals';

// Inline all mocking to avoid setup file issues
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn().mockResolvedValue(undefined),
        callTool: jest.fn().mockResolvedValue({
            content: [{ type: 'text', text: 'Mocked result' }]
        }),
        listTools: jest.fn().mockResolvedValue({
            tools: [{ name: 'calculator', description: 'Test tool' }]
        }),
        initialize: jest.fn().mockResolvedValue({
            capabilities: {},
            serverInfo: { name: 'test-server', version: '1.0.0' }
        })
    }))
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: jest.fn().mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
    }))
}));

jest.mock('child_process', () => ({
    spawn: jest.fn().mockImplementation(() => ({
        stdout: { on: jest.fn(), pipe: jest.fn() },
        stderr: { on: jest.fn(), pipe: jest.fn() },
        stdin: { write: jest.fn(), end: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
        pid: 12345
    }))
}));

// Simple cleanup tracking
const timers = new Set();
const originalSetTimeout = setTimeout;
const originalClearTimeout = clearTimeout;

global.setTimeout = function (callback, delay, ...args) {
    const id = originalSetTimeout.call(this, callback, delay, ...args);
    timers.add(id);
    return id;
};

global.clearTimeout = function (id) {
    timers.delete(id);
    return originalClearTimeout.call(this, id);
};

const cleanup = () => {
    timers.forEach(id => originalClearTimeout(id));
    timers.clear();
};

describe('Minimal Test Suite for Worker Exit Issue', () => {
    afterEach(() => {
        cleanup();
    });

    test('should pass a basic test', () => {
        expect(1 + 1).toBe(2);
    });

    test('should handle async operations', async () => {
        const result = await Promise.resolve('test');
        expect(result).toBe('test');
    });

    test('should work with mocked modules', async () => {
        // This test verifies our mocking works without creating real processes
        const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
        const client = new Client({ name: 'test', version: '1.0.0' }, {});

        await client.connect();
        const tools = await client.listTools();

        expect(tools.tools).toHaveLength(1);
        expect(tools.tools[0].name).toBe('calculator');
    });
});

export { };
