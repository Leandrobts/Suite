// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste
import { executeValidateReadPrimitiveAndDumpStartTest } from './testOOBReadValidation.mjs'; 

// OOB_CONFIG e toHex podem ser necessários por outros testes, mas não diretamente aqui.
// import { OOB_CONFIG } from '../config.mjs'; 
// import { toHex } from '../utils.mjs';     

async function runOOBReadValidationAndInitialDump() {
    const FNAME_RUNNER = "runOOBReadValidationAndInitialDump";
    logS3(`==== INICIANDO Validação de Leitura OOB e Dump Inicial ====`, 'test', FNAME_RUNNER);
    
    await executeValidateReadPrimitiveAndDumpStartTest();
    
    logS3(`==== Validação de Leitura OOB e Dump Inicial CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ValidateOOBReadAndDump';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Validação de Leitura OOB e Dump Inicial do Buffer ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Valid. Leitura & Dump";
    
    await runOOBReadValidationAndInitialDump();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Validação de Leitura OOB e Dump Inicial) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("SUCCESS") || document.title.includes("SUCESSO")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - Valid. Leitura & Dump";
    }
}
