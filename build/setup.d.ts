#!/usr/bin/env node
/**
 * Setup script for MCP server with Ollama integration
 * This script helps you configure and test the MCP server
 */
declare class MCPSetup {
    private baseDir;
    private ollamaConfigPath;
    constructor();
    getOllamaConfigPath(): string;
    checkOllamaRunning(): Promise<boolean>;
    startExampleService(): Promise<unknown>;
    testMCPServer(): Promise<boolean>;
    createClaudeConfig(): Promise<boolean>;
    printInstructions(): Promise<void>;
    run(): Promise<void>;
}
export default MCPSetup;
