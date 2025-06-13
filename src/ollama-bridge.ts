import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { config } from './config.js';
import { ChildProcess } from 'child_process';
// Using built-in fetch (Node.js 18+)

/**
 * Example client that connects to the MCP server and can forward requests to Ollama
 * This demonstrates how to integrate your MCP server with Ollama
 */

class OllamaMCPBridge {
  private mcpClient: Client;
  private transport: StdioClientTransport | undefined;
  private childProcess: ChildProcess | undefined;
  private isConnected = false;
  private connectionTimeout = 5000; // 5 second timeout for connections
  private requestTimeout = 10000; // 10 second timeout for requests

  constructor() {
    this.mcpClient = new Client(
      { name: "ollama-mcp-bridge", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
  async connect(): Promise<void> {
    if (this.isConnected) return;

    const mcpConfig = config.getMcpConfig();
    const serviceConfig = config.getServiceConfig();

    this.transport = new StdioClientTransport({
      command: mcpConfig.serverCommand,
      args: mcpConfig.serverArgs,
      env: {
        SERVICE_BASE_URL: serviceConfig.baseUrl
      }
    });

    // Access the child process if available (this is internal to StdioClientTransport)
    // We'll need to track it for proper cleanup
    if (this.transport && (this.transport as any).process) {
      this.childProcess = (this.transport as any).process;
    } try {
      await this.withTimeout(
        this.mcpClient.connect(this.transport),
        this.connectionTimeout,
        'MCP connection'
      );
      this.isConnected = true;

      // Try to get the child process after connection is established
      this.tryGetChildProcessFromTransport();

      console.log('Connected to MCP server');
    } catch (error) {
      this.isConnected = false;
      this.transport = undefined;
      this.childProcess = undefined;
      throw new Error(`Failed to connect to MCP server: ${error}`);
    }
  }
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    } else if (!this.childProcess && this.transport) {
      // Try to get child process if we're connected but don't have it yet
      this.tryGetChildProcessFromTransport();
    }
  }

  async getAvailableTools(): Promise<any[]> {
    await this.ensureConnected();

    try {
      const tools = await this.withTimeout(
        this.mcpClient.listTools(),
        this.requestTimeout,
        'List tools'
      );
      return tools.tools || [];
    } catch (error) {
      console.error('Error getting available tools:', error);
      return [];
    }
  }

  async callTool(name: string, args: any): Promise<string> {
    await this.ensureConnected();

    try {
      const result = await this.withTimeout(
        this.mcpClient.callTool({
          name,
          arguments: args
        }),
        this.requestTimeout,
        `Tool execution: ${name}`
      );

      return (result.content as any[])
        .filter((content: any) => content.type === 'text')
        .map((content: any) => content.text)
        .join('\n');
    } catch (error) {
      throw new Error(`Failed to execute tool ${name}: ${error}`);
    }
  }

  async chatWithOllama(message: string, model?: string): Promise<string> {
    const ollamaConfig = config.getOllamaConfig();
    const selectedModel = model || ollamaConfig.defaultModel;
    const ollamaUrl = `${ollamaConfig.baseUrl}${ollamaConfig.chatEndpoint}`;

    try {
      console.log(`Calling Ollama at ${ollamaUrl} with model: ${selectedModel}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant with access to custom service tools. Available tools:
${(await this.getAvailableTools()).map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

When the user asks for something that requires these tools, use them and provide the results.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          stream: false
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log(`Ollama response status: ${response.status}`);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Ollama response data:', data);
      return data.message?.content || 'No response from Ollama';
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama request timed out');
      }
      console.error('Error communicating with Ollama:', error);
      throw new Error(`Failed to communicate with Ollama: ${error?.message || error}`);
    }
  }

  async getAvailableModels(): Promise<any[]> {
    const ollamaConfig = config.getOllamaConfig();
    const tagsUrl = `${ollamaConfig.baseUrl}${ollamaConfig.tagsEndpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      const response = await fetch(tagsUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to get models: ${response.status}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Models request timed out');
      }
      console.error('Error getting available models:', error);
      return [];
    }
  }

  /**
   * Analyze user message and determine which tools to use using LLM
   */
  private async analyzeToolNeeds(userMessage: string, tools: any[]): Promise<any> {
    const toolDescriptions = tools.map(tool =>
      `- ${tool.name}: ${tool.description}\n  Parameters: ${JSON.stringify(tool.inputSchema?.properties || {}, null, 2)}`
    ).join('\n'); const analyzePrompt = `You are a tool selection assistant. Analyze the user's message and determine which tools should be used.

Available tools:
${toolDescriptions}

User message: "${userMessage}"

Respond with a JSON object in this exact format:
{
  "needsTools": true/false,
  "toolCalls": [
    {
      "name": "tool_name",
      "args": {"param1": "value1"},
      "reason": "why this tool is needed"
    }
  ]
}

Rules:
1. Only use tools that are directly relevant to the user's request
2. If asking for current time/date, use get_datetime tool
3. If asking about health/status, use service_health tool
4. If asking about database queries, use execute_query tool
5. If asking about API calls, use query_custom_service tool
6. If asking for math calculations, factorial, fibonacci, or prime numbers, use calculator tool
7. If asking about weather information, use weather_info tool
8. If asking about URL operations (shorten, validate, QR codes), use url_utilities tool
9. If no tools are needed, set needsTools to false and toolCalls to empty array
10. Provide specific parameters based on the user's request
11. Always respond with valid JSON only`;

    try {
      const response = await this.chatWithOllama(analyzePrompt);
      // Extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.warn('LLM tool selection failed, using fallback:', error);
      return this.fallbackToolSelection(userMessage);
    }
  }
  /**
   * Fallback tool selection using keyword matching
   */
  private async fallbackToolSelection(userMessage: string): Promise<any> {
    const message = userMessage.toLowerCase();
    const toolCalls = [];

    if (message.includes('time') || message.includes('date') || message.includes('now') || message.includes('current')) {
      toolCalls.push({
        name: 'get_datetime',
        args: { format: 'local' },
        reason: 'User asked for current time/date'
      });
    }

    if (message.includes('health') || message.includes('status')) {
      toolCalls.push({
        name: 'service_health',
        args: {},
        reason: 'User asked for health/status information'
      });
    }

    if (message.includes('query') || message.includes('database') || message.includes('users')) {
      toolCalls.push({
        name: 'execute_query',
        args: {
          query: 'SELECT * FROM users LIMIT 5',
          parameters: []
        },
        reason: 'User asked for database information'
      });
    }

    if (message.includes('service') || message.includes('api')) {
      toolCalls.push({
        name: 'query_custom_service',
        args: {
          endpoint: '/api/status',
          method: 'GET'
        },
        reason: 'User asked for service/API information'
      });
    }

    // New calculator tool
    if (message.includes('calculate') || message.includes('math') || message.includes('factorial') ||
      message.includes('fibonacci') || message.includes('prime') || message.includes('plus') ||
      message.includes('minus') || message.includes('times') || message.includes('divide') ||
      message.includes('+') || message.includes('-') || message.includes('*') || message.includes('/')) {

      let operation = 'evaluate';
      let number = null;
      let expression = '';

      if (message.includes('factorial')) {
        operation = 'factorial';
        const match = message.match(/(\d+)\s*factorial/);
        if (match) number = parseInt(match[1]);
      } else if (message.includes('fibonacci')) {
        operation = 'fibonacci';
        const match = message.match(/fibonacci.*?(\d+)/);
        if (match) number = parseInt(match[1]);
      } else if (message.includes('prime')) {
        operation = 'prime_check';
        const match = message.match(/(\d+).*?prime/);
        if (match) number = parseInt(match[1]);
      } else {
        // Extract mathematical expression
        const mathMatch = message.match(/([0-9+\-*/().\s]+)/);
        if (mathMatch) expression = mathMatch[1].trim();
      }

      toolCalls.push({
        name: 'calculator',
        args: { expression, operation, number },
        reason: 'User asked for mathematical calculation'
      });
    }

    // New weather tool
    if (message.includes('weather') || message.includes('temperature') || message.includes('forecast') ||
      message.includes('rain') || message.includes('sunny') || message.includes('cloudy')) {

      const locationMatch = message.match(/weather.*?(?:in|for|at)\s+([a-zA-Z\s]+)/);
      const location = locationMatch ? locationMatch[1].trim() : 'New York';
      const units = message.includes('celsius') || message.includes('metric') ? 'metric' :
        message.includes('fahrenheit') || message.includes('imperial') ? 'imperial' : 'metric';
      const forecast = message.includes('forecast') || message.includes('tomorrow') || message.includes('week');

      toolCalls.push({
        name: 'weather_info',
        args: { location, units, forecast },
        reason: 'User asked for weather information'
      });
    }

    // New URL utilities tool
    if (message.includes('url') || message.includes('link') || message.includes('shorten') ||
      message.includes('validate') || message.includes('qr') || message.includes('expand')) {

      let operation = 'validate';
      if (message.includes('shorten')) operation = 'shorten';
      else if (message.includes('expand')) operation = 'expand';
      else if (message.includes('qr')) operation = 'qr_code';

      const urlMatch = message.match(/(https?:\/\/[^\s]+)/);
      const url = urlMatch ? urlMatch[1] : 'https://www.example.com';

      toolCalls.push({
        name: 'url_utilities',
        args: { operation, url },
        reason: 'User asked for URL operation'
      });
    }

    return {
      needsTools: toolCalls.length > 0,
      toolCalls
    };
  }

  async processWithTools(userMessage: string, model?: string): Promise<string> {
    try {
      // Get available tools
      const tools = await this.getAvailableTools();

      // Analyze what tools we need using LLM
      const toolAnalysis = await this.analyzeToolNeeds(userMessage, tools);

      let toolResults = '';

      if (toolAnalysis.needsTools && toolAnalysis.toolCalls?.length > 0) {
        console.log(`🔧 Using ${toolAnalysis.toolCalls.length} tools based on LLM analysis`);

        for (const toolCall of toolAnalysis.toolCalls) {
          console.log(`📞 Calling ${toolCall.name}: ${toolCall.reason}`);
          try {
            const result = await this.callTool(toolCall.name, toolCall.args);
            toolResults += `${toolCall.name} Result:\n${result}\n\n`;
          } catch (error) {
            console.error(`Error calling tool ${toolCall.name}:`, error);
            toolResults += `${toolCall.name} Error: ${error}\n\n`;
          }
        }
      } else {
        console.log('🤖 No tools needed for this request');
      }

      // Create enriched message for final response
      const enrichedMessage = toolResults
        ? `${userMessage}\n\nRelevant Information:\n${toolResults}`
        : userMessage;

      return await this.chatWithOllama(enrichedMessage, model);

    } catch (error) {
      console.error('Error in processWithTools:', error);
      // Fallback to simple chat without tools
      return await this.chatWithOllama(userMessage, model);
    }
  }
  async disconnect(): Promise<void> {
    if (this.isConnected && this.mcpClient) {
      try {
        await this.withTimeout(
          this.mcpClient.close(),
          this.connectionTimeout,
          'MCP disconnect'
        );
        this.isConnected = false;
        console.log('Disconnected from MCP server');
      } catch (error) {
        console.warn('Error during disconnect:', error);
        this.isConnected = false;
      }
    }

    // Force terminate child process if it exists and hasn't been cleaned up
    if (this.childProcess && !this.childProcess.killed) {
      try {
        console.log('Force terminating MCP server child process');

        // Try graceful termination first
        this.childProcess.kill('SIGTERM');

        // Wait a bit for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 100));

        // Force kill if still running
        if (!this.childProcess.killed) {
          this.childProcess.kill('SIGKILL');
        }
      } catch (error) {
        console.warn('Error terminating child process:', error);
      }
    }

    // Try to access and terminate process through transport if available
    if (this.transport && (this.transport as any).process) {
      const transportProcess = (this.transport as any).process;
      if (transportProcess && !transportProcess.killed) {
        try {
          console.log('Force terminating MCP transport process');
          transportProcess.kill('SIGTERM');

          setTimeout(() => {
            if (!transportProcess.killed) {
              transportProcess.kill('SIGKILL');
            }
          }, 100);
        } catch (error) {
          console.warn('Error terminating transport process:', error);
        }
      }
    }

    // Clear references
    this.transport = undefined;
    this.childProcess = undefined;
  }

  // Getter for connection status (used in tests)
  get client(): Client | undefined {
    return this.isConnected ? this.mcpClient : undefined;
  }

  private tryGetChildProcessFromTransport(): void {
    // Try to access the child process from the transport
    // This is needed because StdioClientTransport might create the process asynchronously
    if (this.transport && !this.childProcess) {
      try {
        // Try different possible property names that the transport might use
        const transportAny = this.transport as any;
        if (transportAny.process) {
          this.childProcess = transportAny.process;
        } else if (transportAny._process) {
          this.childProcess = transportAny._process;
        } else if (transportAny.childProcess) {
          this.childProcess = transportAny.childProcess;
        }
      } catch (error) {
        // Ignore errors when trying to access internal properties
      }
    }
  }
}

// Example usage
async function main() {
  const bridge = new OllamaMCPBridge();

  try {
    await bridge.connect();

    // Example 1: Get available tools
    console.log('Available tools:', await bridge.getAvailableTools());

    // Example 2: Call a specific tool
    console.log('\nService health:');
    console.log(await bridge.callTool('service_health', {}));

    // Example 3: Chat with Ollama using tools
    console.log('\nChat with Ollama (using tools):');
    console.log(await bridge.processWithTools('Can you check the service status and tell me about it?'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await bridge.disconnect();
  }
}

// Uncomment to run the example
// main().catch(console.error);

export { OllamaMCPBridge };
