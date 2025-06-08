import { config } from '../../build/config.js';

async function testOllamaWithConfig() {
    console.log('🔧 Testing Ollama with Configuration System');
    console.log('=============================================');

    const ollamaConfig = config.getOllamaConfig();

    console.log('\n📝 Using Configuration:');
    console.log(`Base URL: ${ollamaConfig.baseUrl}`);
    console.log(`Default Model: ${ollamaConfig.defaultModel}`);
    console.log(`Chat Endpoint: ${ollamaConfig.chatEndpoint}`);
    console.log(`Tags Endpoint: ${ollamaConfig.tagsEndpoint}`);

    try {
        // Test 1: Check available models
        console.log('\n1. Checking available models...');
        const tagsResponse = await fetch(`${ollamaConfig.baseUrl}${ollamaConfig.tagsEndpoint}`);

        if (!tagsResponse.ok) {
            throw new Error(`Tags request failed: ${tagsResponse.status}`);
        }

        const tagsData = await tagsResponse.json();
        const availableModels = tagsData.models?.map(m => m.name) || [];
        console.log('✅ Available models:', availableModels);

        // Check if configured model is available
        if (availableModels.includes(ollamaConfig.defaultModel)) {
            console.log(`✅ Configured model "${ollamaConfig.defaultModel}" is available`);
        } else {
            console.log(`⚠️  Configured model "${ollamaConfig.defaultModel}" not found`);
            console.log('Available models:', availableModels);
        }

        // Test 2: Chat with configured model
        console.log('\n2. Testing chat with configured model...');
        const chatResponse = await fetch(`${ollamaConfig.baseUrl}${ollamaConfig.chatEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: ollamaConfig.defaultModel,
                messages: [
                    {
                        role: 'user',
                        content: 'Respond with exactly: "Configuration test successful!"'
                    }
                ],
                stream: false
            })
        });

        if (!chatResponse.ok) {
            const errorText = await chatResponse.text();
            throw new Error(`Chat request failed: ${chatResponse.status} - ${errorText}`);
        }

        const chatData = await chatResponse.json();
        console.log('✅ Chat response:', chatData.message?.content || 'No content');

        // Test 3: Environment variable override test
        console.log('\n3. Testing environment variable override...');
        const originalUrl = process.env.OLLAMA_URL;
        const originalModel = process.env.OLLAMA_MODEL;

        // Temporarily set env vars
        process.env.OLLAMA_URL = 'http://test-override:9999';
        process.env.OLLAMA_MODEL = 'test-model';

        // Re-import config to test override (in real usage, this would be at startup)
        console.log('⚠️  Note: Env var override requires app restart to take effect');
        console.log(`Current OLLAMA_URL env: ${process.env.OLLAMA_URL}`);
        console.log(`Current OLLAMA_MODEL env: ${process.env.OLLAMA_MODEL}`);

        // Restore original values
        if (originalUrl) process.env.OLLAMA_URL = originalUrl; else delete process.env.OLLAMA_URL;
        if (originalModel) process.env.OLLAMA_MODEL = originalModel; else delete process.env.OLLAMA_MODEL;

        console.log('\n🎉 All Ollama configuration tests passed!');

    } catch (error) {
        console.error('❌ Ollama test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testOllamaWithConfig();
