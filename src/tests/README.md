# Tests

This folder contains test files for various components of the MCP server.

## Files

- `test-integration.js` - Complete integration tests for MCP + Ollama
- `test-mcp-connection.js` - MCP connection and protocol tests
- `test-ollama-*.js` - Ollama-specific functionality tests
- `test-config.js` - Configuration loading and validation tests
- `test-web-api.js` - Web API endpoint tests
- `test-server.js` - Core server functionality tests

## Usage

Run tests using npm scripts:
```bash
npm run test-integration
```

Individual tests can be run directly:
```bash
node src/tests/test-integration.js
```
