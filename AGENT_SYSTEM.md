# Agent System Documentation

## Overview

The Agent System introduces intelligent request routing and specialized processing to the MCP server. Instead of relying solely on tool selection, the system now routes requests to specialized agents that provide contextual, domain-specific responses.

## Architecture

```
User Request
     ↓
Agent Manager (Routing)
     ↓
┌─────────────┬─────────────┐
│ Weather     │   General   │
│ Agent       │   Agent     │
└─────────────┴─────────────┘
     ↓             ↓
 Specialized   Fallback MCP
 Processing    Processing
     ↓             ↓
Enhanced       Standard
Response       Response
```

## Core Components

### 1. BaseAgent (Abstract Class)

**File**: `src/agents/base-agent.ts`

**Purpose**: Provides common functionality for all agents

**Key Features**:
- Conversation context management
- Tool execution permissions
- Message history (20 message limit)
- Standardized agent interface

**Interface**:
```typescript
abstract class BaseAgent {
  abstract name: string;
  abstract description: string;
  abstract allowedTools: string[];
  
  abstract processRequest(
    message: string,
    conversationId?: string,
    context?: Record<string, any>
  ): Promise<{
    response: string;
    toolsUsed: string[];
    context: AgentContext;
  }>;
}
```

### 2. WeatherAgent

**File**: `src/agents/weather-agent.ts`

**Specialization**: Weather queries, forecasts, and climate information

**Features**:
- Intelligent parameter extraction (location, units, time)
- Contextual recommendations (clothing, activities)
- Multi-tool coordination (`weather_info` + `get_datetime`)
- Weather-specific conversation continuity

**Example Processing**:
```javascript
// Input: "What's the weather in Tokyo?"
// Processing:
1. Extracts location: "Tokyo"
2. Calls weather_info tool
3. Calls get_datetime for current time context
4. Generates enhanced response with recommendations

// Output: "Currently in Tokyo, it's 22°C (72°F) and partly cloudy. 
// Great weather for exploring! You might want to bring a light jacket 
// for evening. Would you like a forecast for tomorrow?"
```

**Enhanced Prompting**:
- Provides clothing recommendations based on weather
- Suggests activities suitable for current conditions
- Offers follow-up weather information options
- Maintains conversation context for related queries

### 3. AgentManager

**File**: `src/agents/agent-manager.ts`

**Purpose**: Intelligent request routing and agent coordination

**Key Features**:
- Confidence-based agent selection
- Keyword analysis for routing decisions
- Agent registry management
- Conversation history tracking
- Fallback to general processing

**Routing Algorithm**:
```typescript
// 1. Analyze request for keywords
const weatherKeywords = ['weather', 'temperature', 'rain', 'snow', 'forecast'];
const mathKeywords = ['calculate', 'math', 'equation', 'solve', 'compute'];

// 2. Calculate confidence scores
const weatherConfidence = analyzeKeywords(message, weatherKeywords);
const mathConfidence = analyzeKeywords(message, mathKeywords);

// 3. Select highest confidence agent (minimum 0.6)
if (weatherConfidence >= 0.6) return 'weather';
if (mathConfidence >= 0.6) return 'calculator';
return 'general'; // Fallback
```

**Conversation Management**:
- Tracks up to 20 messages per conversation
- Maintains separate contexts for each agent
- Automatic cleanup of old conversations
- Session-based conversation IDs

## Agent Development Guide

### Creating a New Agent

1. **Extend BaseAgent**:
```typescript
export class MathAgent extends BaseAgent {
  name = 'math';
  description = 'Specialized mathematical calculations and problem solving';
  allowedTools = ['calculator'];
  
  async processRequest(message: string, conversationId?: string) {
    // 1. Analyze mathematical request
    // 2. Extract parameters and operations
    // 3. Call calculator tool with enhanced context
    // 4. Provide educational explanations
    // 5. Suggest related calculations
  }
}
```

2. **Register with AgentManager**:
```typescript
// In agent-manager.ts
constructor(bridge: OllamaMCPBridge) {
  this.bridge = bridge;
  this.agents = new Map([
    ['weather', new WeatherAgent(bridge)],
    ['math', new MathAgent(bridge)], // Add new agent
  ]);
}
```

3. **Add Routing Keywords**:
```typescript
// In analyzeRequest method
case 'math':
  keywords = ['calculate', 'math', 'equation', 'solve', 'compute', 
             'algebra', 'geometry', 'statistics'];
  break;
```

### Best Practices

1. **Specialized Prompting**: Tailor responses to the domain
2. **Tool Coordination**: Use multiple tools when beneficial
3. **Context Awareness**: Maintain conversation continuity
4. **Enhanced Responses**: Provide recommendations and follow-ups
5. **Error Handling**: Graceful degradation to general processing

## API Integration

### Enhanced Endpoints

#### Intelligent Agent Routing
```bash
POST /api/chat/agent
Content-Type: application/json

{
  "message": "What's the weather in Paris?",
  "conversationId": "session-123",
  "agent": "weather"  // Optional: explicit agent selection
}
```

**Response**:
```json
{
  "success": true,
  "response": "Enhanced weather response with recommendations",
  "agentUsed": "weather",
  "toolsUsed": ["weather_info", "get_datetime"],
  "routing": {
    "agentName": "weather",
    "confidence": 0.9,
    "reason": "Message contains weather-related keywords"
  },
  "conversationId": "session-123",
  "context": {
    "messageCount": 2,
    "lastActivity": "2025-06-10T..."
  }
}
```

#### Direct Agent Communication
```bash
POST /api/agents/weather/chat
Content-Type: application/json

{
  "message": "Will it rain tomorrow?",
  "conversationId": "weather-session-456"
}
```

#### Agent Management
```bash
# List available agents
GET /api/agents

# Get conversation history
GET /api/agents/weather/history/session-123

# Clear conversation history
DELETE /api/agents/weather/history/session-123
```

## Configuration

### Agent Settings

Agents can be configured in the constructor or through environment variables:

```typescript
// Example: WeatherAgent configuration
constructor(bridge: OllamaMCPBridge) {
  super(bridge);
  this.maxMessages = process.env.WEATHER_AGENT_MAX_MESSAGES || 20;
  this.defaultUnits = process.env.WEATHER_DEFAULT_UNITS || 'metric';
}
```

### Routing Sensitivity

Adjust confidence thresholds for routing:

```typescript
// In AgentManager
private readonly CONFIDENCE_THRESHOLD = 0.6; // Minimum for agent selection
private readonly WEATHER_BOOST = 0.1;        // Boost for weather-related terms
```

## Performance Considerations

1. **Context Limits**: 20 messages per conversation to manage memory
2. **Agent Selection**: Fast keyword-based routing (< 1ms)
3. **Tool Coordination**: Parallel tool calls when possible
4. **Conversation Cleanup**: Automatic cleanup of inactive conversations

## Monitoring and Debugging

### Agent Metrics

The system provides metrics for:
- Agent selection frequency
- Confidence score distributions
- Tool usage patterns
- Conversation length statistics

### Debug Information

Enable debug logging:
```bash
export DEBUG=agent:*
npm run agent-web-api
```

### Health Monitoring

```bash
GET /api/health
```

Returns agent status and health information:
```json
{
  "agents": {
    "weather": {
      "status": "active",
      "conversations": 5,
      "totalMessages": 23
    }
  }
}
```

## Testing

### Unit Tests
```bash
npm run test-agent-integration
```

### Manual Testing
```bash
# Weather agent test
curl -X POST http://localhost:3002/api/agents/weather/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What should I wear in London today?"}'

# Routing test
curl -X POST http://localhost:3002/api/chat/agent \
  -H "Content-Type: application/json" \
  -d '{"message": "Calculate the square root of 144"}'
```

## Future Enhancements

1. **Additional Agents**: Math, Database, API, Code Generation
2. **Learning System**: Agent performance optimization based on usage
3. **Custom Agents**: User-defined agents with configuration
4. **Multi-Agent Coordination**: Agents working together on complex tasks
5. **Agent Plugins**: Extensible agent system with plugin architecture

## Troubleshooting

### Common Issues

1. **Agent Not Selected**: Check keyword matching and confidence thresholds
2. **Tool Access Denied**: Verify agent's `allowedTools` configuration
3. **Context Lost**: Check conversation ID consistency
4. **Performance Issues**: Monitor conversation cleanup and context limits

### Debug Commands

```bash
# Check agent registration
GET /api/agents

# Test specific agent routing
POST /api/chat/agent
{"message": "debug:route weather test"}

# View conversation context
GET /api/agents/weather/history/debug-session
```
