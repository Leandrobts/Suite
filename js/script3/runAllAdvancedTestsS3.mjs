// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste de validação abrangente
import { executeComprehensiveRWValidationTest } from './testOOBReadValidation.mjs'; 

// import { OOB_CONFIG } from '../config.mjs'; // Não usado diretamente aqui
// import { toHex } from '../utils.mjs';     // Não usado diretamente aqui

async function runComprehensiveValidation() {
    const FNAME_RUNNER = "runComprehensiveValidation";
    logS3(`==== INICIANDO Validação Abrangente de R/W em Offsets de Metadados ====`, 'test', FNAME_RUNNER);
    
    await executeComprehensiveRWValidationTest();
    
    logS3(`==== Validação Abrangente de R/W CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ComprehensiveRWValidation';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Validação Abrangente de R/W em Offsets de Metadados ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Valid. Comp. R/W";
    
    await runComprehensiveValidation();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Validação Abrangente de R/W) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("FAILED")) {
        // Manter
    } else if (document.title.includes("VALIDATED")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - Valid. Comp. R/W";
    }
}
