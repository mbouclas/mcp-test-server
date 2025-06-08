// Simple test to debug web-api-server startup issues
import express from 'express';
import cors from 'cors';

console.log('Starting debug test...');

try {
    console.log('Importing OllamaMCPBridge...');
    const { OllamaMCPBridge } = await import('./build/ollama-bridge.js');
    console.log('OllamaMCPBridge imported successfully');

    console.log('Importing config...');
    const { config } = await import('./build/config.js');
    console.log('Config imported successfully');

    console.log('Creating bridge instance...');
    const bridge = new OllamaMCPBridge();
    console.log('Bridge created successfully');

    console.log('Creating Express app...');
    const app = express();

    app.use(cors({
        origin: [
            'http://localhost:3001',
            'http://localhost:3003',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3003'
        ],
        credentials: true
    }));

    app.use(express.json({ limit: '10mb' }));

    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            mcpConnected: false,
            server: 'Debug MCP Bridge Server'
        });
    });

    const port = 3002;
    app.listen(port, () => {
        console.log(`🚀 Debug MCP Bridge Server running on port ${port}`);
        console.log(`📡 Test URL: http://localhost:${port}/api/health`);
    });

} catch (error) {
    console.error('Error during startup:', error);
}
