// Custom Jest environment for better process cleanup on Windows
const { TestEnvironment } = require('jest-environment-node');

class WindowsCompatibleEnvironment extends TestEnvironment {
    constructor(config, context) {
        super(config, context);
        this.activeProcesses = new Set();
    }

    async setup() {
        await super.setup();

        // Override child_process methods to track processes
        const originalSpawn = this.global.require('child_process').spawn;
        const childProcessModule = this.global.require('child_process');

        const trackProcess = (process) => {
            if (process && typeof process.kill === 'function') {
                this.activeProcesses.add(process);
                process.on('exit', () => this.activeProcesses.delete(process));
                process.on('error', () => this.activeProcesses.delete(process));
            }
            return process;
        };

        childProcessModule.spawn = (...args) => trackProcess(originalSpawn(...args));
        childProcessModule.fork = (...args) => trackProcess(require('child_process').fork(...args));
        childProcessModule.exec = (...args) => trackProcess(require('child_process').exec(...args));
        childProcessModule.execFile = (...args) => trackProcess(require('child_process').execFile(...args));
    }

    async teardown() {
        // Kill all tracked processes before teardown
        for (const process of this.activeProcesses) {
            try {
                if (!process.killed && process.pid) {
                    // Windows-compatible process termination
                    if (process.platform === 'win32') {
                        try {
                            require('child_process').execSync(`taskkill /pid ${process.pid} /t /f`, { stdio: 'ignore' });
                        } catch (e) {
                            process.kill('SIGTERM');
                        }
                    } else {
                        process.kill('SIGTERM');
                        setTimeout(() => {
                            if (!process.killed) process.kill('SIGKILL');
                        }, 100);
                    }
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        }

        this.activeProcesses.clear();

        // Force garbage collection
        if (this.global.gc) {
            this.global.gc();
        }

        await super.teardown();
    }
}

module.exports = WindowsCompatibleEnvironment;
