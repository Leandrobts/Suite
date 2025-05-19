// js/script2Tests.mjs
import { logS2 } from './logger.mjs';
import { PAUSE_FUNC, toHex } from './utils.mjs';
import { setButtonDisabled, clearOutput, getEl } from './domUtils.mjs';
import { JSC_OFFSETS } from './config.mjs'; // Exemplo, se S2 usar offsets diretamente
import { getLeakedValueS1 } from './script1Tests.mjs'; // Para obter o leak de S1

const SHORT_PAUSE_CANVAS_S2 = 50;
// ... (outras constantes e variáveis de estado do S2)

// Exemplo de como usar o valor vazado de S1:
// const leakedS1 = getLeakedValueS1();
// if (leakedS1) {
// logS2(`Leak de S1: H=${toHex(leakedS1.high)} L=${toHex(leakedS1.low)}`, 'leak');
// }

// ... (Todas as funções de teste do S2: testWebGLCheckS2, testAdvancedPPS2, etc.)
// ... (Lógica de desenho do canvas e listeners)

export async function runCanvasTest() {
    const FNAME = 'runCanvasTest';
    setButtonDisabled('runCanvasBtn', true); // Assumindo ID do botão
    clearOutput('output-canvas');
    logS2("==== INICIANDO Script 2 (Canvas e APIs Avançadas Modular) ====", 'test', FNAME);

    const leakedS1 = getLeakedValueS1();
    if (leakedS1) {
        const ls = leakedS1.type === 'U64' ? `L(S1):U64 H=${toHex(leakedS1.high)} L=${toHex(leakedS1.low)}@${leakedS1.offset}` : `L(S1):U32 ${toHex(leakedS1.low)}@${leakedS1.offset}`;
        logS2(`-> Leak S1 encontrado: ${ls}`, 'leak', 'runCanvasTestSequenceS2');
        // currentLeakDataS2 = { text: ls, color: "#FF9800" }; // Atualizar estado para desenho no canvas
    } else {
        logS2(`-> Leak S1 (leakedValueFromOOB_S1) nulo/não encontrado.`, 'warn', 'runCanvasTestSequenceS2');
        // currentLeakDataS2 = { text: "L(S1):NULO", color: "#FFC107" };
    }
    // redrawAllS2(); // Chamar função de redesenho do canvas

    // Chamar as funções de teste do S2 em sequência
    // await testWebGLCheckS2(); await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
    // ...

    logS2("\n==== Script 2 CONCLUÍDO (Modular) ====", 'test', FNAME);
    setButtonDisabled('runCanvasBtn', false);
}
