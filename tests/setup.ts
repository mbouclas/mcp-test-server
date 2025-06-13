import { jest, afterEach, afterAll } from '@jest/globals';
import { ChildProcess, spawn } from 'child_process';

// Global test setup

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SERVICE_BASE_URL = 'http://localhost:3000';
process.env.OLLAMA_HOST = 'http://localhost:11434';

// Track all timers created during tests
const activeTimers = new Set<NodeJS.Timeout>();
const activeIntervals = new Set<NodeJS.Timeout>();

// Track child processes spawned during tests
const activeChildProcesses = new Set<ChildProcess>();

// Global process tracking for aggressive cleanup
const allSpawnedProcesses = new Set<ChildProcess>();

// Helper function to forcefully kill child processes
function killChildProcess(childProcess: ChildProcess) {
    if (childProcess && !childProcess.killed) {
        try {
            // Try graceful termination first
            childProcess.kill('SIGTERM');

            // Force kill after a short delay if still running
            setTimeout(() => {
                if (!childProcess.killed) {
                    childProcess.kill('SIGKILL');
                }
            }, 100);
        } catch (error) {
            // Ignore errors during cleanup
        }
    }
}

// Override child_process.spawn to track child processes
const originalSpawn = spawn;
const childProcessModule = require('child_process');
childProcessModule.spawn = function (...args: any[]) {
    const childProcess = originalSpawn.apply(this, args as any);
    if (childProcess) {
        activeChildProcesses.add(childProcess);

        // Remove from tracking when the process exits
        childProcess.on('exit', () => {
            activeChildProcesses.delete(childProcess);
        });

        childProcess.on('error', () => {
            activeChildProcesses.delete(childProcess);
        });
    }
    return childProcess;
};

// Override setTimeout to track timers
const originalSetTimeout = global.setTimeout;
global.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
    const timer = originalSetTimeout(callback, delay, ...args);
    activeTimers.add(timer);
    return timer;
}) as typeof setTimeout;

// Override setInterval to track timers
const originalSetInterval = global.setInterval;
global.setInterval = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
    const timer = originalSetInterval(callback, delay, ...args);
    activeIntervals.add(timer);
    return timer;
}) as typeof setInterval;

// Override clearTimeout to untrack timers
const originalClearTimeout = global.clearTimeout;
global.clearTimeout = (timer: any) => {
    if (timer) {
        activeTimers.delete(timer);
        originalClearTimeout(timer);
    }
};

// Override clearInterval to untrack timers
const originalClearInterval = global.clearInterval;
global.clearInterval = (timer: any) => {
    if (timer) {
        activeIntervals.delete(timer);
        originalClearInterval(timer);
    }
};

// Track processes spawned by any method
const originalProcessKill = process.kill;
const spawnMethods = ['spawn', 'fork', 'exec', 'execFile'];

// Override all spawn methods in child_process module
spawnMethods.forEach(methodName => {
    const originalMethod = require('child_process')[methodName];
    if (originalMethod) {
        require('child_process')[methodName] = function (...args: any[]) {
            const result = originalMethod.apply(this, args);
            if (result && typeof result.kill === 'function') {
                allSpawnedProcesses.add(result);

                // Remove from tracking when process exits
                result.on('exit', () => allSpawnedProcesses.delete(result));
                result.on('error', () => allSpawnedProcesses.delete(result));
            }
            return result;
        };
    }
});

// Mock MCP SDK to prevent real process spawning
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockImplementation(() => Promise.resolve()),
        close: jest.fn().mockImplementation(() => Promise.resolve()),
        listTools: jest.fn().mockImplementation(() => Promise.resolve({ tools: [] })),
        callTool: jest.fn().mockImplementation(() => Promise.resolve({ content: [{ type: 'text', text: 'mock result' }] }))
    }))
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: jest.fn().mockImplementation(() => ({
        // Mock transport that doesn't spawn real processes
        connect: jest.fn().mockImplementation(() => Promise.resolve()),
        close: jest.fn().mockImplementation(() => Promise.resolve()),
        process: { mock: true, killed: true }
    }))
}));

// Clean up all active timers after each test
afterEach(async () => {
    // Clear all tracked timers
    for (const timer of activeTimers) {
        originalClearTimeout(timer);
    }
    activeTimers.clear();

    for (const interval of activeIntervals) {
        originalClearInterval(interval);
    }
    activeIntervals.clear();

    // Kill all tracked child processes (both sets)
    for (const childProcess of activeChildProcesses) {
        killChildProcess(childProcess);
    }
    activeChildProcesses.clear();

    for (const childProcess of allSpawnedProcesses) {
        killChildProcess(childProcess);
    }
    allSpawnedProcesses.clear();

    // Clear all mocks
    jest.clearAllMocks();

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    // Small delay to allow async cleanup
    await new Promise(resolve => originalSetTimeout(resolve, 50));
});

// Global test cleanup
afterAll(async () => {
    // Final cleanup of any remaining resources
    for (const timer of activeTimers) {
        originalClearTimeout(timer);
    }
    activeTimers.clear();

    for (const interval of activeIntervals) {
        originalClearInterval(interval);
    }
    activeIntervals.clear();

    // Kill any remaining child processes (both sets)
    for (const childProcess of activeChildProcesses) {
        killChildProcess(childProcess);
    }
    activeChildProcesses.clear();

    for (const childProcess of allSpawnedProcesses) {
        killChildProcess(childProcess);
    }
    allSpawnedProcesses.clear();

    // Force garbage collection if available
    if (global.gc) {
        global.gc();
    }

    // Give more time for final cleanup and process termination
    await new Promise(resolve => originalSetTimeout(resolve, 500));

    console.log(`✅ Final cleanup complete. Remaining processes: ${allSpawnedProcesses.size}`);
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason) => {
    console.warn('Unhandled Promise Rejection in test:', reason);
});

console.log('✅ Test setup complete - enhanced cleanup and timeout handling enabled');
