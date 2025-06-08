/**
 * Example client that connects to the MCP server and can forward requests to Ollama
 * This demonstrates how to integrate your MCP server with Ollama
 */
declare class OllamaMCPBridge {
    private mcpClient;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    getAvailableTools(): Promise<any[]>;
    callTool(name: string, args: any): Promise<string>;
    chatWithOllama(message: string, model?: string): Promise<string>;
    processWithTools(userMessage: string, model?: string): Promise<string>;
    disconnect(): Promise<void>;
}
export { OllamaMCPBridge };
