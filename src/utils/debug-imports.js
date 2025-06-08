// Test imports one by one
console.log('🔍 Testing imports...');

try {
    console.log('1. Testing express...');
    const express = await import('express');
    console.log('✅ Express OK');

    console.log('2. Testing cors...');
    const cors = await import('cors');
    console.log('✅ CORS OK');

    console.log('3. Testing config...');
    const { config } = await import('./build/config.js');
    console.log('✅ Config OK:', typeof config);

    console.log('4. Testing ollama-bridge...');
    const { OllamaMCPBridge } = await import('./build/ollama-bridge.js');
    console.log('✅ OllamaMCPBridge OK:', typeof OllamaMCPBridge);

    console.log('5. Creating bridge instance...');
    const bridge = new OllamaMCPBridge();
    console.log('✅ Bridge instance created');

    console.log('🎉 All imports successful!');
} catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack:', error.stack);
}
