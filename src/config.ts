import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface OllamaConfig {
    baseUrl: string;
    defaultModel: string;
    chatEndpoint: string;
    tagsEndpoint: string;
}

export interface ServiceConfig {
    baseUrl: string;
}

export interface McpConfig {
    serverCommand: string;
    serverArgs: string[];
}

export interface Config {
    ollama: OllamaConfig;
    service: ServiceConfig;
    mcp: McpConfig;
}

class ConfigManager {
    private config: Config;

    constructor() {
        this.config = this.getDefaultConfig(); // Initialize with defaults first
        this.loadConfig();
    }
    private loadConfig(): void {
        try {
            const configPath = join(__dirname, '..', 'config.json');
            const configData = readFileSync(configPath, 'utf-8');
            this.config = JSON.parse(configData);

            // Override with environment variables if they exist
            this.config.ollama.baseUrl = process.env.OLLAMA_URL || this.config.ollama.baseUrl;
            this.config.ollama.defaultModel = process.env.OLLAMA_MODEL || this.config.ollama.defaultModel;
            this.config.service.baseUrl = process.env.SERVICE_BASE_URL || this.config.service.baseUrl;

        } catch (error: any) {
            console.warn('Could not load config file, using defaults:', error?.message || error);
            this.config = this.getDefaultConfig();
        }
    }

    private getDefaultConfig(): Config {
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

    public getOllamaConfig(): OllamaConfig {
        return this.config.ollama;
    }

    public getServiceConfig(): ServiceConfig {
        return this.config.service;
    }

    public getMcpConfig(): McpConfig {
        return this.config.mcp;
    }

    public getFullConfig(): Config {
        return this.config;
    }
}

// Export a singleton instance
export const config = new ConfigManager();
