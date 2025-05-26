// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste
import { executeBruteForceABMetadataTest } from './testBruteForceABMetadata.mjs'; 

// import { OOB_CONFIG } from '../config.mjs'; // Não usado diretamente aqui
// import { toHex } from '../utils.mjs';     // Não usado diretamente aqui

async function runBruteForceMetadataStrategy() {
    const FNAME_RUNNER = "runBruteForceMetadataStrategy";
    logS3(`==== INICIANDO Estratégia de Força Bruta em Metadados de ArrayBuffer ====`, 'test', FNAME_RUNNER);
    
    await executeBruteForceABMetadataTest();
    
    logS3(`==== Estratégia de Força Bruta em Metadados de ArrayBuffer CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_BruteForceABMetadata';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Força Bruta em Metadados de oob_array_buffer_real ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - BruteForce AB Meta";
    
    await runBruteForceMetadataStrategy();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste de Força Bruta em Metadados) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("SUCCESS")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - BruteForce AB Meta";
    }
}
