// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { runSpecificJsonTCTest_MinimalLogging } from './testJsonTypeConfusionUAFSpeculative.mjs'; // Atualizada a importação

async function runFocusedTest_RecreateFreeze_MinimalToJSON() {
    const FNAME_RUNNER = "runFocusedTest_RecreateFreeze_MinimalToJSON";
    logS3(`==== INICIANDO TESTE DIRECIONADO (Recriar Congelamento com toJSON de Logging MÍNIMO) ====`, 'test', FNAME_RUNNER);

    const criticalOffset = 0x70;
    const criticalValue = 0xFFFFFFFF;
    const enablePP = true;
    const attemptOOBWrite = true;
    const skipOOBEnvSetup = false; // Queremos o ambiente OOB para cada teste

    logS3(`\n--- Testando Cenário de Congelamento (ArrayBuffer, 0x70, 0xFFFFFFFF) com toJSON de Logging MÍNIMO ---`, 'subtest', FNAME_RUNNER);
    await runSpecificJsonTCTest_MinimalLogging(
        "FreezeAttempt_0x70_FFFF_PP_MinimalToJSON",
        criticalOffset,
        criticalValue,
        enablePP,
        attemptOOBWrite,
        skipOOBEnvSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // OPCIONAL: Teste de controle com um valor que NÃO causava congelamento (ex: 0x0 ou 0x41414141)
    // para garantir que o RangeError ainda é o resultado normal com este toJSON.
    logS3(`\n--- Teste de CONTROLE (ArrayBuffer, 0x70, 0x0) com toJSON de Logging MÍNIMO ---`, 'subtest', FNAME_RUNNER);
    await runSpecificJsonTCTest_MinimalLogging(
        "Control_0x70_NULL_PP_MinimalToJSON",
        criticalOffset,
        0x0, // Valor que não causou congelamento severo antes
        enablePP,
        attemptOOBWrite,
        skipOOBEnvSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== TESTE DIRECIONADO (Recriar Congelamento com toJSON de Logging MÍNIMO) CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_RecreateFreeze_MinimalToJSON';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Recriar Congelamento com toJSON de Logging MÍNIMO ====`,'test', FNAME);
    
    await runFocusedTest_RecreateFreeze_MinimalToJSON();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Recriar Congelamento com toJSON de Logging MÍNIMO) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
