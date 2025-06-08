# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

This is an MCP (Model Context Protocol) server project written in TypeScript. 

## Key Points:
- This server connects to external services and provides tools to language models
- Uses the @modelcontextprotocol/sdk for MCP functionality
- Implements tools that can be called by LLM clients like Claude Desktop
- Follows MCP protocol specifications for tool execution and resource handling

## Resources:
You can find more info and examples at https://modelcontextprotocol.io/llms-full.txt

## SDK Reference:
https://github.com/modelcontextprotocol/create-python-server

When working with this codebase, prioritize:
1. Proper TypeScript typing
2. Error handling for external service calls
3. MCP protocol compliance
4. Clear tool descriptions for LLM understanding
