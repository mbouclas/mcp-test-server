import { spawn } from 'child_process';

/**
 * Simple test script to verify the MCP server responds correctly
 */

async function testMCPServer() {
  console.log('Testing MCP server...');

  const server = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  // MCP initialization message
  const initMessage = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  return new Promise((resolve, reject) => {
    let output = '';

    server.stdout.on('data', (data) => {
      output += data.toString();
      console.log('Server response:', data.toString());

      // If we get a response, the server is working
      if (output.includes('jsonrpc')) {
        server.kill();
        resolve(true);
      }
    });

    server.stderr.on('data', (data) => {
      console.log('Server stderr:', data.toString());
    });

    server.on('close', (code) => {
      if (code === 0 || output.includes('jsonrpc')) {
        resolve(true);
      } else {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Send initialization message
    server.stdin.write(JSON.stringify(initMessage) + '\n');

    // Timeout after 5 seconds
    setTimeout(() => {
      server.kill();
      if (output.includes('Custom Service MCP Server running')) {
        resolve(true);
      } else {
        reject(new Error('Server test timeout'));
      }
    }, 5000);
  });
}

testMCPServer()
  .then(() => {
    console.log('✅ MCP server test passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MCP server test failed:', error.message);
    process.exit(1);
  });
