import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
class ConfigManager {
    config;
    constructor() {
        this.config = this.getDefaultConfig(); // Initialize with defaults first
        this.loadConfig();
    }
    loadConfig() {
        try {
            const configPath = join(__dirname, '..', 'config.json');
            const configData = readFileSync(configPath, 'utf-8');
            this.config = JSON.parse(configData);
            // Override with environment variables if they exist
            this.config.ollama.baseUrl = process.env.OLLAMA_URL || this.config.ollama.baseUrl;
            this.config.ollama.defaultModel = process.env.OLLAMA_MODEL || this.config.ollama.defaultModel;
            this.config.service.baseUrl = process.env.SERVICE_BASE_URL || this.config.service.baseUrl;
        }
        catch (error) {
            console.warn('Could not load config file, using defaults:', error?.message || error);
            this.config = this.getDefaultConfig();
        }
    }
    getDefaultConfig() {
        return {
            ollama: {
                baseUrl: 'http://127.0.0.1:11434',
                defaultModel: 'gemma3:4b',
                chatEndpoint: '/api/chat',
                tagsEndpoint: '/api/tags'
            },
            service: {
                baseUrl: 'http://localhost:3000'
            },
            mcp: {
                serverCommand: 'node',
                serverArgs: ['build/index.js']
            }
        };
    }
    getOllamaConfig() {
        return this.config.ollama;
    }
    getServiceConfig() {
        return this.config.service;
    }
    getMcpConfig() {
        return this.config.mcp;
    }
    getFullConfig() {
        return this.config;
    }
}
// Export a singleton instance
export const config = new ConfigManager();
//# sourceMappingURL=config.js.map