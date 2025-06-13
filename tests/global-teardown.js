/**
 * Global teardown for Jest tests
 * Ensures all resources are properly cleaned up
 */

export default async function globalTeardown() {
    console.log('🧹 Global teardown: Starting cleanup...');

    try {
        // Clear all timers
        const timerIds = global.__TIMER_IDS__ || [];
        timerIds.forEach(id => {
            try {
                clearTimeout(id);
                clearInterval(id);
            } catch (e) {
                // Ignore errors
            }
        });

        // Clear all active processes
        const processes = global.__ACTIVE_PROCESSES__ || [];
        processes.forEach(proc => {
            try {
                if (proc && !proc.killed) {
                    proc.kill('SIGTERM');
                    // Force kill after a short delay if needed
                    setTimeout(() => {
                        if (!proc.killed) {
                            proc.kill('SIGKILL');
                        }
                    }, 1000);
                }
            } catch (e) {
                // Ignore errors
            }
        });

        // Clean up any remaining resources
        if (global.gc) {
            global.gc();
        }

        // Force close any remaining handles
        await new Promise(resolve => {
            setTimeout(resolve, 100);
        });

        console.log('✅ Global teardown: Cleanup completed');

    } catch (error) {
        console.error('❌ Global teardown error:', error.message);
    }
}
