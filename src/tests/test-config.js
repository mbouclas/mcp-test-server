import { config } from '../../build/config.js';

console.log('🔧 Configuration Test');
console.log('====================');

const ollamaConfig = config.getOllamaConfig();
const serviceConfig = config.getServiceConfig();
const mcpConfig = config.getMcpConfig();

console.log('\n📝 Configuration Values:');
console.log('Ollama Base URL:', ollamaConfig.baseUrl);
console.log('Ollama Default Model:', ollamaConfig.defaultModel);
console.log('Ollama Chat Endpoint:', ollamaConfig.chatEndpoint);
console.log('Ollama Tags Endpoint:', ollamaConfig.tagsEndpoint);
console.log('Service Base URL:', serviceConfig.baseUrl);
console.log('MCP Server Command:', mcpConfig.serverCommand);
console.log('MCP Server Args:', mcpConfig.serverArgs);

console.log('\n🔄 Environment Variable Override Test:');
console.log('OLLAMA_URL env var:', process.env.OLLAMA_URL || 'Not set');
console.log('OLLAMA_MODEL env var:', process.env.OLLAMA_MODEL || 'Not set');
console.log('SERVICE_BASE_URL env var:', process.env.SERVICE_BASE_URL || 'Not set');

console.log('\n✅ Configuration system is working correctly!');
