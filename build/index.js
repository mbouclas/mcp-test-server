#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
/**
 * Custom MCP Server that connects to your services
 * This server provides tools that can be used by Ollama or other MCP clients
 */
// Define the server configuration
const server = new McpServer({
    name: "custom-service-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Example: Helper function for making HTTP requests to your service
async function makeServiceRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "MCP-Custom-Service/1.0",
                ...options.headers,
            },
            ...options,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.error("Error making service request:", error);
        return null;
    }
}
/**
 * Tool Registration System for Easy Addition of New Tools
 */
// Tool: Get current date and time
server.tool("get_datetime", "Get the current date and time in various formats", {
    format: z.enum(["iso", "local", "utc", "timestamp"]).default("iso").describe("Date format to return"),
    timezone: z.string().optional().describe("Timezone (e.g., 'America/New_York', 'UTC')"),
}, async ({ format, timezone }) => {
    try {
        const now = new Date();
        let result = "";
        switch (format) {
            case "iso":
                result = timezone ?
                    new Date(now.toLocaleString("en-US", { timeZone: timezone })).toISOString() :
                    now.toISOString();
                break;
            case "local":
                result = timezone ?
                    now.toLocaleString("en-US", { timeZone: timezone }) :
                    now.toLocaleString();
                break;
            case "utc":
                result = now.toUTCString();
                break;
            case "timestamp":
                result = now.getTime().toString();
                break;
            default:
                result = now.toISOString();
        }
        const responseText = timezone ?
            `Current date and time (${timezone}): ${result}` :
            `Current date and time: ${result}`;
        return {
            content: [
                {
                    type: "text",
                    text: responseText,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error getting date/time: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
// Tool: Calculator for mathematical operations
server.tool("calculator", "Perform mathematical calculations and operations", {
    expression: z.string().describe("Mathematical expression to evaluate (e.g., '2 + 3 * 4')"),
    operation: z.enum(["evaluate", "factorial", "fibonacci", "prime_check"]).default("evaluate").describe("Type of mathematical operation"),
    number: z.number().optional().describe("Number for specific operations like factorial, fibonacci, or prime check"),
}, async ({ expression, operation, number }) => {
    try {
        let result;
        switch (operation) {
            case "evaluate":
                // Safe evaluation of mathematical expressions
                const sanitizedExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
                if (sanitizedExpression !== expression) {
                    throw new Error("Invalid characters in expression. Only numbers, operators, and parentheses are allowed.");
                }
                result = Function(`"use strict"; return (${sanitizedExpression})`)();
                break;
            case "factorial":
                if (!number || number < 0 || !Number.isInteger(number)) {
                    throw new Error("Factorial requires a non-negative integer");
                }
                result = number === 0 ? 1 : Array.from({ length: number }, (_, i) => i + 1).reduce((acc, val) => acc * val, 1);
                break;
            case "fibonacci":
                if (!number || number < 0 || !Number.isInteger(number)) {
                    throw new Error("Fibonacci requires a non-negative integer");
                }
                if (number <= 1)
                    result = number;
                else {
                    let a = 0, b = 1;
                    for (let i = 2; i <= number; i++) {
                        [a, b] = [b, a + b];
                    }
                    result = b;
                }
                break;
            case "prime_check":
                if (!number || number < 2 || !Number.isInteger(number)) {
                    result = false;
                }
                else {
                    result = number === 2 || (number % 2 !== 0 && Array.from({ length: Math.sqrt(number) - 1 }, (_, i) => i + 3).every(i => number % i !== 0));
                }
                break;
            default:
                throw new Error("Invalid operation");
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Calculation Result:\nOperation: ${operation}\n${operation === 'evaluate' ? `Expression: ${expression}` : `Number: ${number}`}\nResult: ${result}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Calculation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
// Tool: Weather information (mock implementation)
server.tool("weather_info", "Get weather information for a location", {
    location: z.string().describe("City name or coordinates"),
    units: z.enum(["metric", "imperial", "kelvin"]).default("metric").describe("Temperature units"),
    forecast: z.boolean().default(false).describe("Whether to include forecast data"),
}, async ({ location, units, forecast }) => {
    try {
        // Mock weather data - replace with actual weather API call
        const mockWeatherData = {
            location: location,
            current: {
                temperature: units === "metric" ? 22 : units === "imperial" ? 72 : 295,
                humidity: 65,
                windSpeed: units === "metric" ? 15 : 9.3,
                description: "Partly cloudy",
                pressure: 1013.2
            },
            forecast: forecast ? [
                { day: "Tomorrow", high: units === "metric" ? 25 : 77, low: units === "metric" ? 18 : 64, condition: "Sunny" },
                { day: "Day after", high: units === "metric" ? 23 : 73, low: units === "metric" ? 16 : 61, condition: "Rainy" }
            ] : null
        };
        const tempUnit = units === "metric" ? "°C" : units === "imperial" ? "°F" : "K";
        const windUnit = units === "metric" ? "km/h" : "mph";
        let response = `Weather for ${location}:\nCurrent Conditions:\n- Temperature: ${mockWeatherData.current.temperature}${tempUnit}\n- Humidity: ${mockWeatherData.current.humidity}%\n- Wind Speed: ${mockWeatherData.current.windSpeed} ${windUnit}\n- Conditions: ${mockWeatherData.current.description}\n- Pressure: ${mockWeatherData.current.pressure} mb`;
        if (forecast && mockWeatherData.forecast) {
            response += "\n\nForecast:";
            mockWeatherData.forecast.forEach(day => {
                response += `\n- ${day.day}: High ${day.high}${tempUnit}, Low ${day.low}${tempUnit} - ${day.condition}`;
            });
        }
        response += "\n\n(Note: This is mock data. Replace with real weather API integration)";
        return {
            content: [
                {
                    type: "text",
                    text: response,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Weather Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
// Tool 1: Query your custom service
server.tool("query_custom_service", "Query your custom service with parameters", {
    endpoint: z.string().describe("The API endpoint to call"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP method to use"),
    data: z.object({}).optional().describe("Data to send with the request (for POST/PUT)"),
    headers: z.record(z.string()).optional().describe("Additional headers to include"),
}, async ({ endpoint, method, data, headers }) => {
    // Replace with your actual service URL
    const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}${endpoint}`;
    const options = {
        method,
        headers: headers || {},
    };
    if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(data);
    }
    const result = await makeServiceRequest(url, options);
    if (!result) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to connect to service at ${url}`,
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `Service Response:\nStatus: ${result.status}\nData: ${JSON.stringify(result.data, null, 2)}\n${result.message ? `Message: ${result.message}` : ''}`,
            },
        ],
    };
});
// Tool 2: Execute database queries (if your service includes a database)
server.tool("execute_query", "Execute a database query through your service", {
    query: z.string().describe("SQL query to execute"),
    parameters: z.array(z.any()).optional().describe("Query parameters"),
}, async ({ query, parameters }) => {
    const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/api/query`;
    const requestData = {
        query,
        parameters: parameters || [],
    };
    const result = await makeServiceRequest(url, {
        method: "POST",
        body: JSON.stringify(requestData),
    });
    if (!result) {
        return {
            content: [
                {
                    type: "text",
                    text: "Failed to execute database query",
                },
            ],
        };
    }
    const formattedResult = `Query Results:\nQuery: ${result.query}\nRow Count: ${result.count}\nData:\n${JSON.stringify(result.rows, null, 2)}`;
    return {
        content: [
            {
                type: "text",
                text: formattedResult,
            },
        ],
    };
});
// Tool 3: Get service status and health
server.tool("service_health", "Check the health and status of your custom service", {}, async () => {
    const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/health`;
    const result = await makeServiceRequest(url);
    if (!result) {
        return {
            content: [
                {
                    type: "text",
                    text: "Service is not responding or unreachable",
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `Service Health:\nStatus: ${result.status}\nUptime: ${result.uptime}s\nVersion: ${result.version}`,
            },
        ],
    };
});
// Tool 4: File operations (if your service handles files)
server.tool("file_operations", "Perform file operations through your service", {
    operation: z.enum(["list", "read", "write", "delete"]).describe("File operation to perform"),
    path: z.string().describe("File path"),
    content: z.string().optional().describe("Content for write operations"),
}, async ({ operation, path, content }) => {
    const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/api/files`;
    const requestData = {
        operation,
        path,
        content,
    };
    const result = await makeServiceRequest(url, {
        method: "POST",
        body: JSON.stringify(requestData),
    });
    if (!result) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to perform file operation: ${operation} on ${path}`,
                },
            ],
        };
    }
    return {
        content: [
            {
                type: "text",
                text: `File Operation Result:\nOperation: ${operation}\nPath: ${path}\nResult: ${JSON.stringify(result, null, 2)}`,
            },
        ],
    };
});
// Tool: URL utilities and operations
server.tool("url_utilities", "Perform URL operations like validation, shortening, QR code generation, and expansion", {
    operation: z.enum(["validate", "shorten", "expand", "qr_code", "analyze"]).describe("URL operation to perform"),
    url: z.string().describe("URL to process"),
    options: z.object({
        format: z.enum(["json", "text"]).optional().describe("Response format"),
        size: z.number().optional().describe("QR code size (for qr_code operation)")
    }).optional().describe("Additional options for the operation")
}, async ({ operation, url, options }) => {
    try {
        let result = "";
        switch (operation) {
            case "validate":
                try {
                    const urlObj = new URL(url);
                    const isValid = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
                    result = `URL Validation:\nURL: ${url}\nValid: ${isValid}\nProtocol: ${urlObj.protocol}\nHost: ${urlObj.host}\nPath: ${urlObj.pathname}`;
                }
                catch (error) {
                    result = `URL Validation:\nURL: ${url}\nValid: false\nReason: Invalid URL format`;
                }
                break;
            case "shorten":
                // Mock URL shortening - replace with actual service
                const shortCode = Math.random().toString(36).substring(2, 8);
                result = `URL Shortening:\nOriginal: ${url}\nShortened: https://short.ly/${shortCode}\n(Note: This is a mock shortened URL)`;
                break;
            case "expand":
                // Mock URL expansion - replace with actual service
                if (url.includes('short.ly') || url.includes('bit.ly') || url.includes('tinyurl')) {
                    result = `URL Expansion:\nShort URL: ${url}\nExpanded: https://www.example.com/full-url\n(Note: This is a mock expansion)`;
                }
                else {
                    result = `URL Expansion:\nURL: ${url}\nResult: This appears to be a full URL already`;
                }
                break;
            case "qr_code":
                const qrSize = options?.size || 200;
                result = `QR Code Generation:\nURL: ${url}\nQR Code: [Generated QR code would be here]\nSize: ${qrSize}x${qrSize}px\nFormat: PNG\n(Note: In a real implementation, this would return actual QR code data)`;
                break;
            case "analyze":
                try {
                    const urlObj = new URL(url);
                    result = `URL Analysis:\nURL: ${url}\nProtocol: ${urlObj.protocol}\nDomain: ${urlObj.hostname}\nPort: ${urlObj.port || 'default'}\nPath: ${urlObj.pathname}\nQuery Parameters: ${urlObj.search || 'none'}\nFragment: ${urlObj.hash || 'none'}\nIs HTTPS: ${urlObj.protocol === 'https:'}`;
                }
                catch (error) {
                    result = `URL Analysis failed: Invalid URL format`;
                }
                break;
            default:
                throw new Error(`Unsupported operation: ${operation}`);
        }
        return {
            content: [
                {
                    type: "text",
                    text: result,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `URL Utilities Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
            ],
        };
    }
});
// Main function to run the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Custom Service MCP Server running on stdio");
}
// Error handling
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map