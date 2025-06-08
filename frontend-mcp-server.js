import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Frontend server for MCP Bridge Chat Interface
 * Serves the MCP-specific frontend on a different port to avoid conflicts
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.FRONTEND_PORT || 3003; // Different port from the minimal frontend

// Enable CORS for development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Serve static files
app.use(express.static(__dirname));

// Main route - serve the MCP frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend-mcp.html'));
});

// Health check for the frontend server
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        server: 'MCP Frontend Server',
        timestamp: new Date().toISOString(),
        api_target: 'http://localhost:3002' // Points to web-api-server.js
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>MCP Frontend Server is running, but this page doesn't exist.</p>
        <p><a href="/">Go to MCP Chat Interface</a></p>
    `);
});

// Start the server
app.listen(port, () => {
    console.log(`\n🌐 MCP Frontend Server running at http://localhost:${port}`);
    console.log(`📱 Open in browser: http://localhost:${port}`);
    console.log(`🔗 API server target: http://localhost:3002 (web-api-server.js)`);
    console.log(`🏠 Serving: frontend-mcp.html`);
    console.log(`\n💡 This frontend connects to the full MCP bridge with real tools`);
    console.log(`   Compare with minimal frontend at http://localhost:3001\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n🔄 MCP Frontend server shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🔄 MCP Frontend server shutting down...');
    process.exit(0);
});

export default app;
