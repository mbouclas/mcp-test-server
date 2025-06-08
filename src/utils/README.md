# Utils

This folder contains utility scripts and development tools for the MCP server.

## Files

- `interactive-chat.js` - Interactive chat interface for testing MCP tools with Ollama
- `debug-imports.js` - Debug script for import resolution and dependency issues
- `debug-mcp-server.js` - Debug utilities for MCP server development and troubleshooting

## Usage

### Interactive Chat
Start an interactive chat session with Ollama that has access to all MCP tools:
```bash
npm run chat
```

This provides:
- Direct chat with Ollama models
- Automatic tool selection and execution
- Real-time tool results integration
- Multiple model support

### Debug Scripts
Run debug utilities directly:
```bash
# Debug import issues
node src/utils/debug-imports.js

# Debug MCP server connectivity
node src/utils/debug-mcp-server.js

# Interactive chat (alternative)
node src/utils/interactive-chat.js
```

### Interactive Chat Features

The interactive chat utility (`interactive-chat.js`) provides:

1. **Model Selection**: Choose from available Ollama models
2. **Tool Integration**: Automatic access to all MCP tools
3. **Smart Responses**: Context-aware responses using tool results
4. **Error Handling**: Graceful handling of connection issues
5. **Session Management**: Persistent chat sessions

### Usage Examples

```bash
# Start interactive chat
npm run chat

# In the chat:
> What's the weather in Tokyo?
# Automatically uses weather_info tool

> Calculate 15 factorial
# Automatically uses calculator tool

> Check service health
# Automatically uses service_health tool
```

### Prerequisites

- Ollama must be running on port 11434
- MCP server must be built: `npm run build`
- For service-related tools, example service should be running: `npm run example-service`

### Troubleshooting

If utilities fail to run:
1. Ensure all dependencies are installed: `npm install`
2. Build the project: `npm run build`
3. Check Ollama is running: `ollama list`
4. Verify port availability (11434 for Ollama)
