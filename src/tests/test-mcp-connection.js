#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPServer() {
  console.log('🧪 Testing MCP Server Connection...\n');

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  try {
    // Connect to our MCP server
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['build/index.js'],
      env: {
        SERVICE_BASE_URL: 'http://localhost:3000'
      }
    });

    await client.connect(transport);
    console.log('✅ Connected to MCP server');

    // List available tools
    const tools = await client.listTools();
    console.log('\n📋 Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Test service health tool
    console.log('\n🏥 Testing service_health tool...');
    const healthResult = await client.callTool({
      name: 'service_health',
      arguments: {}
    });

    console.log('Health check result:');
    healthResult.content.forEach(content => {
      if (content.type === 'text') {
        console.log(content.text);
      }
    });

    // Test query_custom_service tool
    console.log('\n🔗 Testing query_custom_service tool...');
    const apiResult = await client.callTool({
      name: 'query_custom_service',
      arguments: {
        endpoint: '/api/status',
        method: 'GET'
      }
    });

    console.log('API call result:');
    apiResult.content.forEach(content => {
      if (content.type === 'text') {
        console.log(content.text);
      }
    });

    // Test execute_query tool
    console.log('\n💾 Testing execute_query tool...');
    const queryResult = await client.callTool({
      name: 'execute_query',
      arguments: {
        query: 'SELECT * FROM users LIMIT 3',
        parameters: []
      }
    });

    console.log('Database query result:');
    queryResult.content.forEach(content => {
      if (content.type === 'text') {
        console.log(content.text);
      }
    });

    await client.close();
    console.log('\n✅ All tests passed! MCP server is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMCPServer().catch(console.error);
