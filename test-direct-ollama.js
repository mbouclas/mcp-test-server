// @ts-ignore
import fetch from 'node-fetch';

async function testOllama() {
    console.log('🔧 Testing Ollama API directly...');

    try {
        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gemma3:4b',
                messages: [
                    {
                        role: 'user',
                        content: 'Hello, respond with just "Hello back!"'
                    }
                ],
                stream: false
            })
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const text = await response.text();
            console.error('Error response:', text);
            return;
        }

        const data = await response.json();
        console.log('✅ Success! Response:', data.message?.content);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testOllama();
