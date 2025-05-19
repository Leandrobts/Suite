// js/dom_elements.mjs

// Cache elements to avoid repeated lookups if preferred, or just query on demand.
const elementsCache = {};

export function getElementById(id) {
    if (elementsCache[id]) {
        return elementsCache[id];
    }
    const element = document.getElementById(id);
    if (element) {
        elementsCache[id] = element;
    }
    return element;
}

// Specific element getters can be added for convenience
export const getOutputDivS1 = () => getElementById('output');
export const getXssTargetDiv = () => getElementById('xss-target-div');
export const getRunBtnS1 = () => getElementById('runBtnS1');

export const getOutputCanvasS2 = () => getElementById('output-canvas');
export const getInteractiveCanvasS2 = () => getElementById('interactive-canvas');
export const getCanvasCoordStatusS2 = () => getElementById('canvas-coord-status');
export const getRunBtnCanvasS2 = () => getElementById('runCanvasBtnS2');

export const getOutputAdvancedS3 = () => getElementById('output-advanced');
export const getRopGadgetsInput = () => getElementById('rop-gadgets-input');
export const getRopChainInput = () => getElementById('rop-chain-input');
export const getMemViewAddrInput = () => getElementById('mem-view-addr');
export const getMemViewSizeInput = () => getElementById('mem-view-size');
export const getRunBtnAdvancedS3 = () => getElementById('runAdvancedBtnS3');
export const getBuildRopChainBtn = () => getElementById('buildRopChainBtn');
export const getViewMemoryBtn = () => getElementById('viewMemoryBtn');


// Call this once in main.mjs if you want to pre-cache common elements
export function cacheCommonElements() {
    getOutputDivS1();
    getXssTargetDiv();
    // ... cache others if needed
}
