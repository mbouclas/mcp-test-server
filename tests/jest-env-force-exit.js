import { TestEnvironment } from 'jest-environment-node';

/**
 * Custom Jest Environment with aggressive resource cleanup
 */
export default class ForceExitEnvironment extends TestEnvironment {
    constructor(config, context) {
        super(config, context);

        // Track all resources for cleanup
        this.resources = {
            timers: new Set(),
            intervals: new Set(),
            processes: new Set(),
            eventListeners: new Set()
        };

        // Store original functions
        this.originals = {
            setTimeout: this.global.setTimeout,
            setInterval: this.global.setInterval,
            clearTimeout: this.global.clearTimeout,
            clearInterval: this.global.clearInterval,
            addEventListener: this.global.addEventListener,
            removeEventListener: this.global.removeEventListener
        };

        this.setupResourceTracking();
    }

    setupResourceTracking() {
        // Override timer functions to track them
        this.global.setTimeout = (callback, delay, ...args) => {
            const id = this.originals.setTimeout.call(this.global, callback, delay, ...args);
            this.resources.timers.add(id);
            return id;
        };

        this.global.setInterval = (callback, delay, ...args) => {
            const id = this.originals.setInterval.call(this.global, callback, delay, ...args);
            this.resources.intervals.add(id);
            return id;
        };

        this.global.clearTimeout = (id) => {
            this.resources.timers.delete(id);
            return this.originals.clearTimeout.call(this.global, id);
        };

        this.global.clearInterval = (id) => {
            this.resources.intervals.delete(id);
            return this.originals.clearInterval.call(this.global, id);
        };
    }

    async setup() {
        await super.setup();
        console.log('🛠️  ForceExitEnvironment: Setup complete');
    }

    async teardown() {
        console.log('🧹 ForceExitEnvironment: Starting aggressive cleanup...');

        try {
            // Clear all tracked timers
            for (const id of this.resources.timers) {
                try {
                    this.originals.clearTimeout.call(this.global, id);
                } catch (e) {
                    // Ignore errors
                }
            }
            this.resources.timers.clear();

            // Clear all tracked intervals
            for (const id of this.resources.intervals) {
                try {
                    this.originals.clearInterval.call(this.global, id);
                } catch (e) {
                    // Ignore errors
                }
            }
            this.resources.intervals.clear();

            // Force cleanup of any remaining handles
            if (this.global.gc) {
                this.global.gc();
            }

            // Give a moment for cleanup to complete
            await new Promise(resolve => {
                this.originals.setTimeout.call(this.global, resolve, 10);
            });

            console.log('✅ ForceExitEnvironment: Cleanup completed');

        } catch (error) {
            console.error('❌ ForceExitEnvironment: Cleanup error:', error.message);
        }

        await super.teardown();
    }

    getVmContext() {
        return super.getVmContext();
    }
}