async function testOllama() {
    console.log('🔧 Testing Ollama API with built-in fetch...');
    console.log('Node.js version:', process.version);
    console.log('fetch available:', typeof fetch);

    try {
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
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
