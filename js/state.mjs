// js/state.mjs
export let leakedValueFromOOB_S1 = null;

export function setLeakedValueS1(value) {
    leakedValueFromOOB_S1 = value;
}

export function getLeakedValueS1() {
    return leakedValueFromOOB_S1;
}

// Add other shared states if needed
export let canvasContextS2 = null;
export function setCanvasContextS2(ctx) {
    canvasContextS2 = ctx;
}
export function getCanvasContextS2() {
    return canvasContextS2;
}
// ... and so on for other shared canvas related states like glContextS2, gpuDeviceS2 etc.
