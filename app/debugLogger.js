/**
 * Listify – Community Edition
 */

let debuggingEnabled = false;

function toBoolean(value) {
    return value === true || value === 'true';
}

export function setDebuggingMode(enabled) {
    debuggingEnabled = toBoolean(enabled);
}

export const DebugLogger = {
    log(...args) {
        if (!debuggingEnabled) return;
        console.log(...args);
    },
    info(...args) {
        if (!debuggingEnabled) return;
        console.info(...args);
    },
    warn(...args) {
        if (!debuggingEnabled) return;
        console.warn(...args);
    },
    error(...args) {
        if (!debuggingEnabled) return;
        console.error(...args);
    },
    debug(...args) {
        if (!debuggingEnabled) return;
        console.debug(...args);
    }
};
