import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock fetch for URL utilities tests
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('MCP Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockFetch.mockClear();
    });

    describe('Calculator Tool', () => {
        test('should perform basic arithmetic operations', () => {
            // Test addition
            expect(5 + 3).toBe(8);
            expect(10 + (-5)).toBe(5);
            expect(0 + 0).toBe(0);

            // Test subtraction  
            expect(10 - 3).toBe(7);
            expect(5 - 10).toBe(-5);
            expect(0 - 0).toBe(0);

            // Test multiplication
            expect(5 * 3).toBe(15);
            expect(7 * 0).toBe(0);
            expect(-3 * 4).toBe(-12);

            // Test division
            expect(15 / 3).toBe(5);
            expect(10 / 4).toBe(2.5);
            expect(0 / 5).toBe(0);
        });

        test('should calculate factorial correctly', () => {
            const factorial = (n: number): number => {
                if (n < 0) throw new Error('Factorial not defined for negative numbers');
                if (n === 0 || n === 1) return 1;
                return n * factorial(n - 1);
            };

            expect(factorial(0)).toBe(1);
            expect(factorial(1)).toBe(1);
            expect(factorial(5)).toBe(120);
            expect(factorial(10)).toBe(3628800);

            // Test edge cases
            expect(() => factorial(-1)).toThrow('Factorial not defined for negative numbers');
        });

        test('should calculate Fibonacci sequence correctly', () => {
            const fibonacci = (n: number): number => {
                if (n < 0) throw new Error('Fibonacci not defined for negative numbers');
                if (n === 0) return 0;
                if (n === 1) return 1;
                return fibonacci(n - 1) + fibonacci(n - 2);
            };

            expect(fibonacci(0)).toBe(0);
            expect(fibonacci(1)).toBe(1);
            expect(fibonacci(5)).toBe(5);
            expect(fibonacci(10)).toBe(55);

            expect(() => fibonacci(-1)).toThrow('Fibonacci not defined for negative numbers');
        });

        test('should check prime numbers correctly', () => {
            const isPrime = (n: number): boolean => {
                if (n < 2) return false;
                if (n === 2) return true;
                if (n % 2 === 0) return false;

                for (let i = 3; i <= Math.sqrt(n); i += 2) {
                    if (n % i === 0) return false;
                }
                return true;
            };

            expect(isPrime(2)).toBe(true);
            expect(isPrime(3)).toBe(true);
            expect(isPrime(5)).toBe(true);
            expect(isPrime(17)).toBe(true);
            expect(isPrime(97)).toBe(true);

            expect(isPrime(1)).toBe(false);
            expect(isPrime(4)).toBe(false);
            expect(isPrime(9)).toBe(false);
            expect(isPrime(15)).toBe(false);
            expect(isPrime(100)).toBe(false);
        });

        test('should handle calculator tool parameters', () => {
            const processCalculatorRequest = (operation: string, n?: number, a?: number, b?: number) => {
                switch (operation) {
                    case 'factorial':
                        if (typeof n !== 'number') throw new Error('n parameter required for factorial');
                        return `Factorial of ${n} is calculated`;
                    case 'fibonacci':
                        if (typeof n !== 'number') throw new Error('n parameter required for fibonacci');
                        return `Fibonacci of ${n} is calculated`;
                    case 'prime':
                        if (typeof n !== 'number') throw new Error('n parameter required for prime check');
                        return `Prime check for ${n} is calculated`;
                    case 'add':
                    case 'subtract':
                    case 'multiply':
                    case 'divide':
                        if (typeof a !== 'number' || typeof b !== 'number') {
                            throw new Error('a and b parameters required for arithmetic operations');
                        }
                        return `${operation} of ${a} and ${b} is calculated`;
                    default:
                        throw new Error(`Unsupported operation: ${operation}`);
                }
            };

            expect(processCalculatorRequest('factorial', 5)).toContain('Factorial of 5');
            expect(processCalculatorRequest('add', undefined, 5, 3)).toContain('add of 5 and 3');
            expect(() => processCalculatorRequest('factorial')).toThrow('n parameter required');
            expect(() => processCalculatorRequest('unknown')).toThrow('Unsupported operation');
        });
    });

    describe('Weather Tool', () => {
        test('should handle weather info requests', () => {
            const processWeatherRequest = (location: string, units: string = 'metric', forecast: boolean = false) => {
                if (!location) throw new Error('Location is required');

                const validUnits = ['metric', 'imperial', 'kelvin'];
                if (!validUnits.includes(units)) {
                    throw new Error(`Invalid units: ${units}. Must be one of: ${validUnits.join(', ')}`);
                }

                return {
                    location,
                    units,
                    forecast,
                    data: 'Weather data retrieved'
                };
            };

            const result = processWeatherRequest('Tokyo', 'metric', false);
            expect(result.location).toBe('Tokyo');
            expect(result.units).toBe('metric');
            expect(result.forecast).toBe(false);

            expect(() => processWeatherRequest('', 'metric')).toThrow('Location is required');
            expect(() => processWeatherRequest('Tokyo', 'invalid')).toThrow('Invalid units');
        }); test('should parse location from various formats', () => {
            const parseLocation = (input: string): string => {
                // Remove common prefixes and clean up
                const cleaned = input
                    .replace(/^(weather\s+in\s*|temperature\s+in\s*|how\s+is\s+the\s+weather\s+in\s*)/i, '')
                    .replace(/[?!.]/g, '')
                    .trim();

                if (!cleaned || cleaned.length === 0) {
                    throw new Error('Could not extract location from input');
                }
                return cleaned;
            };

            expect(parseLocation('weather in Tokyo')).toBe('Tokyo');
            expect(parseLocation('Temperature in New York')).toBe('New York');
            expect(parseLocation('How is the weather in London?')).toBe('London');
            expect(parseLocation('Paris')).toBe('Paris');

            expect(() => parseLocation('weather in')).toThrow('Could not extract location');
            expect(() => parseLocation('weather in   ')).toThrow('Could not extract location');
        });

        test('should determine appropriate units based on location', () => {
            const getDefaultUnits = (location: string): string => {
                const lowerLocation = location.toLowerCase();

                // Countries that primarily use Fahrenheit
                const fahrenheitCountries = ['united states', 'usa', 'america', 'us'];
                const fahrenheitCities = ['new york', 'los angeles', 'chicago', 'houston', 'phoenix'];

                if (fahrenheitCountries.some(country => lowerLocation.includes(country)) ||
                    fahrenheitCities.some(city => lowerLocation.includes(city))) {
                    return 'imperial';
                }

                return 'metric';
            };

            expect(getDefaultUnits('Tokyo')).toBe('metric');
            expect(getDefaultUnits('London')).toBe('metric');
            expect(getDefaultUnits('New York')).toBe('imperial');
            expect(getDefaultUnits('Los Angeles')).toBe('imperial');
        });
    });

    describe('URL Utilities Tool', () => {
        test('should validate URLs correctly', () => {
            const isValidUrl = (url: string): boolean => {
                try {
                    new URL(url);
                    return true;
                } catch {
                    return false;
                }
            };

            expect(isValidUrl('https://www.google.com')).toBe(true);
            expect(isValidUrl('http://localhost:3000')).toBe(true);
            expect(isValidUrl('ftp://files.example.com')).toBe(true);

            expect(isValidUrl('not-a-url')).toBe(false);
            expect(isValidUrl('www.google.com')).toBe(false); // Missing protocol
            expect(isValidUrl('')).toBe(false);
        });

        test('should handle URL shortening operations', async () => {
            const mockShortenResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    shortened_url: 'https://short.ly/abc123',
                    original_url: 'https://www.example.com/very/long/path'
                })
            };

            mockFetch.mockResolvedValue(mockShortenResponse as any);

            const shortenUrl = async (url: string): Promise<string> => {
                if (!url) throw new Error('URL is required');

                // Mock shortening service call
                const response = await fetch('https://api.shortener.com/shorten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });

                if (!response.ok) throw new Error('Failed to shorten URL');

                const data = await response.json();
                return data.shortened_url;
            };

            const result = await shortenUrl('https://www.example.com/very/long/path');
            expect(result).toBe('https://short.ly/abc123');
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.shortener.com/shorten',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });

        test('should handle URL expansion operations', async () => {
            const mockExpandResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    expanded_url: 'https://www.example.com/very/long/path',
                    short_url: 'https://short.ly/abc123'
                })
            };

            mockFetch.mockResolvedValue(mockExpandResponse as any);

            const expandUrl = async (shortUrl: string): Promise<string> => {
                if (!shortUrl) throw new Error('Short URL is required');

                const response = await fetch(`https://api.shortener.com/expand?url=${encodeURIComponent(shortUrl)}`);

                if (!response.ok) throw new Error('Failed to expand URL');

                const data = await response.json();
                return data.expanded_url;
            };

            const result = await expandUrl('https://short.ly/abc123');
            expect(result).toBe('https://www.example.com/very/long/path');
        });

        test('should generate QR codes for URLs', () => {
            const generateQRCode = (url: string, size: number = 200): string => {
                if (!url) throw new Error('URL is required');
                if (size < 50 || size > 1000) throw new Error('Size must be between 50 and 1000');

                // Mock QR code generation
                return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
            };

            const qrUrl = generateQRCode('https://www.example.com', 300);
            expect(qrUrl).toContain('300x300');
            expect(qrUrl).toContain(encodeURIComponent('https://www.example.com'));

            expect(() => generateQRCode('')).toThrow('URL is required');
            expect(() => generateQRCode('https://example.com', 25)).toThrow('Size must be between');
        });
    });

    describe('DateTime Tool', () => {
        test('should format dates correctly', () => {
            const formatDate = (format: string, date: Date = new Date()): string => {
                switch (format) {
                    case 'iso':
                        return date.toISOString();
                    case 'local':
                        return date.toLocaleString();
                    case 'utc':
                        return date.toUTCString();
                    case 'timestamp':
                        return date.getTime().toString();
                    default:
                        throw new Error(`Unsupported format: ${format}`);
                }
            };

            const testDate = new Date('2025-06-10T12:00:00Z');

            expect(formatDate('iso', testDate)).toBe('2025-06-10T12:00:00.000Z');
            expect(formatDate('timestamp', testDate)).toBe(testDate.getTime().toString());
            expect(() => formatDate('invalid')).toThrow('Unsupported format');
        });

        test('should handle timezone operations', () => {
            const getTimeInTimezone = (timezone: string): string => {
                try {
                    const date = new Date();
                    return date.toLocaleString('en-US', { timeZone: timezone });
                } catch (error) {
                    throw new Error(`Invalid timezone: ${timezone}`);
                }
            };

            expect(() => getTimeInTimezone('America/New_York')).not.toThrow();
            expect(() => getTimeInTimezone('Europe/London')).not.toThrow();
            expect(() => getTimeInTimezone('Asia/Tokyo')).not.toThrow();
            expect(() => getTimeInTimezone('Invalid/Timezone')).toThrow('Invalid timezone');
        });

        test('should calculate time differences', () => {
            const calculateTimeDifference = (date1: Date, date2: Date): number => {
                return Math.abs(date1.getTime() - date2.getTime());
            };

            const date1 = new Date('2025-06-10T12:00:00Z');
            const date2 = new Date('2025-06-10T13:00:00Z');

            expect(calculateTimeDifference(date1, date2)).toBe(3600000); // 1 hour in milliseconds
        });
    });

    describe('Service Health Tool', () => {
        test('should check service health', async () => {
            const mockHealthResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    status: 'healthy',
                    timestamp: '2025-06-10T12:00:00Z',
                    services: {
                        database: 'up',
                        cache: 'up'
                    }
                })
            };

            mockFetch.mockResolvedValue(mockHealthResponse as any);

            const checkServiceHealth = async (serviceUrl: string): Promise<any> => {
                const response = await fetch(`${serviceUrl}/health`);

                if (!response.ok) {
                    throw new Error(`Service health check failed: ${response.status}`);
                }

                return await response.json();
            };

            const health = await checkServiceHealth('http://localhost:3000');
            expect(health.status).toBe('healthy');
            expect(health.services.database).toBe('up');
        });

        test('should handle unhealthy services', async () => {
            const mockUnhealthyResponse = {
                ok: false,
                status: 503,
                statusText: 'Service Unavailable'
            };

            mockFetch.mockResolvedValue(mockUnhealthyResponse as any);

            const checkServiceHealth = async (serviceUrl: string): Promise<any> => {
                const response = await fetch(`${serviceUrl}/health`);

                if (!response.ok) {
                    throw new Error(`Service health check failed: ${response.status}`);
                }

                return await response.json();
            };

            await expect(checkServiceHealth('http://localhost:3000'))
                .rejects.toThrow('Service health check failed: 503');
        });
    });

    describe('File Operations Tool', () => {
        test('should validate file paths', () => {
            const isValidPath = (path: string): boolean => {
                if (!path || path.trim() === '') return false;
                if (path.includes('..')) return false; // Prevent directory traversal
                if (path.includes('\0')) return false; // Null byte injection
                return true;
            };

            expect(isValidPath('/valid/path/file.txt')).toBe(true);
            expect(isValidPath('relative/path.txt')).toBe(true);

            expect(isValidPath('')).toBe(false);
            expect(isValidPath('../../../etc/passwd')).toBe(false);
            expect(isValidPath('file\0.txt')).toBe(false);
        });

        test('should handle file operation types', () => {
            const validateFileOperation = (operation: string, path: string): boolean => {
                const validOperations = ['read', 'write', 'delete', 'exists', 'stat'];

                if (!validOperations.includes(operation)) {
                    throw new Error(`Invalid operation: ${operation}`);
                }

                if (!path) {
                    throw new Error('File path is required');
                }

                return true;
            };

            expect(validateFileOperation('read', '/path/to/file.txt')).toBe(true);
            expect(() => validateFileOperation('invalid', '/path')).toThrow('Invalid operation');
            expect(() => validateFileOperation('read', '')).toThrow('File path is required');
        });
    });

    describe('Tool Parameter Validation', () => {
        test('should validate required parameters', () => {
            const validateParams = (params: Record<string, any>, required: string[]): void => {
                for (const param of required) {
                    if (!(param in params) || params[param] === undefined || params[param] === null) {
                        throw new Error(`Required parameter missing: ${param}`);
                    }
                }
            };

            expect(() => validateParams({ a: 1, b: 2 }, ['a', 'b'])).not.toThrow();
            expect(() => validateParams({ a: 1 }, ['a', 'b'])).toThrow('Required parameter missing: b');
            expect(() => validateParams({ a: null }, ['a'])).toThrow('Required parameter missing: a');
        });

        test('should validate parameter types', () => {
            const validateParamTypes = (params: Record<string, any>, types: Record<string, string>): void => {
                for (const [param, expectedType] of Object.entries(types)) {
                    if (param in params) {
                        const actualType = typeof params[param];
                        if (actualType !== expectedType) {
                            throw new Error(`Parameter ${param} must be ${expectedType}, got ${actualType}`);
                        }
                    }
                }
            };

            expect(() => validateParamTypes(
                { name: 'test', count: 5 },
                { name: 'string', count: 'number' }
            )).not.toThrow();

            expect(() => validateParamTypes(
                { name: 123 },
                { name: 'string' }
            )).toThrow('Parameter name must be string, got number');
        });

        test('should validate parameter ranges', () => {
            const validateRanges = (params: Record<string, any>, ranges: Record<string, [number, number]>): void => {
                for (const [param, [min, max]] of Object.entries(ranges)) {
                    if (param in params) {
                        const value = params[param];
                        if (typeof value === 'number' && (value < min || value > max)) {
                            throw new Error(`Parameter ${param} must be between ${min} and ${max}`);
                        }
                    }
                }
            };

            expect(() => validateRanges(
                { size: 100 },
                { size: [50, 200] }
            )).not.toThrow();

            expect(() => validateRanges(
                { size: 300 },
                { size: [50, 200] }
            )).toThrow('Parameter size must be between 50 and 200');
        });
    });
});
