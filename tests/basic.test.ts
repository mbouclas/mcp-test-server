import { describe, test, expect } from '@jest/globals';

describe('Basic Test Suite', () => {
    test('should run basic tests', () => {
        expect(1 + 1).toBe(2);
    });

    test('should test string operations', () => {
        expect('hello world').toContain('world');
        expect('Hello'.toLowerCase()).toBe('hello');
    });

    test('should test array operations', () => {
        const arr = [1, 2, 3, 4, 5];
        expect(arr.length).toBe(5);
        expect(arr).toContain(3);
        expect(arr.filter(x => x > 3)).toEqual([4, 5]);
    });

    test('should test async operations', async () => {
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const start = Date.now();
        await delay(100);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    test('should test object operations', () => {
        const obj = { name: 'test', value: 42 };
        expect(obj).toHaveProperty('name');
        expect(obj.name).toBe('test');
        expect(Object.keys(obj)).toEqual(['name', 'value']);
    });
});
