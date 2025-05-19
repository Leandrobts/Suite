// js/logger.mjs

const MAX_LOG_LENGTH = 600000;
const TRUNCATE_KEEP_LENGTH = 300000;

const VALID_LOG_TYPES = ['info', 'test', 'subtest', 'vuln', 'good', 'warn', 'error', 'leak', 'ptr', 'critical', 'escalation', 'tool'];

/**
 * Logs a message to the specified output div.
 * @param {string} divId - The ID of the div to log to ('output', 'output-canvas', 'output-advanced').
 * @param {string} message - The message to log.
 * @param {string} [type='info'] - The type of log message.
 * @param {string} [funcName=''] - The name of the function logging the message.
 */
export function log(divId, message, type = 'info', funcName = '') {
    const outputDiv = document.getElementById(divId);
    if (!outputDiv) {
        console.error(`Logger: Output div with ID "${divId}" not found.`);
        return;
    }

    try {
        const timestamp = `[${new Date().toLocaleTimeString()}]`;
        const prefix = funcName ? `[${funcName}] ` : '';
        const sanitizedMessage = String(message).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const logClass = VALID_LOG_TYPES.includes(type) ? type : 'info';

        if (outputDiv.innerHTML.length > MAX_LOG_LENGTH) {
            outputDiv.innerHTML = outputDiv.innerHTML.substring(outputDiv.innerHTML.length - TRUNCATE_KEEP_LENGTH);
            outputDiv.innerHTML = `<span class="log-info">[Log Truncado...]</span>\n` + outputDiv.innerHTML;
        }

        outputDiv.innerHTML += `<span class="log-${logClass}">${timestamp} ${prefix}${sanitizedMessage}\n</span>`;
        outputDiv.scrollTop = outputDiv.scrollHeight;
    } catch (e) {
        console.error(`Error in logger for ${divId}:`, e);
        if (outputDiv) {
            outputDiv.innerHTML += `<span class="log-error">[${new Date().toLocaleTimeString()}] [LOGGING ERROR] ${String(e)}\n</span>`;
        }
    }
}

// Convenience loggers for each script section
export const logS1 = (message, type = 'info', funcName = '') => log('output', message, type, funcName);
export const logS2 = (message, type = 'info', funcName = '') => log('output-canvas', message, type, funcName);
export const logS3 = (message, type = 'info', funcName = '') => log('output-advanced', message, type, funcName);
