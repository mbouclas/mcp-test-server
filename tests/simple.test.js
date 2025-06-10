// Simple JavaScript test to verify Jest is working
describe('Simple Jest Test', () => {
    test('should work with basic JavaScript', () => {
        expect(1 + 1).toBe(2);
    });

    test('should handle basic functions', () => {
        const add = (a, b) => a + b;
        expect(add(2, 3)).toBe(5);
    });
});
