import express from 'express';
import cors from 'cors';

const app = express();
const port = 3002;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'Web API server is running'
    });
});

// Simple test endpoint
app.post('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'Test endpoint working',
        received: req.body
    });
});

app.listen(port, () => {
    console.log(`🚀 Simple Web API Server running on port ${port}`);
    console.log(`📡 Test: http://localhost:${port}/api/health`);
});

export default app;
