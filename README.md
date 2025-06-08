# Intelligent MCP Server with Tool Selection

A Model Context Protocol (MCP) server that provides intelligent tool selection for language models, featuring seamless Ollama integration and a comprehensive suite of utilities.

## Overview

This MCP server features an **intelligent tool selection system** that automatically identifies and executes the most appropriate tools based on natural language requests. It includes:

### Core Features
- **🧠 Intelligent Tool Selection**: Automatically selects appropriate tools based on natural language input
- **🔧 Modular Tool Architecture**: Easy to extend with new capabilities
- **🌐 Web API Interface**: RESTful API for easy integration
- **🦙 Native Ollama Integration**: Seamless connection with local Ollama models
- **📱 Interactive Frontend**: User-friendly web interface for testing

### Available Tools
- **Calculator**: Mathematical operations, factorial, Fibonacci, prime checking
- **Weather Information**: Mock weather data with units and forecasting  
- **URL Utilities**: URL validation, shortening, expansion, QR code generation
- **Date/Time Operations**: Timezone-aware datetime formatting
- **Service Health Monitoring**: Check service status and health
- **File Operations**: Basic file system operations
- **Custom Service Integration**: Connect to external services

## Prerequisites

- Node.js 16 or higher
- TypeScript
- Ollama installed and running (for intelligent tool selection)
- Optional: Custom service for external integrations

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Build the project:**
```bash
npm run build
```

3. **Start the services:**
```bash
# Terminal 1: Start the example service (optional)
npm run example-service

# Terminal 2: Start the web API server
npm run real-web-api

# Terminal 3: Start the frontend
npm run frontend-server
```

4. **Open your browser:**
Navigate to `http://localhost:3001` to use the interactive interface.

## Project Structure

The project is organized into a clean, modular structure:

```
src/
├── examples/     # Demo services and web API servers
│   ├── example-service.js     # Mock backend service
│   ├── real-mcp-web-api.js   # Production MCP web API
│   ├── web-api-server.js     # Full-featured web API
│   ├── simple-web-api.js     # Simplified web API
│   └── minimal-web-api.js    # Minimal web API example
├── frontend/     # Frontend applications and interfaces
│   ├── frontend-server.js    # Frontend application server
│   ├── frontend-mcp.html     # MCP-specific interface
│   └── frontend-example.html # Example interface
├── tests/        # Test files for all components
│   ├── test-integration.js   # Complete integration tests
│   ├── test-server.js        # Core server tests
│   └── test-*.js            # Component-specific tests
├── utils/        # Utility scripts and development tools
│   ├── interactive-chat.js   # Interactive chat utility
│   └── debug-*.js           # Debug utilities
├── config.ts     # Core TypeScript source files
├── index.ts      # Main MCP server implementation
├── ollama-bridge.ts # Ollama integration bridge
└── setup.ts      # Setup and configuration
```

### Available npm Scripts

```bash
# Core operations
npm run build                  # Build TypeScript
npm run start                  # Start MCP server
npm run dev                    # Build and start MCP server

# Services
npm run example-service        # Start mock backend service (port 3000)
npm run real-web-api          # Start production web API (port 3002)
npm run web-api               # Start full web API server
npm run simple-web-api        # Start simple web API
npm run minimal-web-api       # Start minimal web API
npm run frontend-server       # Start frontend server (port 3001)

# Testing and utilities
npm run test-integration      # Run integration tests
npm run chat                  # Interactive chat utility
```

## Architecture

```
Frontend (Port 3001)
    ↓
Web API Server (Port 3002)
    ↓
Ollama Bridge
    ↓
MCP Server
    ↓
Individual Tools (Calculator, Weather, URL Utils, etc.)
```

### Smart Tool Selection

The system uses an intelligent tool selection mechanism:

1. **LLM Analysis**: Ollama analyzes the user request to identify needed tools
2. **Fallback Matching**: Keyword-based matching as backup
3. **Tool Execution**: Selected tools are called with extracted parameters
4. **Response Integration**: Tool results are integrated into the final response

## Configuration

### Environment Variables

- `SERVICE_BASE_URL`: Base URL for custom service (default: `http://localhost:3000`)
- `OLLAMA_HOST`: Ollama server URL (default: `http://localhost:11434`)

### Service Ports

- **3000**: Example/Custom service
- **3001**: Frontend interface  
- **3002**: MCP Web API server
- **11434**: Ollama API (default)

### Claude Desktop Integration

Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "intelligent-mcp": {
      "command": "node",
      "args": ["i:\\Work\\testing\\mcp\\build\\index.js"],
      "env": {
        "SERVICE_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

## Development

### Adding New Tools

1. **Create the tool in `src/index.ts`:**
```typescript
server.tool(
  "my_new_tool",
  "Description of what the tool does",
  {
    parameter: z.string().describe("Parameter description"),
  },
  async ({ parameter }) => {
    // Tool implementation
    return {
      content: [
        { type: "text", text: "Tool result" }
      ],
    };
  }
);
```

2. **Update tool selection in `src/ollama-bridge.ts`:**
```typescript
// Add to analyzeToolNeeds prompt
"- my_new_tool: Use when user requests specific functionality"

// Add to fallbackToolSelection keywords
if (message.includes('keyword')) {
  return ['my_new_tool'];
}
```

3. **Add API endpoint in `src/examples/real-mcp-web-api.js`:**
```javascript
app.post('/api/tools/my_new_tool', async (req, res) => {
  // Handle direct tool calls
});
```

### Intelligent Tool Selection

The system uses two methods for tool selection:

1. **LLM-based Analysis** (`analyzeToolNeeds`): 
   - Sends the user request to Ollama with tool descriptions
   - Extracts tool names and parameters from the response

2. **Keyword Fallback** (`fallbackToolSelection`):
   - Uses keyword matching when LLM analysis fails
   - Searches for tool-specific terms in the message

### Testing

```bash
# Run integration tests
npm run test-integration

# Test specific tool
curl -X POST http://localhost:3002/api/tools/calculator \
  -H "Content-Type: application/json" \
  -d '{"operation": "factorial", "n": 5}'

# Test smart chat
curl -X POST http://localhost:3002/api/chat/smart \
  -H "Content-Type: application/json" \
  -d '{"message": "What is 10 factorial?", "model": "gemma3:4b"}'

# Run individual tests
node src/tests/test-integration.js
node src/tests/test-server.js
```

## Usage Examples

### Smart Chat Interface

The intelligent system automatically selects and uses appropriate tools:

**Mathematical Operations:**
```
"What is 10 factorial?"
→ Uses calculator tool → Returns 3,628,800

"Calculate the 15th Fibonacci number"
→ Uses calculator tool → Returns 610

"Is 17 a prime number?"
→ Uses calculator tool → Returns true
```

**Weather Queries:**
```
"What's the weather in Tokyo with forecast in Celsius?"
→ Uses weather_info tool → Returns detailed weather data

"Show me London weather in Fahrenheit"
→ Uses weather_info tool → Returns imperial units
```

**URL Operations:**
```
"Validate this URL: https://github.com/modelcontextprotocol"
→ Uses url_utilities tool → Returns validation results

"Generate a QR code for https://example.com"
→ Uses url_utilities tool → Returns QR code data
```

### API Endpoints

#### Smart Chat (Recommended)
```bash
POST http://localhost:3002/api/chat/smart
Content-Type: application/json

{
  "message": "What is 25 factorial?",
  "model": "llama3.2"
}
```

#### Direct Tool Access
```bash
POST http://localhost:3002/api/tools/calculator
Content-Type: application/json

{
  "operation": "factorial",
  "n": 10
}
```

#### Tool Discovery
```bash
GET http://localhost:3002/api/tools
```

### Testing with Claude Desktop

1. Add this server to your Claude Desktop configuration at `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "custom-service": {
      "command": "node",
      "args": ["i:\\Work\\testing\\mcp\\build\\index.js"],
      "env": {
        "SERVICE_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

2. Restart Claude Desktop

### Connecting to Ollama

Since Ollama doesn't natively support MCP, you'll need to use an MCP client that can bridge to Ollama. Here are your options:

#### Option 1: Use MCP Client with Ollama API

Create a simple Node.js client that connects to both the MCP server and Ollama:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Connect to MCP server
const transport = new StdioClientTransport({
  command: 'node',
  args: ['build/index.js']
});

const client = new Client(
  { name: "ollama-mcp-client", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);

// Now you can call tools and send results to Ollama
const tools = await client.listTools();
const result = await client.callTool({
  name: "service_health",
  arguments: {}
});

// Send to Ollama via API
const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama2',
    messages: [
      { role: 'system', content: 'You have access to custom service tools.' },
      { role: 'user', content: 'Check service health' },
      { role: 'assistant', content: result.content[0].text }
    ]
  })
});
```

#### Option 2: Use Open WebUI with MCP Plugin

Install Open WebUI and use an MCP plugin to bridge the connection.

#### Option 3: Create a Custom Ollama Integration

Build a wrapper service that acts as middleware between Ollama and your MCP server.

## Available Tools

### 1. Calculator (`calculator`)
Performs mathematical operations and number theory functions.

**Operations:**
- `evaluate`: Basic arithmetic expressions
- `factorial`: Calculate factorial of a number
- `fibonacci`: Generate Fibonacci numbers
- `prime_check`: Check if a number is prime

**Example:**
```javascript
{
  "operation": "factorial",
  "n": 5
}
// Returns: 120
```

### 2. Weather Information (`weather_info`)
Provides weather data with customizable units and forecasting.

**Parameters:**
- `location`: City or location name
- `units`: metric (default), imperial, or kelvin
- `include_forecast`: Boolean for forecast data

**Example:**
```javascript
{
  "location": "Tokyo",
  "units": "metric",
  "include_forecast": true
}
```

### 3. URL Utilities (`url_utilities`)
Comprehensive URL operations and utilities.

**Operations:**
- `validate`: Check URL validity and analyze structure
- `shorten`: Create shortened URLs
- `expand`: Expand shortened URLs
- `qr_code`: Generate QR codes for URLs

**Example:**
```javascript
{
  "operation": "validate",
  "url": "https://github.com/modelcontextprotocol"
}
```

### 4. Date/Time Operations (`get_datetime`)
Timezone-aware date and time formatting.

**Parameters:**
- `timezone`: IANA timezone (optional)
- `format`: iso, readable, timestamp, or custom

**Example:**
```javascript
{
  "timezone": "America/New_York",
  "format": "readable"
}
```

### 5. Service Health (`service_health`)
Monitor service status and connectivity.

**Parameters:** None

### 6. File Operations (`file_operations`)
Basic file system operations.

**Parameters:**
- `operation`: list, read, write, delete
- `path`: File or directory path
- `content`: Content for write operations (optional)

### 7. Custom Service Query (`query_custom_service`)
Query external services with flexible parameters.

**Parameters:**
- `endpoint`: API endpoint
- `method`: HTTP method
- `data`: Request body (optional)
- `headers`: Additional headers (optional)

## Development

### Adding New Tools

To add a new tool, follow this pattern in `src/index.ts`:

```typescript
server.tool(
  "tool_name",
  "Tool description",
  {
    parameter: z.string().describe("Parameter description"),
  },
  async ({ parameter }) => {
    // Tool implementation
    return {
      content: [
        {
          type: "text",
          text: "Tool result",
        },
      ],
    };
  }
);
```

### Error Handling

The server includes comprehensive error handling for:
- Network connection issues
- Service unavailability
- Invalid parameters
- Malformed responses

## Troubleshooting

### Common Issues

1. **Tool selection not working**: 
   - Verify Ollama is running: `ollama list`
   - Check model availability: `ollama pull llama3.2`
   - Review logs in web API console

2. **Frontend not loading**:
   - Ensure port 3001 is available
   - Check that frontend server is running: `npm run frontend-server`
   - Verify CORS settings in web API

3. **Tools returning errors**:
   - Check tool parameters match expected schema
   - Verify MCP server is built: `npm run build`
   - Review individual tool responses via direct API calls

4. **Service connectivity issues**:
   - Confirm SERVICE_BASE_URL environment variable
   - Test custom service health endpoint directly
   - Check firewall and port availability

### Debug Mode

Enable detailed logging:
```bash
$env:DEBUG="mcp*"
npm run real-web-api
```

### Testing Individual Components

```bash
# Test MCP server directly
node build/index.js

# Test Ollama connectivity  
curl http://localhost:11434/api/tags

# Test web API health
curl http://localhost:3002/health

# Test tool discovery
curl http://localhost:3002/api/tools
```

### Performance Tips

- Use specific tool names in requests for faster selection
- Cache tool results for repeated queries
- Monitor Ollama model performance with different sizes
- Consider using lighter models (e.g., `llama3.2:1b`) for tool selection

## License

ISC
