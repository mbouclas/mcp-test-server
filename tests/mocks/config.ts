// Mock for config.ts to avoid __filename redeclaration in tests
export const config = {
    getFullConfig: () => ({
        service: {
            baseUrl: 'http://localhost:3000'
        },
        ollama: {
            baseUrl: 'http://localhost:11434',
            defaultModel: 'llama2',
            chatEndpoint: '/api/chat',
            tagsEndpoint: '/api/tags'
        },
        mcp: {
            serverCommand: 'node build/index.js'
        }
    }),
    getOllamaConfig: () => ({
        baseUrl: 'http://localhost:11434',
        defaultModel: 'llama2',
        chatEndpoint: '/api/chat',
        tagsEndpoint: '/api/tags'
    }),
    getServiceConfig: () => ({
        baseUrl: 'http://localhost:3000'
    }),
    getMcpConfig: () => ({
        serverCommand: 'node build/index.js'
    })
};
