// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste
import { executeHeapSprayAndCorruptTest } from './testHeapSprayAndCorrupt.mjs'; 

// import { OOB_CONFIG } from '../config.mjs'; 
// import { toHex } from '../utils.mjs';     

async function runHeapSprayStrategy() {
    const FNAME_RUNNER = "runHeapSprayStrategy";
    logS3(`==== INICIANDO Estratégia de Heap Spray e Corrupção ====`, 'test', FNAME_RUNNER);
    
    await executeHeapSprayAndCorruptTest();
    
    logS3(`==== Estratégia de Heap Spray e Corrupção CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_HeapSprayAndCorrupt';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Heap Spray, Corrupção OOB e Sondagem de Vítimas ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - HeapSpray & Corrupt";
    
    await runHeapSprayStrategy();
    
    logS3(`\n==== Script 3 CONCLUÍDO (HeapSpray & Corrupt) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("CORRUPTED") || document.title.includes("SUCCESS")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - HeapSpray & Corrupt";
    }
}
