# Frontend

This folder contains frontend applications and web interfaces for the MCP server.

## Files

- `frontend-server.js` - Main frontend application server (serves web interface)
- `frontend-mcp-server.js` - MCP-integrated frontend server with enhanced features
- `frontend-example.html` - Example frontend interface with basic functionality
- `frontend-mcp.html` - MCP-specific frontend interface with advanced features

## Usage

### Start Frontend Server
```bash
npm run frontend-server
```
This starts the frontend server on port 3001. Open http://localhost:3001 in your browser.

### Frontend Features

The frontend provides:
- **Interactive Chat Interface**: Chat with AI using MCP tools
- **Tool Discovery**: Browse available MCP tools and their descriptions
- **Direct Tool Testing**: Test individual tools with custom parameters
- **Real-time Results**: See tool execution results in real-time
- **Multiple AI Models**: Switch between different Ollama models
- **Smart Tool Selection**: Automatic tool selection based on user input

### Architecture

```
Frontend (Port 3001)
    ↓ HTTP/WebSocket
Web API Server (Port 3002)
    ↓ MCP Protocol
MCP Server
    ↓ Tool Calls
Individual Tools
```

### Development

To modify the frontend:
1. Edit the HTML files for UI changes
2. Modify `frontend-server.js` for server-side logic
3. The frontend communicates with the web API server for MCP integration

### Browser Compatibility

The frontend is compatible with modern browsers that support:
- ES6+ JavaScript
- Fetch API
- WebSocket (for real-time features)
- CSS Grid and Flexbox
