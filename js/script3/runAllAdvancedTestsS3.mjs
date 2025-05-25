// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste
import { executeFullABMaterializationAndDumpTest } from './testFullABMaterializationAndDump.mjs'; 

// import { OOB_CONFIG } from '../config.mjs'; // Não usado diretamente aqui
// import { toHex } from '../utils.mjs';     // Não usado diretamente aqui

async function runFullMaterializationAndDump() {
    const FNAME_RUNNER = "runFullMaterializationAndDump";
    logS3(`==== INICIANDO Teste de Materialização Completa do ArrayBuffer e Dump ====`, 'test', FNAME_RUNNER);
    
    await executeFullABMaterializationAndDumpTest();
    
    logS3(`==== Teste de Materialização Completa do ArrayBuffer e Dump CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FullABMaterialization';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Materialização Completa do ArrayBuffer e Dump da Estrutura ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Full AB Mat. & Dump";
    
    await runFullMaterializationAndDump();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Materialização Completa & Dump) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Full AB Mat. & Dump";
    }
}
