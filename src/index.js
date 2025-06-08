#!/usr/bin/env node
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var zod_1 = require("zod");
/**
 * Custom MCP Server that connects to your services
 * This server provides tools that can be used by Ollama or other MCP clients
 */
// Define the server configuration
var server = new mcp_js_1.McpServer({
    name: "custom-service-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
// Example: Helper function for making HTTP requests to your service
function makeServiceRequest(url_1) {
    return __awaiter(this, arguments, void 0, function (url, options) {
        var response, error_1;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, fetch(url, __assign({ headers: __assign({ "Content-Type": "application/json", "User-Agent": "MCP-Custom-Service/1.0" }, options.headers) }, options))];
                case 1:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("HTTP error! status: ".concat(response.status));
                    }
                    return [4 /*yield*/, response.json()];
                case 2: return [2 /*return*/, (_a.sent())];
                case 3:
                    error_1 = _a.sent();
                    console.error("Error making service request:", error_1);
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Tool 1: Query your custom service
server.tool("query_custom_service", "Query your custom service with parameters", {
    endpoint: zod_1.z.string().describe("The API endpoint to call"),
    method: zod_1.z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET").describe("HTTP method to use"),
    data: zod_1.z.object({}).optional().describe("Data to send with the request (for POST/PUT)"),
    headers: zod_1.z.record(zod_1.z.string()).optional().describe("Additional headers to include"),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var baseUrl, url, options, result;
    var endpoint = _b.endpoint, method = _b.method, data = _b.data, headers = _b.headers;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
                url = "".concat(baseUrl).concat(endpoint);
                options = {
                    method: method,
                    headers: headers || {},
                };
                if (data && (method === "POST" || method === "PUT")) {
                    options.body = JSON.stringify(data);
                }
                return [4 /*yield*/, makeServiceRequest(url, options)];
            case 1:
                result = _c.sent();
                if (!result) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to connect to service at ".concat(url),
                                },
                            ],
                        }];
                }
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Service Response:\nStatus: ".concat(result.status, "\nData: ").concat(JSON.stringify(result.data, null, 2), "\n").concat(result.message ? "Message: ".concat(result.message) : ''),
                            },
                        ],
                    }];
        }
    });
}); });
// Tool 2: Execute database queries (if your service includes a database)
server.tool("execute_query", "Execute a database query through your service", {
    query: zod_1.z.string().describe("SQL query to execute"),
    parameters: zod_1.z.array(zod_1.z.any()).optional().describe("Query parameters"),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var baseUrl, url, requestData, result, formattedResult;
    var query = _b.query, parameters = _b.parameters;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
                url = "".concat(baseUrl, "/api/query");
                requestData = {
                    query: query,
                    parameters: parameters || [],
                };
                return [4 /*yield*/, makeServiceRequest(url, {
                        method: "POST",
                        body: JSON.stringify(requestData),
                    })];
            case 1:
                result = _c.sent();
                if (!result) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to execute database query",
                                },
                            ],
                        }];
                }
                formattedResult = "Query Results:\nQuery: ".concat(result.query, "\nRow Count: ").concat(result.count, "\nData:\n").concat(JSON.stringify(result.rows, null, 2));
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: formattedResult,
                            },
                        ],
                    }];
        }
    });
}); });
// Tool 3: Get service status and health
server.tool("service_health", "Check the health and status of your custom service", {}, function () { return __awaiter(void 0, void 0, void 0, function () {
    var baseUrl, url, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
                url = "".concat(baseUrl, "/health");
                return [4 /*yield*/, makeServiceRequest(url)];
            case 1:
                result = _a.sent();
                if (!result) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Service is not responding or unreachable",
                                },
                            ],
                        }];
                }
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "Service Health:\nStatus: ".concat(result.status, "\nUptime: ").concat(result.uptime, "s\nVersion: ").concat(result.version),
                            },
                        ],
                    }];
        }
    });
}); });
// Tool 4: File operations (if your service handles files)
server.tool("file_operations", "Perform file operations through your service", {
    operation: zod_1.z.enum(["list", "read", "write", "delete"]).describe("File operation to perform"),
    path: zod_1.z.string().describe("File path"),
    content: zod_1.z.string().optional().describe("Content for write operations"),
}, function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
    var baseUrl, url, requestData, result;
    var operation = _b.operation, path = _b.path, content = _b.content;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                baseUrl = process.env.SERVICE_BASE_URL || "http://localhost:3000";
                url = "".concat(baseUrl, "/api/files");
                requestData = {
                    operation: operation,
                    path: path,
                    content: content,
                };
                return [4 /*yield*/, makeServiceRequest(url, {
                        method: "POST",
                        body: JSON.stringify(requestData),
                    })];
            case 1:
                result = _c.sent();
                if (!result) {
                    return [2 /*return*/, {
                            content: [
                                {
                                    type: "text",
                                    text: "Failed to perform file operation: ".concat(operation, " on ").concat(path),
                                },
                            ],
                        }];
                }
                return [2 /*return*/, {
                        content: [
                            {
                                type: "text",
                                text: "File Operation Result:\nOperation: ".concat(operation, "\nPath: ").concat(path, "\nResult: ").concat(JSON.stringify(result, null, 2)),
                            },
                        ],
                    }];
        }
    });
}); });
// Main function to run the server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error("Custom Service MCP Server running on stdio");
                    return [2 /*return*/];
            }
        });
    });
}
// Error handling
main().catch(function (error) {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
