// js/script2/s2_utils.mjs
import { logToDiv } from '../logger.mjs';
import { PAUSE as genericPause, toHex as genericToHex } from '../utils.mjs';

export const SHORT_PAUSE_S2 = 50;
export const MEDIUM_PAUSE_S2 = 500;

export const logS2 = (message, type = 'info', funcName = '') => {
    logToDiv('output-canvas', message, type, funcName);
};

export const PAUSE_S2 = (ms = SHORT_PAUSE_S2) => genericPause(ms);
export const toHexS2 = (val, bits = 32) => genericToHex(val, bits);

// Specific utilities for S2 (drawing, canvas interactions) would go here or in separate files.
// For this example, we'll keep it minimal.
