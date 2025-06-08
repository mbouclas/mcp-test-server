// Test if we can import the MCP bridge components
console.log('Testing MCP bridge imports...');

try {
    console.log('1. Testing config import...');
    const { config } = await import('./build/config.js');
    console.log('✅ Config imported successfully');

    console.log('2. Testing bridge import...');
    const { OllamaMCPBridge } = await import('./build/ollama-bridge.js');
    console.log('✅ Bridge imported successfully');

    console.log('3. Testing bridge instantiation...');
    const bridge = new OllamaMCPBridge();
    console.log('✅ Bridge created successfully');

    console.log('4. Testing config access...');
    const fullConfig = config.getFullConfig();
    console.log('✅ Config accessed successfully:', fullConfig);

    console.log('✅ All imports working correctly!');

} catch (error) {
    console.error('❌ Import test failed:', error);
}
