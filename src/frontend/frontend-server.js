import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3001;

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve the frontend HTML file at root
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'frontend-example.html'));
});

app.listen(port, () => {
    console.log(`🌐 Frontend server running at http://localhost:${port}`);
    console.log(`📱 Open in browser: http://localhost:${port}`);
    console.log(`🔗 API server: http://localhost:3002`);
});
