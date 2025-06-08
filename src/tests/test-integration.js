import { OllamaMCPBridge } from '../../build/ollama-bridge.js';
import { config } from '../../build/config.js';

/**
 * Complete integration test that demonstrates MCP server + Ollama working together
 */

async function runIntegrationTest() {
  console.log('🚀 Starting MCP + Ollama Integration Test\n');

  const bridge = new OllamaMCPBridge();

  try {
    // Step 1: Connect to MCP server
    console.log('1. Connecting to MCP server...');
    await bridge.connect();
    console.log('✅ Connected to MCP server\n');

    // Step 2: List available tools
    console.log('2. Getting available tools...');
    const tools = await bridge.getAvailableTools();
    console.log('✅ Available tools:');
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Step 3: Test service health
    console.log('3. Testing service health check...');
    const healthResult = await bridge.callTool('service_health', {});
    console.log('✅ Service health result:');
    console.log(`   ${healthResult.slice(0, 200)}...\n`);

    // Step 4: Test custom service query
    console.log('4. Testing custom service query...');
    const serviceResult = await bridge.callTool('query_custom_service', {
      endpoint: '/api/status',
      method: 'GET'
    });
    console.log('✅ Service query result:');
    console.log(`   ${serviceResult.slice(0, 200)}...\n`);    // Step 5: Test Ollama connection
    console.log('5. Testing Ollama connection...');
    try {
      const ollamaConfig = config.getOllamaConfig();
      const response = await fetch(`${ollamaConfig.baseUrl}${ollamaConfig.tagsEndpoint}`);
      if (response.ok) {
        const models = await response.json();
        console.log('✅ Ollama is running with models:', models.models?.map(m => m.name) || []);
        console.log(`✅ Using default model: ${ollamaConfig.defaultModel}`);
      } else {
        console.log('⚠️  Ollama is not accessible');
      }
    } catch (error) {
      console.log('⚠️  Ollama is not running - start it with: ollama serve');
    }
    console.log('');    // Step 6: Test full integration (if Ollama is available)
    console.log('6. Testing full MCP + Ollama integration...');
    try {
      const chatResponse = await bridge.processWithTools(
        'Can you check the health of my service and tell me about its current status?'
      );
      console.log('✅ Ollama + MCP integration result:');
      console.log(`   ${chatResponse.slice(0, 300)}...\n`);
    } catch (error) {
      console.log('⚠️  Full integration test skipped (Ollama may not be running)');
      console.log(`   Error: ${error.message}\n`);
    }

    console.log('🎉 Integration test completed successfully!');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await bridge.disconnect();
  }
}

async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...\n');

  const checks = [
    {
      name: 'MCP Server Build',
      check: async () => {
        try {
          await import('./build/index.js');
          return { ok: true, message: 'MCP server is built' };
        } catch (error) {
          return { ok: false, message: 'Run: npm run build' };
        }
      }
    }, {
      name: 'Example Service',
      check: async () => {
        try {
          const serviceConfig = config.getServiceConfig();
          const response = await fetch(`${serviceConfig.baseUrl}/health`, {
            signal: AbortSignal.timeout(2000)
          });
          return { ok: response.ok, message: response.ok ? 'Example service is running' : 'Service not responding' };
        } catch (error) {
          return { ok: false, message: 'Start with: npm run example-service' };
        }
      }
    },
    {
      name: 'Ollama Service',
      check: async () => {
        try {
          const ollamaConfig = config.getOllamaConfig();
          const response = await fetch(`${ollamaConfig.baseUrl}${ollamaConfig.tagsEndpoint}`, {
            signal: AbortSignal.timeout(2000)
          });
          return { ok: response.ok, message: response.ok ? 'Ollama is running' : 'Ollama not responding' };
        } catch (error) {
          return { ok: false, message: 'Start with: ollama serve' };
        }
      }
    }
  ];

  for (const check of checks) {
    const result = await check.check();
    const icon = result.ok ? '✅' : '⚠️ ';
    console.log(`${icon} ${check.name}: ${result.message}`);
  }

  console.log('');
  return checks.every(async check => (await check.check()).ok);
}

// Main execution
async function main() {
  console.log('🔧 MCP Server + Ollama Integration Test\n');

  await checkPrerequisites();
  await runIntegrationTest();

  console.log('\n📚 Next steps:');
  console.log('- Customize tools in src/index.ts for your specific service');
  console.log('- Use the OllamaMCPBridge class in your applications');
  console.log('- Check OLLAMA_INTEGRATION.md for detailed usage examples');
  console.log('- Configure Claude Desktop to use this MCP server');
}

main().catch(console.error);
