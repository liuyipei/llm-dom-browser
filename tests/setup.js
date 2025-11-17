// Global test setup
console.log('🧪 Starting test suite...\n');

// Expose console methods for test logging
global.testLog = console.log;
global.testError = console.error;
