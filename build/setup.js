#!/usr/bin/env node
/**
 * Setup script for MCP server with Ollama integration
 * This script helps you configure and test the MCP server
 */
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
class MCPSetup {
    baseDir;
    ollamaConfigPath;
    constructor() {
        this.baseDir = process.cwd();
        this.ollamaConfigPath = this.getOllamaConfigPath();
    }
    getOllamaConfigPath() {
        const os = process.platform;
        if (os === 'win32') {
            return path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
        }
        else if (os === 'darwin') {
            return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
        }
        else {
            return path.join(process.env.HOME || '', '.config', 'claude', 'claude_desktop_config.json');
        }
    }
    async checkOllamaRunning() {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            return response.ok;
        }
        catch (error) {
            return false;
        }
    }
    async startExampleService() {
        console.log('Starting example service...');
        const service = spawn('node', ['example-service.js'], {
            stdio: 'inherit',
            cwd: this.baseDir
        });
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    const response = await fetch('http://localhost:3000/health');
                    if (response.ok) {
                        console.log('✅ Example service is running on http://localhost:3000');
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                }
                catch (error) {
                    resolve(false);
                }
            }, 2000);
        });
    }
    async testMCPServer() {
        console.log('Testing MCP server...');
        try {
            const { OllamaMCPBridge } = await import('./ollama-bridge.js');
            const bridge = new OllamaMCPBridge();
            await bridge.connect();
            const tools = await bridge.getAvailableTools();
            console.log('✅ MCP server is working!');
            console.log('Available tools:', tools.map((t) => t.name).join(', '));
            // Test a tool
            const healthResult = await bridge.callTool('service_health', {});
            console.log('Health check result:', healthResult);
            await bridge.disconnect();
            return true;
        }
        catch (error) {
            console.error('❌ MCP server test failed:', error.message);
            return false;
        }
    }
    async createClaudeConfig() {
        const config = {
            mcpServers: {
                "custom-service": {
                    command: "node",
                    args: [path.join(this.baseDir, "build", "index.js")],
                    env: {
                        SERVICE_BASE_URL: "http://localhost:3000"
                    }
                }
            }
        };
        try {
            // Create directory if it doesn't exist
            await fs.mkdir(path.dirname(this.ollamaConfigPath), { recursive: true });
            // Check if config exists
            let existingConfig = {};
            try {
                const existing = await fs.readFile(this.ollamaConfigPath, 'utf8');
                existingConfig = JSON.parse(existing);
            }
            catch (error) {
                // File doesn't exist, that's okay
            } // Merge configs
            const mergedConfig = {
                ...existingConfig,
                mcpServers: {
                    ...existingConfig.mcpServers,
                    ...config.mcpServers
                }
            };
            await fs.writeFile(this.ollamaConfigPath, JSON.stringify(mergedConfig, null, 2));
            console.log('✅ Claude Desktop config updated at:', this.ollamaConfigPath);
            console.log('Please restart Claude Desktop to see the changes.');
            return true;
        }
        catch (error) {
            console.error('❌ Failed to update Claude config:', error.message);
            return false;
        }
    }
    async printInstructions() {
        console.log('\n🚀 MCP Server Setup Complete!\n');
        console.log('Next steps:');
        console.log('1. Make sure your custom service is running (or use the example service)');
        console.log('2. Start the MCP server: npm run dev');
        console.log('3. Test with Claude Desktop (if configured)');
        console.log('4. Or use the Ollama bridge example\n');
        console.log('To connect with Ollama:');
        console.log('1. Make sure Ollama is running: ollama serve');
        console.log('2. Use the OllamaMCPBridge class in your code');
        console.log('3. See example in src/ollama-bridge.ts\n');
        console.log('Testing commands:');
        console.log('- Test example service: curl http://localhost:3000/health');
        console.log('- Test MCP tools: Use the bridge example or Claude Desktop');
        console.log('- Check Ollama: curl http://localhost:11434/api/tags\n');
        console.log('Configuration files:');
        console.log('- MCP server: src/index.ts');
        console.log('- Ollama bridge: src/ollama-bridge.ts');
        console.log('- Example service: example-service.js');
        console.log('- Claude config:', this.ollamaConfigPath);
    }
    async run() {
        console.log('🔧 Setting up MCP Server for Ollama integration...\n');
        // Check if build exists
        try {
            await fs.access(path.join(this.baseDir, 'build', 'index.js'));
            console.log('✅ MCP server is built');
        }
        catch (error) {
            console.log('❌ MCP server not built. Run: npm run build');
            return;
        }
        // Check Ollama
        const ollamaRunning = await this.checkOllamaRunning();
        if (ollamaRunning) {
            console.log('✅ Ollama is running');
        }
        else {
            console.log('⚠️  Ollama is not running. Start it with: ollama serve');
        }
        // Start example service
        console.log('\nWould you like to start the example service? (y/n)');
        // For demo purposes, let's assume yes
        console.log('Starting example service...');
        // Test MCP server
        await this.testMCPServer();
        // Create Claude config
        console.log('\nWould you like to configure Claude Desktop? (y/n)');
        // For demo purposes, let's assume yes
        await this.createClaudeConfig();
        await this.printInstructions();
    }
}
// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new MCPSetup();
    setup.run().catch(console.error);
}
export default MCPSetup;
//# sourceMappingURL=setup.js.map