// js/state.mjs
let leakedValueFromOOB_S1 = null;

export function getLeakedValueS1() {
    return leakedValueFromOOB_S1;
}

export function setLeakedValueS1(value) {
    console.log("[State] setLeakedValueS1 chamado com:", value); // Log para depuração
    leakedValueFromOOB_S1 = value;
}

export function resetS1LeakState() {
    console.log("[State] resetS1LeakState chamado."); // Log para depuração
    leakedValueFromOOB_S1 = null;
}
