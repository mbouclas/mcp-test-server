import express from 'express';
import cors from 'cors';

/**
 * Example service that the MCP server can connect to
 * This simulates your actual service with the expected endpoints
 */

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sample data
const users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
];

let serverStartTime = Date.now();

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.floor((Date.now() - serverStartTime) / 1000),
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Generic status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'success',
    data: {
      server: 'running',
      connections: Math.floor(Math.random() * 100),
      memory_usage: `${Math.floor(Math.random() * 512)}MB`,
      cpu_usage: `${Math.floor(Math.random() * 100)}%`
    },
    message: 'Service is operating normally'
  });
});

// Database query endpoint
app.post('/api/query', (req, res) => {
  const { query, parameters } = req.body;

  // Simple query simulation
  let result;

  if (query.toLowerCase().includes('select') && query.toLowerCase().includes('users')) {
    result = {
      query,
      count: users.length,
      rows: users
    };
  } else {
    result = {
      query,
      count: 0,
      rows: []
    };
  }

  res.json(result);
});

// File operations endpoint
app.post('/api/files', (req, res) => {
  const { operation, path, content } = req.body;

  let result;

  switch (operation) {
    case 'list':
      result = {
        operation,
        path,
        files: ['file1.txt', 'file2.json', 'config.ini']
      };
      break;
    case 'read':
      result = {
        operation,
        path,
        content: `Content of ${path} - This is simulated file content.`
      };
      break;
    case 'write':
      result = {
        operation,
        path,
        success: true,
        message: `File ${path} written successfully with ${content?.length || 0} bytes`
      };
      break;
    case 'delete':
      result = {
        operation,
        path,
        success: true,
        message: `File ${path} deleted successfully`
      };
      break;
    default:
      return res.status(400).json({
        error: 'Invalid operation',
        valid_operations: ['list', 'read', 'write', 'delete']
      });
  }

  res.json(result);
});

// Custom endpoint examples
app.get('/api/users', (req, res) => {
  res.json({
    status: 'success',
    data: users,
    message: 'Users retrieved successfully'
  });
});

app.post('/api/users', (req, res) => {
  const newUser = {
    id: users.length + 1,
    ...req.body
  };
  users.push(newUser);

  res.json({
    status: 'success',
    data: newUser,
    message: 'User created successfully'
  });
});

// Generic API endpoint for testing
app.all('/api/*', (req, res) => {
  res.json({
    status: 'success',
    data: {
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      headers: req.headers
    },
    message: `${req.method} request to ${req.path} processed`
  });
});

app.listen(port, () => {
  console.log(`Example service running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API status: http://localhost:${port}/api/status`);
});
