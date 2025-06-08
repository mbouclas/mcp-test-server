// Quick test of the web API server components
import express from 'express';
import cors from 'cors';

console.log('Testing imports...');

try {
    console.log('✅ Express and CORS imported successfully');

    // Test config import
    const { config } = await import('./build/config.js');
    console.log('✅ Config imported successfully');
    console.log('Config:', config.getFullConfig());

    // Test bridge import
    console.log('Importing OllamaMCPBridge...');
    const { OllamaMCPBridge } = await import('./build/ollama-bridge.js');
    console.log('✅ OllamaMCPBridge imported successfully');

    // Test creating bridge instance
    console.log('Creating bridge instance...');
    const bridge = new OllamaMCPBridge();
    console.log('✅ Bridge instance created successfully');

    // Test simple express app
    console.log('Creating express app...');
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get('/test', (req, res) => {
        res.json({ status: 'ok', message: 'Test endpoint working' });
    });

    const server = app.listen(3002, () => {
        console.log('✅ Express server started on port 3002');
        console.log('Test: curl http://localhost:3002/test');
    });

    // Test connecting to bridge
    console.log('Testing bridge connection...');
    setTimeout(async () => {
        try {
            await bridge.connect();
            console.log('✅ Bridge connected successfully');
        } catch (error) {
            console.log('❌ Bridge connection failed:', error.message);
        }

        // Cleanup
        server.close();
        await bridge.disconnect();
        console.log('✅ Test completed');
        process.exit(0);
    }, 1000);

} catch (error) {
    console.error('❌ Error during testing:', error.message);
    console.error(error.stack);
    process.exit(1);
}
