// js/script2/runCanvasTestSequence.mjs
import { logS2, PAUSE_S2, SHORT_PAUSE_S2 } from './s2_utils.mjs';
import { getOutputCanvasS2, getRunBtnCanvasS2, getInteractiveCanvasS2, getCanvasCoordStatusS2 } from '../dom_elements.mjs';
import { getLeakedValueS1, setCanvasContextS2 } from '../state.mjs'; // Assuming state.mjs handles canvas context too

// Import individual test functions
import { testWebGLCheckS2 } from './testWebGLCheck.mjs';
// ... import other S2 tests: testAdvancedPPS2, testOOBReadEnhancedS2 etc.

// Simplified version for demonstration. The original has complex drawing and interaction logic.
// That would need to be carefully refactored into smaller modules (e.g., s2_drawing.mjs, s2_event_handlers.mjs)

export async function runCanvasTestSequenceS2() {
    const FNAME = 'runCanvasTestSequenceS2';
    const runBtn = getRunBtnCanvasS2();
    const outputDiv = getOutputCanvasS2();
    const canvasElement = getInteractiveCanvasS2();
    const coordStatusDiv = getCanvasCoordStatusS2();

    if (!outputDiv || !runBtn || !canvasElement || !coordStatusDiv) {
        console.error("FATAL: Elementos essenciais S2 não encontrados!");
        return;
    }

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';
    
    logS2("Iniciando sequência focada do Script 2 (Modular - Exemplo)...", "test", FNAME);

    // Initialize canvas context if not done by individual tests needing it first
    try {
        const ctx = canvasElement.getContext('2d');
        if (!ctx) throw new Error("Falha ao obter Ctx 2D para S2.");
        setCanvasContextS2(ctx); // Store if needed by drawing utils
        // Initial draw call (e.g., redrawAllS2() from original)
        logS2("Canvas 2D context obtido.", "info", FNAME);

    } catch (e) {
        logS2(`Falha Ctx 2D (S2): ${e.message}`, 'critical', FNAME);
        if (runBtn) runBtn.disabled = false;
        return;
    }
    
    const leakedS1 = getLeakedValueS1();
    if (leakedS1) {
        logS2(`Leak de S1: ${JSON.stringify(leakedS1)}`, 'leak', FNAME);
    } else {
        logS2("Nenhum leak de S1 encontrado.", 'warn', FNAME);
    }
    await PAUSE_S2();

    await testWebGLCheckS2(); // This test might also set a WebGL context in state.mjs
    await PAUSE_S2(SHORT_PAUSE_S2);

    // Call other S2 tests
    logS2("AVISO: Outros testes do Script 2 (Canvas) não implementados nesta demo modular.", "warn", FNAME);
    // await testAdvancedPPS2(); await PAUSE_S2(SHORT_PAUSE_S2);
    // ...

    // Setup event listeners (this logic would be more complex)
    // canvasElement.addEventListener('click', (event) => { /* ... */ });
    // canvasElement.addEventListener('mousemove', (event) => { /* ... */ });
    logS2("Listeners de interação do Canvas não ativos nesta demo.", "info", FNAME);


    logS2("--- Sequência principal de testes S2 (Modular - Exemplo) concluída ---", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
