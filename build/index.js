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

        return await response.json();
    } catch (error) {
        console.error("Error making service request:", error);
        return null;
    }
}

/**
 * Tool Registration System for Easy Addition of New Tools
 */

// Tool: Get current date and time
server.tool(
    "get_datetime",
    "Get the current date and time",
    {
        format: z.enum(["iso", "local", "unix"]).default("iso").describe("Format for the date/time output"),
    },
    async ({ format }) => {
        const now = new Date();
        let dateString;

        switch (format) {
            case "iso":
                dateString = now.toISOString();
                break;
            case "local":
                dateString = now.toLocaleString();
                break;
            case "unix":
                dateString = Math.floor(now.getTime() / 1000).toString();
                break;
            default:
                dateString = now.toISOString();
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Current date and time (${format}): ${dateString}`,
                },
            ],
        };
    }
);

// Tool: Calculator for mathematical operations
server.tool(
    "calculator",
    "Perform mathematical calculations and operations",
    {
        expression: z.string().optional().describe("Mathematical expression to evaluate (e.g., '2 + 3 * 4')"),
        operation: z.enum(["evaluate", "factorial", "fibonacci", "prime_check"]).default("evaluate").describe("Type of mathematical operation"),
        number: z.number().optional().describe("Number for specific operations like factorial, fibonacci, or prime check"),
    },
    async ({ expression, operation, number }) => {
        try {
            let result;

            switch (operation) {
                case "evaluate":
                    if (!expression) {
                        throw new Error("Expression is required for evaluate operation");
                    }
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
                    if (number <= 1) result = number;
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
                        throw new Error("Prime check requires an integer >= 2");
                    }
                    if (number === 2) result = true;
                    else if (number % 2 === 0) result = false;
                    else {
                        result = true;
                        for (let i = 3; i <= Math.sqrt(number); i += 2) {
                            if (number % i === 0) {
                                result = false;
                                break;
                            }
                        }
                    }
                    break;

                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `Calculation Result:\nOperation: ${operation}\nExpression: ${expression}\nNumber: ${number || 'N/A'}\nResult: ${result}`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Calculator Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    },
                ],
            };
        }
    }
);

// Tool: Weather Information
server.tool(
    "weather_info",
    "Get weather information for a location",
    {
        location: z.string().describe("Location to get weather for"),
        units: z.enum(["metric", "imperial", "kelvin"]).default("metric").describe("Temperature units"),
        forecast: z.boolean().default(false).describe("Include forecast information"),
    },
    async ({ location, units, forecast }) => {
        try {
            // Mock weather data (replace with real API integration)
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
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Weather Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    },
                ],
            };
        }
    }
);

// Tool: URL Utilities for URL operations
server.tool(
    "url_utilities",
    "Perform URL operations like shortening, validation, and QR code generation",
    {
        operation: z.enum(["shorten", "expand", "validate", "qr_code"]).describe("URL operation to perform"),
        url: z.string().describe("URL to process"),
        custom_alias: z.string().optional().describe("Custom alias for URL shortening"),
    },
    async ({ operation, url, custom_alias }) => {
        try {
            let result;

            switch (operation) {
                case "validate":
                    try {
                        new URL(url);
                        result = {
                            valid: true,
                            protocol: new URL(url).protocol,
                            hostname: new URL(url).hostname,
                            pathname: new URL(url).pathname
                        };
                    } catch {
                        result = { valid: false, error: "Invalid URL format" };
                    }
                    break;

                case "shorten":
                    // Mock URL shortening (replace with real service)
                    const shortId = custom_alias || Math.random().toString(36).substring(2, 8);
                    result = {
                        original_url: url,
                        shortened_url: `https://short.ly/${shortId}`,
                        custom_alias: custom_alias || null,
                        created_at: new Date().toISOString()
                    };
                    break;

                case "expand":
                    // Mock URL expansion (replace with real service)
                    if (url.includes("short.ly")) {
                        result = {
                            shortened_url: url,
                            original_url: "https://www.example.com/very/long/url/path/to/resource",
                            created_at: "2024-01-01T00:00:00.000Z"
                        };
                    } else {
                        result = { error: "URL does not appear to be a shortened URL" };
                    }
                    break;

                case "qr_code":
                    // Mock QR code generation
                    result = {
                        url: url,
                        qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
                        format: "PNG",
                        size: "200x200"
                    };
                    break;

                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: `URL ${operation} result:\n${JSON.stringify(result, null, 2)}\n\n(Note: This uses mock data. Replace with real URL service integrations)`,
                    },
                ],
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `URL Utilities Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    },
                ],
            };
        }
    }
);

// Tool: Query your custom service
server.tool(
    "query_custom_service",
    "Query your custom service with parameters",
    {
        endpoint: z.string().describe("API endpoint to call (e.g., '/api/users')"),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP method"),
        data: z.any().optional().describe("Request body data for POST/PUT requests"),
    },
    async ({ endpoint, method, data }) => {
        // Replace with your actual service URL
        const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
        const url = `${baseUrl}${endpoint}`;

        const options = {
            method,
            ...(data && { body: JSON.stringify(data) }),
        };

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
                    text: `Service Response:\n${JSON.stringify(result, null, 2)}`,
                },
            ],
        };
    }
);

// Tool: Execute Database Query
server.tool(
    "execute_query",
    "Execute a database query through your service",
    {
        query: z.string().describe("SQL query to execute"),
        parameters: z.array(z.any()).default([]).describe("Query parameters"),
    },
    async ({ query, parameters }) => {
        const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
        const url = `${baseUrl}/api/query`;

        const requestData = {
            query,
            parameters,
        };

        const result = await makeServiceRequest(url, {
            method: "POST",
            body: JSON.stringify(requestData),
        });

        return {
            content: [
                {
                    type: "text",
                    text: `Query Result:\n${JSON.stringify(result, null, 2)}`,
                },
            ],
        };
    }
);

// Tool: Service Health Check
server.tool(
    "service_health",
    "Check the health status of your service",
    {},
    async () => {
        const baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
        const url = `${baseUrl}/health`;

        const result = await makeServiceRequest(url);

        if (!result) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Service is not responding or is unhealthy",
                    },
                ],
            };
        }

        return {
            content: [
                {
                    type: "text",
                    text: `Service Health:\n${JSON.stringify(result, null, 2)}`,
                },
            ],
        };
    }
);

// Tool: File Operations
server.tool(
    "file_operations",
    "Perform file operations through your service",
    {
        operation: z.enum(["read", "write", "list", "delete"]).describe("File operation to perform"),
        path: z.string().describe("File or directory path"),
        content: z.string().optional().describe("Content for write operations"),
    },
    async ({ operation, path, content }) => {
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
    }
);

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