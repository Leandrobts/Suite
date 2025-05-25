// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste
import { executeDumpArrayBufferStructureTest } from './testDumpArrayBufferStructure.mjs'; 

// OOB_CONFIG e toHex podem ser necessários por outros testes, mas não diretamente aqui.
// import { OOB_CONFIG } from '../config.mjs'; 
// import { toHex } from '../utils.mjs';     

async function runABStructureDump() {
    const FNAME_RUNNER = "runABStructureDump";
    logS3(`==== INICIANDO Dump da Estrutura do ArrayBuffer Inicial ====`, 'test', FNAME_RUNNER);
    
    await executeDumpArrayBufferStructureTest();
    
    logS3(`==== Dump da Estrutura do ArrayBuffer Inicial CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_DumpABStructure';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Dump da Estrutura Inicial do oob_array_buffer_real ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Dump AB Structure";
    
    await runABStructureDump();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Dump da Estrutura Inicial do oob_array_buffer_real) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Dump AB Structure";
    }
}
