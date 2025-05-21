// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Atualize para a nova função exportada
import { runSpecificFreezingTest_0x70_FFFF_ControlPP } from './testJsonTypeConfusionUAFSpeculative.mjs';

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_CheckPP_InfluenceOnOOBWrite';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste - Influência da PP na Escrita OOB Congelante ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Teste Influência PP";


    // Cenário 2: Sem Prototype Pollution ANTES da escrita OOB
    logS3(`\n--- Cenário B: Escrita OOB em 0x70 SEM Prototype Pollution ANTES ---`, 'subtest', FNAME);
    await runSpecificFreezingTest_0x70_FFFF_ControlPP(
        "OOB_0x70_FFFF_WITHOUT_PP_Before_Write",
        false // applyPrototypePollution = false
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`\n==== Script 3 CONCLUÍDO (Teste - Influência da PP na Escrita OOB Congelante) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
