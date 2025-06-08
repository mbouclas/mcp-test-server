# Tests

This folder contains test files for various components of the MCP server.

## Files

- `test-integration.js` - Complete integration tests for MCP + Ollama
- `test-mcp-connection.js` - MCP connection and protocol tests
- `test-ollama-only.js` - Ollama-specific functionality tests
- `test-ollama-config.js` - Ollama configuration tests
- `test-config.js` - Configuration loading and validation tests
- `test-web-api.js` - Web API endpoint tests
- `test-server.js` - Core server functionality tests
- `test-single-query.js` - Single query tests
- `test-direct-ollama.js` - Direct Ollama API tests
- `test-mcp-imports.js` - MCP SDK import tests
- `test-builtin-fetch.js` - Built-in fetch functionality tests

## Usage

### Run All Integration Tests
```bash
npm run test-integration
```

### Run Individual Tests
```bash
# Test complete MCP + Ollama integration
node src/tests/test-integration.js

# Test MCP server only
node src/tests/test-server.js

# Test Ollama connectivity
node src/tests/test-ollama-only.js

# Test web API endpoints
node src/tests/test-web-api.js

# Test configuration loading
node src/tests/test-config.js
```

### Prerequisites for Tests

1. **Ollama running**: Most tests require Ollama to be running on port 11434
2. **Example service**: Integration tests require the example service to be running:
   ```bash
   npm run example-service
   ```
3. **Built project**: Tests use compiled JavaScript from the `build/` directory:
   ```bash
   npm run build
   ```

### Test Output

Tests provide detailed output including:
- ✅ Successful operations with timing
- ❌ Failed operations with error details
- 📋 Available tools and their descriptions
- 🔧 Tool execution results
- 🎯 Performance metrics
