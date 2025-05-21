// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { runJsonTCDetailedAccessTest } from './testJsonTypeConfusionUAFSpeculative.mjs'; // Nova importação

async function runFocusedTest_RecreateFreeze_DetailedAccess() {
    const FNAME_RUNNER = "runFocusedTest_RecreateFreeze_DetailedAccess";
    logS3(`==== INICIANDO TESTE DIRECIONADO (Recriar Congelamento com Acesso Detalhado em toJSON) ====`, 'test', FNAME_RUNNER);

    const criticalOffset = 0x70;
    const criticalValue = 0xFFFFFFFF;
    const enablePP = true;
    const attemptOOBWrite = true;

   

    // Cenário 3: victim_ab é um Array Simples
    logS3(`\n--- Testando com victim_ab: Array Simples ---`, 'subtest', FNAME_RUNNER);
    await runJsonTCDetailedAccessTest(
        "FreezeAttempt_VictimSimpleArray_0x70_FFFF",
        criticalOffset,
        criticalValue,
        enablePP,
        attemptOOBWrite,
        () => [10, 20, 30, 40, 50] // victimFactory para Array
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== TESTE DIRECIONADO (Recriar Congelamento com Acesso Detalhado em toJSON) CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_DetailedAccessFreezeAttempt';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Recriar Congelamento com Acesso Detalhado em toJSON ====`,'test', FNAME);
    
    await runFocusedTest_RecreateFreeze_DetailedAccess();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Recriar Congelamento com Acesso Detalhado em toJSON) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
