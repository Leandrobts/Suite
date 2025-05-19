// js/script2/runCanvasTestSequence.mjs
import { logS2, PAUSE_S2, SHORT_PAUSE_S2, MEDIUM_PAUSE_S2, IMG_SQUARE_SIZE_S2, IMG_SQUARE_SPACING_S2, IMG_SQUARES_START_Y_S2 } from './s2_utils.mjs';
import { getOutputCanvasS2, getRunBtnCanvasS2, getInteractiveCanvasS2, getCanvasCoordStatusS2 } from '../dom_elements.mjs';
import { 
    getLeakedValueS1, setCanvasContext2D_S2, setCurrentLeakDataS2, interactiveAreasS2 as stateInteractiveAreas, 
    imgSquaresS2 as stateImgSquares, setCanvasClickListenerS2, setCanvasMoveListenerS2, 
    getCanvasClickListenerS2, getCanvasMoveListenerS2, setCurrentHoverTargetS2, clearS2State
} from '../state.mjs';
import { redrawAllS2 } from './s2_canvas_helpers.mjs'; // Supondo que redrawAllS2 e os listeners estão aqui

// Importar todas as funções de teste do Script 2
import { testWebGLCheckS2 } from './testWebGLCheck.mjs';
// Crie os arquivos .mjs correspondentes para os testes abaixo e importe-os
// import { testAdvancedPPS2 } from './testAdvancedPP.mjs';
// import { testOOBReadEnhancedS2 } from './testOOBReadEnhanced.mjs';
// import { testOOBWriteMetadataS2 } from './testOOBWriteMetadata.mjs';
// import { testWebGLDeeperPlusS2 } from './testWebGLDeeperPlus.mjs';
// import { testOOBWriteToImageDataCheckS2 } from './testOOBWriteToImageData.mjs';
// import { testOOBWriteOnlyS2 } from './testOOBWriteOnly.mjs';
// import { testFileSystemAccessS2 } from './testFileSystemAccess.mjs';
// import { testWebGPUCheckS2 } from './testWebGPUCheck.mjs';


export async function runCanvasTestSequenceS2() {
    const FNAME = 'runCanvasTestSequenceS2';
    const runBtnCanvas = getRunBtnCanvasS2();
    const outputDivCanvasS2 = getOutputCanvasS2();
    const canvasElementS2 = getInteractiveCanvasS2();
    const coordStatusDivS2 = getCanvasCoordStatusS2();

    if (!outputDivCanvasS2 || !runBtnCanvas || !canvasElementS2 || !coordStatusDivS2) {
        console.error("FATAL: Elementos essenciais S2 não encontrados!");
        return;
    }

    if (runBtnCanvas) runBtnCanvas.disabled = true;
    clearS2State(); // Limpa o estado do S2 antes de iniciar
    if (outputDivCanvasS2) outputDivCanvasS2.innerHTML = '';
    logS2("Iniciando sequência focada do Script 2 (v19.0 - Modular)...", "test", FNAME);

    // Inicializa o contexto 2D e desenha
    try {
        const ctx = canvasElementS2.getContext('2d');
        if (!ctx) throw new Error("Falha ao obter Ctx 2D para S2.");
        setCanvasContext2D_S2(ctx);
    } catch (e) {
        logS2(`Falha Ctx 2D (S2): ${e.message}`, 'critical', FNAME);
        if (runBtnCanvas) runBtnCanvas.disabled = false;
        return;
    }
    
    // Popula áreas interativas e quadrados (lógica original do HTML)
    stateInteractiveAreas.length = 0; // Limpa antes de popular
    stateInteractiveAreas.push(
        { id: 'rect-log-s2', x: 10, y: 10, w: 70, h: 25, color: '#FF5733', hoverColor: '#FF8C66', text: 'Log Clk' },
        { id: 'rect-link-s2', x: 90, y: 10, w: 80, h: 25, color: '#337BFF', hoverColor: '#66A3FF', text: 'Abrir Link' },
        { id: 'rect-rerun-s2', x: 180, y: 10, w: 100, h: 25, color: '#4CAF50', hoverColor: '#80C883', text: 'Re-ler Leak S1' }
    );

    stateImgSquares.length = 0; // Limpa antes de popular
    let sqX = 10;
    let sqY = IMG_SQUARES_START_Y_S2;
    const squareDefsS2Config = [ /* ... definições originais ... */ ];
    // Adicione as squareDefsS2Config aqui e a lógica para popular stateImgSquares

    redrawAllS2(); // Desenha o estado inicial
    await PAUSE_S2();

    // Lê o leak do S1
    try {
        const l = getLeakedValueS1(); 
        if (l) {
            const ls = l.type === 'U64' ? `L(S1):U64 H=${toHexS2(l.high)} L=${toHexS2(l.low)}@${l.offset}` : `L(S1):U32 ${toHexS2(l.low)}@${l.offset}`;
            logS2(`-> Leak S1 encontrado: ${ls}`, 'leak', FNAME);
            setCurrentLeakDataS2({ text: ls, color: "#FF9800" });
        } else {
            logS2(`-> Leak S1 (leakedValueFromOOB_S1) nulo/não encontrado.`, 'warn', FNAME);
            setCurrentLeakDataS2({ text: "L(S1):NULO", color: "#FFC107" });
        }
    } catch (e) {
        logS2(`Erro ao acessar leak S1: ${e.message}`, 'error', FNAME);
        setCurrentLeakDataS2({ text: "L(S1):ERRO", color: "#F44336" });
    }
    redrawAllS2(); 
    await PAUSE_S2();

    // Executa a sequência de testes automáticos do canvas
    await testWebGLCheckS2(); await PAUSE_S2(SHORT_PAUSE_S2);
    // Adicione chamadas para outros testes S2 aqui, certificando-se de que eles foram importados
    // await testAdvancedPPS2(); await PAUSE_S2(SHORT_PAUSE_S2);
    // ... etc ...
    logS2("AVISO: Muitos testes do Script 2 não foram completamente portados/chamados nesta demo modular.", "warn", FNAME);


    // Configura listeners de mouse (a lógica real dos handlers estaria em s2_canvas_helpers.mjs)
    const oldClickListener = getCanvasClickListenerS2();
    if (oldClickListener && canvasElementS2) {
        try { canvasElementS2.removeEventListener('click', oldClickListener); } catch (e) {}
    }
    const oldMoveListener = getCanvasMoveListenerS2();
    if (oldMoveListener && canvasElementS2) {
        try { canvasElementS2.removeEventListener('mousemove', oldMoveListener); } catch (e) {}
    }
    
    const newMoveListener = (event) => { /* ... lógica original de canvasMoveListenerS2 ... */ redrawAllS2(); };
    const newClickListener = async (event) => { /* ... lógica original de canvasClickListenerS2 ... */ redrawAllS2(); };

    setCanvasMoveListenerS2(newMoveListener);
    setCanvasClickListenerS2(newClickListener);
    canvasElementS2.addEventListener('mousemove', newMoveListener);
    canvasElementS2.addEventListener('click', newClickListener);
    
    redrawAllS2();

    logS2("--- Fim da execução Script 2 (v19.0 - Modular) ---", 'test', FNAME);
    if (runBtnCanvas) runBtnCanvas.disabled = false;
}

export async function runCanvasTest() { // Chamado pelo botão
    await runCanvasTestSequenceS2();
}
