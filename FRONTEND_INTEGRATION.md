# MCP + Ollama Frontend Integration 🚀

## Overview

This project demonstrates a complete frontend integration for Model Context Protocol (MCP) with Ollama, featuring a web-based chat interface that connects to your AI models.

## ✅ What's Working

### 1. **Minimal Web API Server** (`src/examples/minimal-web-api.js`)
- ✅ Express.js server with CORS enabled
- ✅ Direct integration with Ollama (no MCP complexity for now)
- ✅ RESTful API endpoints for frontend communication
- ✅ Health monitoring and model selection

### 2. **Frontend Chat Interface** (`src/frontend/frontend-example.html`)
- ✅ Modern, responsive web chat UI
- ✅ Real-time status indicators
- ✅ Model selection dropdown
- ✅ Tools integration ready
- ✅ Error handling and loading states

### 3. **Frontend Server** (`src/frontend/frontend-server.js`)
- ✅ Simple Express server to serve the HTML interface
- ✅ Static file serving with proper CORS headers

## 🌐 Running the Complete Demo

### Quick Start (Recommended)
```powershell
# Start both servers
npm run minimal-web-api    # Terminal 1 (API Server - Port 3002)
npm run frontend-server    # Terminal 2 (Frontend - Port 3001)

# Open in browser
http://localhost:3001
```

### Alternative: PowerShell Script
```powershell
.\start-complete-demo.ps1  # Starts everything automatically
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `GET` | `/api/tools` | Available MCP tools (empty for now) |
| `GET` | `/api/ollama/models` | List available Ollama models |
| `POST` | `/api/chat` | Simple chat with Ollama |
| `POST` | `/api/chat/smart` | Smart chat (frontend compatible) |
| `POST` | `/api/test` | Test endpoint |

## 🎯 Frontend Features

### Chat Interface
- **Real-time Chat**: Instant messaging with Ollama models
- **Model Selection**: Choose from available Ollama models
- **Status Indicators**: Connection status and health monitoring
- **Error Handling**: Graceful error display and recovery
- **Responsive Design**: Works on desktop and mobile

### UI Components
- **Message Threading**: Clean conversation flow
- **Loading States**: Processing indicators
- **Tool Integration**: Ready for MCP tools (placeholder)
- **Clear Chat**: Reset conversation history

## 🔧 Architecture

```
Frontend (Port 3001)          API Server (Port 3002)         Ollama (Port 11434)
┌─────────────────────┐       ┌─────────────────────┐       ┌─────────────────────┐
│                     │ HTTP  │                     │ HTTP  │                     │
│  frontend-example   ├──────▶│  minimal-web-api    ├──────▶│     Ollama AI       │
│       .html         │ CORS  │       .js           │ JSON  │     Models          │
│                     │       │                     │       │                     │
└─────────────────────┘       └─────────────────────┘       └─────────────────────┘
        │                              │                              │
        │                              │                              │
    Served by                    Express.js                     gemma3:4b
src/frontend/frontend-server.js  + CORS enabled                  deepseek-coder-v2
                                                                mistral:latest
                                                                etc.
```

## 🧪 Testing

### API Testing
```powershell
# Test health
Invoke-RestMethod -Uri "http://localhost:3002/api/health" -Method GET

# Test chat
Invoke-RestMethod -Uri "http://localhost:3002/api/chat/smart" -Method POST -ContentType "application/json" -Body '{"message": "Hello!"}'

# Test models
Invoke-RestMethod -Uri "http://localhost:3002/api/ollama/models" -Method GET
```

### Frontend Testing
1. Open `http://localhost:3001` in browser
2. Check connection status (should show green dot)
3. Select a model from dropdown
4. Send a test message: "Hello, how are you?"
5. Verify response appears in chat

## 🔮 Next Steps: MCP Integration

### Phase 1: Basic MCP Connection (Ready to implement)
- [ ] Connect `OllamaMCPBridge` to the web API
- [ ] Replace minimal API with full `src/examples/web-api-server.js`
- [ ] Enable real MCP tools in `/api/tools` endpoint

### Phase 2: Advanced Features
- [ ] Streaming responses for real-time chat
- [ ] Tool execution visualization in frontend
- [ ] Configuration management UI
- [ ] Multi-model conversation support

### Phase 3: Production Ready
- [ ] Authentication and security
- [ ] Database persistence
- [ ] Docker containerization
- [ ] CI/CD pipeline

## 📂 File Structure

```
i:\Work\testing\mcp\
├── src/
│   ├── examples/
│   │   ├── minimal-web-api.js      # ✅ Working API server (Ollama only)
│   │   ├── real-mcp-web-api.js     # ✅ Full MCP server 
│   │   └── web-api-server.js       # 🔄 Alternative MCP server
│   ├── frontend/
│   │   ├── frontend-server.js      # ✅ Static file server
│   │   ├── frontend-example.html   # ✅ Chat interface
│   │   └── frontend-mcp.html       # ✅ Enhanced chat interface
│   └── utils/
├── start-complete-demo.ps1         # ✅ Complete startup script
├── config.json                     # ✅ Configuration file
├── build/                          # ✅ Compiled TypeScript
│   ├── ollama-bridge.js            # ✅ MCP bridge (working)
│   └── config.js                   # ✅ Configuration manager
└── src/                            # ✅ TypeScript source
    ├── ollama-bridge.ts            # ✅ MCP bridge source
    └── config.ts                   # ✅ Configuration source
```

## 🐛 Known Issues & Solutions

### Issue 1: Web API Server Hanging
- **Problem**: `src/examples/web-api-server.js` hangs on MCP connection
- **Solution**: Use `src/examples/minimal-web-api.js` for now (working)
- **Future**: Debug MCP bridge connection issues

### Issue 2: CORS Errors
- **Problem**: Browser blocks cross-origin requests
- **Solution**: ✅ CORS enabled in both servers
- **Status**: Resolved

### Issue 3: Model Compatibility
- **Problem**: Wrong model names in API calls
- **Solution**: ✅ Updated to use `gemma3:4b` (available model)
- **Status**: Resolved

## 🎉 Success Metrics

- ✅ **Frontend loads successfully** in browser
- ✅ **API connectivity** established and tested
- ✅ **Chat functionality** working with Ollama
- ✅ **Model selection** working in UI
- ✅ **Error handling** graceful and informative
- ✅ **Status indicators** showing real-time connection state

## 🚀 Quick Demo Commands

```powershell
# Terminal 1: Start API
npm run minimal-web-api

# Terminal 2: Start Frontend
npm run frontend-server

# Browser: Open
http://localhost:3001

# Test: Send message
"Hello, tell me a joke!"
```

## 📞 Support

The integration is **working and ready for use**! 

- Frontend: Modern chat interface ✅
- API: Ollama integration ✅  
- Models: Multiple models available ✅
- CORS: Properly configured ✅
- Error Handling: Comprehensive ✅

Next phase: Connect the full MCP bridge for advanced tool capabilities.
