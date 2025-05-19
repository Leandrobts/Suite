// js/main.mjs
import { 
    getRunBtnS1, getRunBtnCanvasS2, getRunBtnAdvancedS3, 
    getBuildRopChainBtn, getViewMemoryBtn, cacheCommonElements 
} from './dom_elements.mjs';

// Importar os runners de cada script
import { runAllTestsS1 } from './script1/runAllTestsS1.mjs';
import { runCanvasTest } from './script2/runCanvasTestSequence.mjs'; // A função exportada pelo botão
import { runAllAdvancedTestsS3 } from './script3/runAllAdvancedTestsS3.mjs';

// Importar handlers para ferramentas interativas do Script 3
import { buildRopChain } from './script3/rop_builder.mjs';
// import { viewMemory } from './script3/memory_viewer.mjs'; // Crie este arquivo e importe

// Opcional: Importar e usar config.js se necessário globalmente ou para UI
// import { OOB_CONFIG, updateOOBConfigFromUI } from '../config.mjs'; // Assumindo config.mjs está um nível acima

function initialize() {
    console.log("Initializing Vulnerability Suite (Modular Full)...");
    cacheCommonElements(); 

    const btnS1 = getRunBtnS1();
    if (btnS1) {
        btnS1.addEventListener('click', async () => {
            console.log("Botão S1 Clicado");
            await runAllTestsS1();
        });
    }

    const btnS2 = getRunBtnCanvasS2();
    if (btnS2) {
        btnS2.addEventListener('click', async () => {
            console.log("Botão Canvas S2 Clicado");
            await runCanvasTest();
        });
    }

    const btnS3 = getRunBtnAdvancedS3();
    if (btnS3) {
        btnS3.addEventListener('click', async () => {
            console.log("Botão Avançado S3 Clicado");
            await runAllAdvancedTestsS3();
        });
    }
    
    const btnRop = getBuildRopChainBtn();
    if (btnRop) {
        btnRop.addEventListener('click', () => {
            console.log("Botão Construir ROP Clicado");
            if (typeof buildRopChain === 'function') {
                buildRopChain();
            } else {
                alert("Função buildRopChain não carregada.");
            }
        });
    }

    const btnMemView = getViewMemoryBtn();
    if (btnMemView) {
        btnMemView.addEventListener('click', () => {
            console.log("Botão Visualizar Memória Clicado");
            // if (typeof viewMemory === 'function') {
            //     viewMemory();
            // } else {
            //     alert("Função viewMemory não carregada. Crie js/script3/memory_viewer.mjs");
            // }
             alert("Função viewMemory não completamente portada. Crie js/script3/memory_viewer.mjs");
        });
    }
    
    // Lógica para updateOOBConfigFromUI (de config.mjs) se necessário:
    // Os elementos 'oobAllocSize', 'baseOffset', 'initialBufSize' não existem no HTML fornecido.
    // Se existissem, você poderia adicionar listeners aqui para atualizar OOB_CONFIG.
    // Exemplo:
    // const oobAllocSizeEl = document.getElementById('oobAllocSize'); // Se existisse
    // if (oobAllocSizeEl) {
    //   oobAllocSizeEl.addEventListener('change', (event) => {
    //     const val = parseInt(event.target.value, 10);
    //     if (!isNaN(val) && val > 0) OOB_CONFIG.ALLOCATION_SIZE = val;
    //     console.log("OOB_CONFIG.ALLOCATION_SIZE atualizado para:", OOB_CONFIG.ALLOCATION_SIZE);
    //   });
    // }


    // Limpeza de listeners do S2 no unload (lógica original)
    window.addEventListener('unload', () => {
        try {
            const canvasElementS2 = document.getElementById('interactive-canvas'); // Query direto pois dom_elements pode não estar disponível no unload
            const clickListener = getCanvasClickListenerS2(); // Do estado
            const moveListener = getCanvasMoveListenerS2(); // Do estado

            if (clickListener && canvasElementS2) canvasElementS2.removeEventListener('click', clickListener);
            if (moveListener && canvasElementS2) canvasElementS2.removeEventListener('mousemove', moveListener);
            
            // Limpar outros recursos do S2 se necessário
            // const gpuDev = getGpuDeviceS2();
            // if (gpuDev && typeof gpuDev.destroy === 'function') {
            //     // gpuDev.destroy(); // Cuidado com destroy no unload
            // }
        } catch (e) {
            console.warn("[Canvas Unload S2] Erro na limpeza:", e);
        }
        console.log("[Canvas Unload S2] Limpeza tentada.");
    });


    console.log("Vulnerability Suite Initialized (Modular Full).");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
