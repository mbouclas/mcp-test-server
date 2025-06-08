# System Architecture Documentation

## Overview

This project implements an intelligent Model Context Protocol (MCP) server with automatic tool selection capabilities, featuring seamless Ollama integration and a comprehensive suite of utilities.

## Architecture Diagram

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Web API        │    │   Ollama        │
│   (Port 3001)   │◄──►│   (Port 3002)    │◄──►│   (Port 11434)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Ollama Bridge   │
                       │  Tool Selection  │
                       └──────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   MCP Server     │
                       │   (stdio)        │
                       └──────────────────┘
                              │
                              ▼
    ┌─────────────┬─────────────┬─────────────┬─────────────┐
    │ Calculator  │   Weather   │ URL Utils   │ DateTime    │
    │    Tool     │    Tool     │    Tool     │    Tool     │
    └─────────────┴─────────────┴─────────────┴─────────────┘
```

## Component Details

### 1. Frontend Interface (`src/frontend/frontend-mcp.html`)

**Purpose**: Interactive web interface for testing and demonstrating the system

**Key Features**:
- Real-time chat interface
- Model selection (llama3.2, llama3.2:1b, codellama)
- Request/response history
- Error handling and status indicators

**Technical Details**:
- Vanilla HTML/CSS/JavaScript
- Connects to Web API via fetch()
- Responsive design with modern UI

### 2. Web API Server (`src/examples/real-mcp-web-api.js`)

**Purpose**: RESTful API layer that bridges frontend requests to the MCP system

**Key Endpoints**:
```
GET  /health                      - Health check
GET  /api/tools                   - List available tools
POST /api/chat                    - Direct Ollama chat (no tools)
POST /api/chat/smart              - Smart chat with tool selection
POST /api/tools/{toolName}        - Direct tool execution
```

**Technical Details**:
- Express.js server
- CORS enabled for frontend communication
- Comprehensive error handling
- Background MCP server management

### 3. Ollama Bridge (`src/ollama-bridge.ts`)

**Purpose**: Intelligent tool selection and execution coordinator

**Core Functions**:
- `processWithTools()`: Main entry point for smart processing
- `analyzeToolNeeds()`: LLM-based tool identification
- `fallbackToolSelection()`: Keyword-based backup selection
- `callTool()`: Direct tool execution interface

**Intelligence Layers**:
1. **Primary**: LLM analysis of user requests
2. **Fallback**: Keyword pattern matching
3. **Integration**: Result synthesis and response formatting

### 4. MCP Server (`src/index.ts`)

**Purpose**: Core MCP protocol implementation with tool definitions

**Available Tools**:
- `calculator`: Mathematical operations and number theory
- `weather_info`: Weather data with customizable units
- `url_utilities`: URL operations and utilities
- `get_datetime`: Timezone-aware datetime functions
- `service_health`: System health monitoring
- `file_operations`: Basic file system operations
- `query_custom_service`: External service integration

### 5. Tool Implementations

Each tool follows the MCP protocol specification:

```typescript
server.tool(
  "tool_name",
  "Tool description for LLM understanding",
  {
    parameter: z.type().describe("Parameter description"),
  },
  async ({ parameter }) => {
    // Tool implementation
    return {
      content: [{ type: "text", text: "Result" }],
    };
  }
);
```

## Data Flow

### Smart Chat Request Flow

1. **User Input**: Natural language request via frontend
2. **API Reception**: Web API receives POST to `/api/chat/smart`
3. **Bridge Processing**: Ollama Bridge analyzes request
4. **Tool Selection**: 
   - Primary: LLM analysis identifies relevant tools
   - Fallback: Keyword matching if LLM fails
5. **Tool Execution**: Selected tools called via MCP protocol
6. **Result Integration**: Tool outputs combined into response
7. **Response Delivery**: Final answer returned to frontend

### Direct Tool Access Flow

1. **Tool Request**: Direct POST to `/api/tools/{toolName}`
2. **Parameter Validation**: Web API validates request body
3. **MCP Execution**: Bridge calls specific tool
4. **Result Return**: Tool output returned directly

## Intelligent Tool Selection

### LLM-Based Analysis

The system uses Ollama to analyze user requests with this prompt structure:

```
You are a tool selector. Analyze this request and identify needed tools.

Available tools:
- calculator: mathematical operations, factorial, fibonacci, prime checking
- weather_info: weather data with location and units
- url_utilities: URL validation, shortening, QR codes
- get_datetime: timezone-aware date/time operations
- service_health: system health monitoring
- file_operations: file system operations
- query_custom_service: external service calls

User request: "{user_message}"

Respond with JSON: {"tools": ["tool1", "tool2"], "parameters": {...}}
```

### Fallback Keyword Matching

When LLM analysis fails, the system uses keyword patterns:

```javascript
// Mathematical operations
if (message.match(/\b(calculate|factorial|fibonacci|prime|\+|\-|\*|\/)\b/i)) {
  return ['calculator'];
}

// Weather queries  
if (message.match(/\b(weather|temperature|forecast|rain|sunny|cloudy)\b/i)) {
  return ['weather_info'];
}

// URL operations
if (message.match(/\b(url|link|validate|shorten|expand|qr)\b/i)) {
  return ['url_utilities'];
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVICE_BASE_URL` | `http://localhost:3000` | Custom service endpoint |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `DEBUG` | - | Enable debug logging (`mcp*`) |

### Port Allocation

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Example Service | Optional custom service for testing |
| 3002 | Web API | Main REST API server |
| 3001 | Frontend | Static file server for UI |
| 11434 | Ollama | Local LLM API (default) |

## Security Considerations

### Current Implementation
- CORS enabled for local development
- No authentication required
- Local-only network access

### Production Recommendations
- Implement API key authentication
- Add rate limiting
- Enable HTTPS/TLS
- Validate and sanitize all inputs
- Add request logging and monitoring

## Performance Characteristics

### Model Performance
- `llama3.2:1b`: ~200ms tool selection, good accuracy
- `llama3.2`: ~500ms tool selection, excellent accuracy
- `codellama`: ~400ms, optimized for code-related tools

### Caching Opportunities
- Tool results for identical parameters
- LLM responses for common patterns
- Model loading time optimization

## Error Handling

### Error Propagation
```
Frontend Error Display ← Web API Error Response ← Bridge Exception ← Tool Failure
```

### Error Types
1. **Network Errors**: Ollama unavailable, service timeout
2. **Tool Errors**: Invalid parameters, execution failure
3. **Selection Errors**: No tools identified, parsing failure
4. **System Errors**: MCP server crash, memory issues

## Testing Strategy

### Unit Tests
- Individual tool functionality
- Parameter validation
- Error condition handling

### Integration Tests
- End-to-end request flow
- Tool selection accuracy
- Multi-tool coordination

### Performance Tests
- Response time benchmarks
- Concurrent request handling
- Memory usage patterns

## Deployment Options

### Development
```bash
# Terminal 1: Start web API
npm run real-web-api

# Terminal 2: Start frontend
npm run frontend-server
```

### Production (PM2)
```json
{
  "apps": [
    {
      "name": "mcp-web-api",
      "script": "src/examples/real-mcp-web-api.js",
      "instances": 2,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "SERVICE_BASE_URL": "https://api.example.com"
      }
    }
  ]
}
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3002
CMD ["node", "src/examples/real-mcp-web-api.js"]
```

## Future Enhancements

### Planned Features
1. **Advanced Tool Chaining**: Multi-step tool workflows
2. **Persistent Context**: Session-based conversation memory
3. **Plugin System**: Dynamic tool loading
4. **Real API Integration**: Weather APIs, URL services
5. **Authentication**: User management and access control

### Scalability Improvements
1. **Load Balancing**: Multiple MCP server instances
2. **Caching Layer**: Redis for tool results
3. **Queue System**: Asynchronous tool execution
4. **Monitoring**: Prometheus metrics and alerting

## Contributing

### Adding New Tools
1. Define tool in `src/index.ts`
2. Update selection logic in `src/ollama-bridge.ts`
3. Add API endpoint in `src/examples/real-mcp-web-api.js`
4. Update documentation

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Comprehensive error handling
- Clear documentation and comments

This architecture provides a solid foundation for extending the MCP ecosystem with intelligent tool selection and seamless LLM integration.
