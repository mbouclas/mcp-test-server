import { OllamaMCPBridge } from '../ollama-bridge.js';

/**
 * Base Agent class that all specialized agents extend
 * Provides common functionality for tool usage and conversation management
 */

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    toolsUsed?: string[];
}

export interface AgentContext {
    conversationId: string;
    messages: AgentMessage[];
    metadata: Record<string, any>;
}

export abstract class BaseAgent {
    protected name: string;
    protected description: string;
    protected systemPrompt: string;
    protected availableTools: string[];
    protected bridge: OllamaMCPBridge;
    protected context: Map<string, AgentContext> = new Map();

    constructor(
        name: string,
        description: string,
        systemPrompt: string,
        availableTools: string[],
        bridge: OllamaMCPBridge
    ) {
        this.name = name;
        this.description = description;
        this.systemPrompt = systemPrompt;
        this.availableTools = availableTools;
        this.bridge = bridge;
    }
    /**
     * Main entry point for agent interaction
     */
    abstract processRequest(
        message: string,
        conversationId?: string,
        context?: Record<string, any>
    ): Promise<{
        response: string;
        toolsUsed: string[];
        context: AgentContext;
    }>;

    /**
     * Initialize or get conversation context
     */
    protected getOrCreateContext(conversationId: string = 'default'): AgentContext {
        if (!this.context.has(conversationId)) {
            this.context.set(conversationId, {
                conversationId,
                messages: [],
                metadata: {}
            });
        }
        return this.context.get(conversationId)!;
    }

    /**
     * Add message to conversation history
     */
    protected addMessage(
        conversationId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        toolsUsed?: string[]
    ): void {
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
    protected isToolAvailable(toolName: string): boolean {
        return this.availableTools.includes(toolName) || this.availableTools.includes('*');
    }

    /**
     * Execute a tool if available
     */
    protected async executeTool(toolName: string, args: any): Promise<string> {
        if (!this.isToolAvailable(toolName)) {
            throw new Error(`Tool ${toolName} is not available to agent ${this.name}`);
        }
        return await this.bridge.callTool(toolName, args);
    }

    /**
     * Create an enhanced prompt with context and agent personality
     */
    protected createEnhancedPrompt(
        userMessage: string,
        context: AgentContext,
        includeHistory: boolean = true
    ): string {
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
    getInfo(): { name: string; description: string; availableTools: string[] } {
        return {
            name: this.name,
            description: this.description,
            availableTools: this.availableTools
        };
    }

    /**
     * Clear conversation context
     */
    clearContext(conversationId: string = 'default'): void {
        this.context.delete(conversationId);
    }

    /**
     * Get conversation history
     */
    getConversationHistory(conversationId: string = 'default'): AgentMessage[] {
        const context = this.context.get(conversationId);
        return context ? [...context.messages] : [];
    }
}
