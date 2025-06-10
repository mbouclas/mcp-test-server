import { BaseAgent } from './base-agent.js';
/**
 * Weather Agent - Specialized for weather-related queries and information
 * Uses weather_info tool and can provide location-based weather services
 */
export class WeatherAgent extends BaseAgent {
    constructor(bridge) {
        const systemPrompt = `You are a Weather Agent, specialized in providing accurate and helpful weather information.

Your capabilities include:
- Current weather conditions for any location
- Weather forecasts and predictions  
- Weather analysis and recommendations
- Travel weather advice
- Seasonal weather patterns
- Weather-related safety information

You have access to weather data through the weather_info tool. When users ask about weather:
1. Extract the location from their request
2. Determine if they want current conditions or forecast
3. Choose appropriate units (metric/imperial) based on location or user preference
4. Use the weather_info tool to get data
5. Provide clear, helpful responses with actionable information

Always be helpful, accurate, and provide context for weather information. If users don't specify a location, ask them to clarify. Be conversational and friendly while remaining professional.

Examples of what you can help with:
- "What's the weather like in Tokyo?"
- "Will it rain tomorrow in London?"
- "Should I bring a jacket to Paris this weekend?"
- "What's the temperature in New York in Fahrenheit?"

Remember to interpret the weather data and provide helpful advice based on conditions.`;
        super('WeatherAgent', 'Specialized agent for weather information, forecasts, and weather-related advice', systemPrompt, ['weather_info', 'get_datetime'], // Can also use datetime for weather timing
        bridge);
    }
    async processRequest(message, conversationId = 'default', context) {
        const agentContext = this.getOrCreateContext(conversationId);
        this.addMessage(conversationId, 'user', message);
        const toolsUsed = [];
        let toolResults = '';
        try {
            // Analyze the weather request and extract parameters
            const weatherParams = await this.analyzeWeatherRequest(message, agentContext);
            if (weatherParams.needsWeatherData) {
                console.log(`🌤️  WeatherAgent: Getting weather for ${weatherParams.location}`);
                // Get weather data
                const weatherResult = await this.executeTool('weather_info', {
                    location: weatherParams.location,
                    units: weatherParams.units,
                    forecast: weatherParams.forecast
                });
                toolsUsed.push('weather_info');
                toolResults += `Weather Data:\n${weatherResult}\n\n`;
                // If the request involves timing, also get current time
                if (weatherParams.needsTime) {
                    const timeResult = await this.executeTool('get_datetime', {
                        format: 'local',
                        timezone: weatherParams.timezone
                    });
                    toolsUsed.push('get_datetime');
                    toolResults += `Current Time Info:\n${timeResult}\n\n`;
                }
            }
            // Create enhanced prompt with weather context
            const enhancedPrompt = this.createWeatherPrompt(message, agentContext, toolResults);
            // Get response from Ollama
            const response = await this.bridge.chatWithOllama(enhancedPrompt);
            // Add assistant response to context
            this.addMessage(conversationId, 'assistant', response, toolsUsed);
            return {
                response,
                toolsUsed,
                context: agentContext
            };
        }
        catch (error) {
            console.error('WeatherAgent error:', error);
            const errorResponse = `I apologize, but I encountered an error while getting weather information: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again with a specific location.`;
            this.addMessage(conversationId, 'assistant', errorResponse, toolsUsed);
            return {
                response: errorResponse,
                toolsUsed,
                context: agentContext
            };
        }
    }
    /**
     * Analyze weather request to extract location, units, forecast needs, etc.
     */
    async analyzeWeatherRequest(message, context) {
        const lowerMessage = message.toLowerCase();
        // Check if weather data is needed
        const weatherKeywords = ['weather', 'temperature', 'rain', 'snow', 'sunny', 'cloudy', 'forecast', 'climate'];
        const needsWeatherData = weatherKeywords.some(keyword => lowerMessage.includes(keyword));
        if (!needsWeatherData) {
            return {
                needsWeatherData: false,
                location: '',
                units: 'metric',
                forecast: false,
                needsTime: false
            };
        }
        // Extract location (simple pattern matching)
        let location = 'New York'; // default
        const locationPatterns = [
            /(?:weather|temperature|forecast).*?(?:in|for|at)\s+([a-zA-Z\s,]+)(?:\?|$|\.)/i,
            /(?:in|for|at)\s+([a-zA-Z\s,]+).*?(?:weather|temperature|forecast)/i,
            /([a-zA-Z\s,]+)\s+(?:weather|temperature|forecast)/i
        ];
        for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                location = match[1].trim().replace(/\?|\.$/g, '');
                break;
            }
        }
        // Determine units
        let units = 'metric';
        if (lowerMessage.includes('fahrenheit') || lowerMessage.includes('°f') || lowerMessage.includes('imperial')) {
            units = 'imperial';
        }
        else if (lowerMessage.includes('kelvin')) {
            units = 'kelvin';
        }
        else if (lowerMessage.includes('celsius') || lowerMessage.includes('°c') || lowerMessage.includes('metric')) {
            units = 'metric';
        }
        else {
            // Auto-detect based on common locations
            const usLocations = ['usa', 'america', 'united states', 'new york', 'los angeles', 'chicago', 'miami', 'texas'];
            const isUSLocation = usLocations.some(usLoc => location.toLowerCase().includes(usLoc));
            if (isUSLocation)
                units = 'imperial';
        }
        // Check if forecast is needed
        const forecast = lowerMessage.includes('forecast') ||
            lowerMessage.includes('tomorrow') ||
            lowerMessage.includes('week') ||
            lowerMessage.includes('days') ||
            lowerMessage.includes('will');
        // Check if timing information is needed
        const needsTime = lowerMessage.includes('now') ||
            lowerMessage.includes('current') ||
            lowerMessage.includes('right now') ||
            lowerMessage.includes('today');
        return {
            needsWeatherData,
            location,
            units,
            forecast,
            needsTime,
            timezone: undefined // Could be enhanced to detect timezone from location
        };
    }
    /**
     * Create a specialized prompt for weather responses
     */
    createWeatherPrompt(userMessage, context, toolResults) {
        let prompt = this.systemPrompt + '\n\n';
        if (context.messages.length > 1) {
            prompt += 'Previous conversation:\n';
            context.messages.slice(-6, -1).forEach(msg => {
                prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
            });
            prompt += '\n';
        }
        if (toolResults) {
            prompt += `Weather Information Retrieved:\n${toolResults}\n`;
        }
        prompt += `User's Current Request: "${userMessage}"\n\n`;
        prompt += `Instructions:
1. Use the weather data provided to answer the user's question
2. Be conversational and helpful
3. Provide practical advice based on the weather conditions
4. If it's mock data, you can mention that but still provide useful insights
5. Include relevant details like temperature, conditions, and any recommendations
6. If the user asks about specific times or forecasts, reference the forecast data
7. Format your response in a friendly, natural way

Please provide a helpful response based on the weather information:`;
        return prompt;
    }
    /**
     * Get weather for a specific location (convenience method)
     */
    async getWeather(location, options = {}) {
        const { units = 'metric', forecast = false, conversationId = 'direct' } = options;
        try {
            const result = await this.executeTool('weather_info', {
                location,
                units,
                forecast
            });
            // Track this as a conversation
            this.addMessage(conversationId, 'user', `Get weather for ${location}`);
            this.addMessage(conversationId, 'assistant', result, ['weather_info']);
            return result;
        }
        catch (error) {
            throw new Error(`Failed to get weather for ${location}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get weather recommendations for travel
     */
    async getTravelWeatherAdvice(location, conversationId = 'travel') {
        const message = `What's the weather like in ${location} and what should I pack for travel?`;
        return this.processRequest(message, conversationId);
    }
}
//# sourceMappingURL=weather-agent.js.map