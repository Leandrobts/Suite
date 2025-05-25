// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a função de teste do arquivo correto
import { executeCorruptArrayBufferContentsSizeTest } from './testCorruptArrayBufferContents.mjs'; 

import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

async function runAdvancedArrayBufferCorruptionStrategy() {
    const FNAME_RUNNER = "runAdvancedArrayBufferCorruptionStrategy";
    logS3(`==== INICIANDO Estratégia Avançada de Corrupção de ArrayBufferContents ====`, 'test', FNAME_RUNNER);
    
    await executeCorruptArrayBufferContentsSizeTest();
    
    logS3(`==== Estratégia Avançada de Corrupção de ArrayBufferContents CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_CorruptABContentsSize';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Corrupção de Tamanho em ArrayBufferContents ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Corrupt ABContents Size";
    
    await runAdvancedArrayBufferCorruptionStrategy();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste de Corrupção de Tamanho em ArrayBufferContents) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("SUCCESS") || document.title.includes("SUCESSO")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - Corrupt ABContents Size";
    }
}
