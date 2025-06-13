import { describe, test, expect } from '@jest/globals';

// Simple integration test to verify the test runner works
describe('Integration Tests', () => {
    test('should pass a basic test', () => {
        expect(1 + 1).toBe(2);
    });

    test('should verify string operations', () => {
        expect('test').toBeDefined();
        expect('hello world').toContain('world');
    });

    test('should verify async operations', async () => {
        const result = await Promise.resolve('async test');
        expect(result).toBe('async test');
    });

    test('should verify array operations', () => {
        const arr = [1, 2, 3, 4, 5];
        expect(arr).toHaveLength(5);
        expect(arr.filter(x => x > 3)).toEqual([4, 5]);
    });

    test('should verify object operations', () => {
        const obj = { a: 1, b: 2, c: 3 };
        expect(Object.keys(obj)).toEqual(['a', 'b', 'c']);
        expect(obj.a + obj.b).toBe(3);
    });
});
