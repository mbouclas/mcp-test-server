# Ollama Integration Guide

This guide shows you how to use the intelligent MCP server with Ollama for automatic tool selection and execution.

## System Architecture

```
User Request → Web API → Ollama Bridge → Tool Selection → MCP Server → Tool Execution
```

The system features **intelligent tool selection** where Ollama automatically identifies and calls the appropriate tools based on natural language requests.

## Prerequisites

1. **Ollama installed and running**:
   ```powershell
   # Install Ollama from https://ollama.ai/download
   # Start the service:
   ollama serve
   
   # Pull recommended models:
   ollama pull llama3.2        # Recommended for tool selection
   ollama pull llama3.2:1b     # Lightweight option
   ollama pull codellama       # For code-related tasks
   ```

2. **MCP server built and ready**:
   ```powershell
   npm install
   npm run build
   ```

3. **Services started**:
   ```powershell
   # Terminal 1: Optional example service
   npm run example-service
   
   # Terminal 2: Web API server with Ollama bridge
   node real-mcp-web-api.js
   
   # Terminal 3: Frontend interface
   npx http-server -p 3003
   ```

## Integration Methods

### Method 1: Smart Chat API (Recommended)

Use the intelligent tool selection endpoint for seamless integration:

```javascript
// Send natural language requests that automatically trigger tools
const response = await fetch('http://localhost:3002/api/chat/smart', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "What is 20 factorial?",
    model: "llama3.2"
  })
});

const result = await response.json();
console.log(result.response); // "20 factorial is 2,432,902,008,176,640,000"
```

**Example requests that trigger automatic tool selection:**

```javascript
// Mathematical operations
"Calculate the 10th Fibonacci number"          → calculator tool
"Is 97 a prime number?"                        → calculator tool  
"What is 15 factorial?"                        → calculator tool

// Weather queries
"What's the weather in London?"                → weather_info tool
"Show me Paris weather in Fahrenheit"         → weather_info tool
"Get Tokyo forecast in Celsius"               → weather_info tool

// URL operations  
"Validate this URL: https://example.com"      → url_utilities tool
"Generate QR code for https://github.com"     → url_utilities tool
"Shorten this link: https://very-long-url"    → url_utilities tool

// System operations
"What time is it in New York?"                → get_datetime tool
"Check service health"                        → service_health tool
```

### Method 2: Direct Tool Access

Call specific tools directly when you know exactly what you need:

```javascript
// Direct calculator call
const calcResponse = await fetch('http://localhost:3002/api/tools/calculator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: "factorial",
    n: 10
  })
});

// Direct weather call
const weatherResponse = await fetch('http://localhost:3002/api/tools/weather_info', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    location: "Tokyo",
    units: "metric",
    include_forecast: true
  })
});
```

### Method 3: Programmatic Bridge Usage

Use the OllamaMCPBridge class directly in your Node.js applications:

```typescript
import { OllamaMCPBridge } from './build/ollama-bridge.js';

const bridge = new OllamaMCPBridge();
await bridge.connect();

// Process requests with automatic tool selection
const response = await bridge.processWithTools(
  "Calculate the 25th Fibonacci number and tell me if it's prime",
  "llama3.2"
);

console.log(response);
// Automatically calls calculator tool twice and combines results

// Use specific tools programmatically
const tools = await bridge.listTools();
const healthResult = await bridge.callTool('service_health', {});
```

### Method 4: Claude Desktop Integration

Configure Claude Desktop to use the MCP server:

1. **Edit Claude Desktop config** at `%APPDATA%\Claude\claude_desktop_config.json`:
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

2. **Restart Claude Desktop** to load the server.

3. **Use natural language** in Claude Desktop:
   - "What is 15 factorial?"
   - "Check the weather in Tokyo"
   - "Validate this URL: https://example.com"

## Smart Tool Selection

### How It Works

1. **Request Analysis**: Ollama analyzes the user's natural language request
2. **Tool Identification**: The system identifies relevant tools and extracts parameters
3. **Tool Execution**: Selected tools are called with the extracted parameters  
4. **Response Integration**: Tool results are combined into a coherent response

### Tool Selection Rules

The system uses these patterns to select tools:

**Calculator Tool:**
- Keywords: calculate, factorial, fibonacci, prime, math, +, -, *, /
- Examples: "What is 10!", "Calculate 5+5", "Is 17 prime?"

**Weather Tool:**
- Keywords: weather, temperature, forecast, rain, sunny, cloudy
- Examples: "Weather in Paris", "Tokyo forecast", "Temperature in London"

**URL Utilities:**
- Keywords: url, link, validate, shorten, expand, qr
- Examples: "Validate URL", "Shorten this link", "Generate QR code"

**DateTime Tool:**
- Keywords: time, date, timezone, when, now
- Examples: "What time is it?", "Current date in Tokyo", "Time in UTC"

### Fallback Mechanism

If the LLM-based tool selection fails, the system uses keyword matching as a fallback to ensure requests are still handled appropriately.

## Configuration

### Environment Variables

```powershell
# Set Ollama host (if different from default)
$env:OLLAMA_HOST="http://localhost:11434"

# Set custom service URL
$env:SERVICE_BASE_URL="http://localhost:3000"

# Enable debug logging
$env:DEBUG="mcp*"
```

### Recommended Ollama Models

**For Tool Selection (Recommended):**
- `llama3.2` - Best balance of speed and accuracy
- `llama3.2:1b` - Fastest, good for simple tool selection
- `llama3.1` - High accuracy for complex requests

**For Specialized Tasks:**
- `codellama` - Code-related tool usage
- `mistral` - Alternative general-purpose model

```powershell
# Pull recommended models
ollama pull llama3.2
ollama pull llama3.2:1b
ollama pull codellama
```

### Port Configuration

- **11434**: Ollama API (default)
- **3000**: Example/Custom service
- **3002**: MCP Web API server
- **3003**: Frontend interface

## Testing the Integration

### 1. Start All Services

```powershell
# Terminal 1: Start Ollama (if not running)
ollama serve

# Terminal 2: Start the web API server
node real-mcp-web-api.js

# Terminal 3: Start frontend (optional)
npx http-server -p 3003
```

### 2. Test Smart Chat

```powershell
# Test mathematical operations
curl -X POST http://localhost:3002/api/chat/smart `
  -H "Content-Type: application/json" `
  -d '{"message": "What is 10 factorial?", "model": "llama3.2"}'

# Test weather queries
curl -X POST http://localhost:3002/api/chat/smart `
  -H "Content-Type: application/json" `
  -d '{"message": "Weather in Tokyo with forecast", "model": "llama3.2"}'

# Test URL operations
curl -X POST http://localhost:3002/api/chat/smart `
  -H "Content-Type: application/json" `
  -d '{"message": "Validate URL: https://github.com", "model": "llama3.2"}'
```

### 3. Test Direct Tool Access

```powershell
# Calculator tool
curl -X POST http://localhost:3002/api/tools/calculator `
  -H "Content-Type: application/json" `
  -d '{"operation": "fibonacci", "n": 10}'

# Weather tool
curl -X POST http://localhost:3002/api/tools/weather_info `
  -H "Content-Type: application/json" `
  -d '{"location": "Paris", "units": "metric"}'

# URL utilities
curl -X POST http://localhost:3002/api/tools/url_utilities `
  -H "Content-Type: application/json" `
  -d '{"operation": "validate", "url": "https://example.com"}'
```

### 4. Test Frontend Interface

1. Open `http://localhost:3003/frontend-mcp.html`
2. Try these example requests:
   - "Calculate 25 factorial"
   - "What's the weather in London?"
   - "Validate this URL: https://modelcontextprotocol.io"
   - "What time is it in Tokyo?"

## Troubleshooting

### Common Issues

1. **Tool selection not working**: 
   - Verify Ollama is running: `ollama list`
   - Check model availability: `ollama pull llama3.2`
   - Review logs in web API console

2. **Frontend not loading**:
   - Ensure port 3003 is available
   - Check that `frontend-mcp.html` exists
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
```powershell
$env:DEBUG="mcp*"
node real-mcp-web-api.js
```

### Performance Tips

- Use `llama3.2:1b` for simple tool selection (faster)
- Use `llama3.2` for complex parameter extraction
- Cache tool results for repeated queries
- Monitor Ollama model performance

## Production Deployment

For production environments:

1. **Use environment variables for configuration**
2. **Add proper logging and monitoring**  
3. **Implement health checks and auto-restart**
4. **Use process managers like PM2**
5. **Set up proper security measures**

Example PM2 configuration:
```json
{
  "name": "mcp-web-api",
  "script": "real-mcp-web-api.js", 
  "env": {
    "SERVICE_BASE_URL": "https://your-production-service.com",
    "OLLAMA_HOST": "http://localhost:11434"
  },
  "instances": 1,
  "autorestart": true
}
```

## Summary

The intelligent MCP server with Ollama integration provides:

- **🧠 Smart Tool Selection**: Automatic tool identification from natural language
- **🔧 Comprehensive Tools**: Calculator, weather, URL utilities, datetime, and more
- **🌐 Multiple Interfaces**: Web API, frontend, programmatic access, and Claude Desktop
- **🦙 Native Ollama Integration**: Seamless connection with local Ollama models
- **📊 Real-time Testing**: Interactive frontend for immediate feedback

This system demonstrates how MCP can bridge the gap between language models and practical tools, enabling natural language interfaces to complex functionality.
