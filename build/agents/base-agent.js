export class BaseAgent {
    name;
    description;
    systemPrompt;
    availableTools;
    bridge;
    context = new Map();
    constructor(name, description, systemPrompt, availableTools, bridge) {
        this.name = name;
        this.description = description;
        this.systemPrompt = systemPrompt;
        this.availableTools = availableTools;
        this.bridge = bridge;
    }
    /**
     * Initialize or get conversation context
     */
    getOrCreateContext(conversationId = 'default') {
        if (!this.context.has(conversationId)) {
            this.context.set(conversationId, {
                conversationId,
                messages: [],
                metadata: {}
            });
        }
        return this.context.get(conversationId);
    }
    /**
     * Add message to conversation history
     */
    addMessage(conversationId, role, content, toolsUsed) {
        const context = this.getOrCreateContext(conversationId);
        context.messages.push({
            role,
            content,
            timestamp: new Date(),
            toolsUsed
        });
        // Keep only last 20 messages to avoid context overflow
        if (context.messages.length > 20) {
            context.messages = context.messages.slice(-20);
        }
    }
    /**
     * Check if a tool is available to this agent
     */
    isToolAvailable(toolName) {
        return this.availableTools.includes(toolName) || this.availableTools.includes('*');
    }
    /**
     * Execute a tool if available
     */
    async executeTool(toolName, args) {
        if (!this.isToolAvailable(toolName)) {
            throw new Error(`Tool ${toolName} is not available to agent ${this.name}`);
        }
        return await this.bridge.callTool(toolName, args);
    }
    /**
     * Create an enhanced prompt with context and agent personality
     */
    createEnhancedPrompt(userMessage, context, includeHistory = true) {
        let prompt = this.systemPrompt + '\n\n';
        if (includeHistory && context.messages.length > 0) {
            prompt += 'Conversation History:\n';
            context.messages.slice(-10).forEach(msg => {
                const toolInfo = msg.toolsUsed ? ` (used tools: ${msg.toolsUsed.join(', ')})` : '';
                prompt += `${msg.role.toUpperCase()}: ${msg.content}${toolInfo}\n`;
            });
            prompt += '\n';
        }
        prompt += `Current Request: ${userMessage}\n\n`;
        prompt += `Available Tools: ${this.availableTools.join(', ')}\n`;
        prompt += `Agent Role: ${this.name} - ${this.description}`;
        return prompt;
    }
    /**
     * Get agent information
     */
    getInfo() {
        return {
            name: this.name,
            description: this.description,
            availableTools: this.availableTools
        };
    }
    /**
     * Clear conversation context
     */
    clearContext(conversationId = 'default') {
        this.context.delete(conversationId);
    }
    /**
     * Get conversation history
     */
    getConversationHistory(conversationId = 'default') {
        const context = this.context.get(conversationId);
        return context ? [...context.messages] : [];
    }
}
//# sourceMappingURL=base-agent.js.map