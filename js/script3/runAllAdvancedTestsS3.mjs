// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { runSpecificJsonTypeConfusionTest } from './testJsonTypeConfusionUAFSpeculative.mjs';
// Adicione outras importações de teste do script3 se necessário
// import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
// ...

async function runTargetedJsonTC_With_SimpleToJSON() {
    const FNAME_RUNNER = "runTargetedJsonTC_With_SimpleToJSON";
    logS3(`==== INICIANDO TESTES DIRECIONADOS JSON TC (toJSON com lógica SIMPLES) ====`, 'test', FNAME_RUNNER);

    

    // Cenário 4: OOB Write com VALOR PADRÃO (0x41414141) em 0x70, PP com toJSON simples.
    await runSpecificJsonTypeConfusionTest(
        "OOB_0x70_AAAA_PP_toJSON_SimpleLogic",
        0x70,       // corruptionOffset
        0x41414141, // valueToWrite
        true,       // enablePP
        true,       // attemptOOBWrite
        false       // skipOOBEnvironmentSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== TESTES DIRECIONADOS JSON TC (toJSON com lógica SIMPLES) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusJsonTC_SimpleToJSON';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Foco JSON TC (toJSON com lógica SIMPLES) ====`,'test', FNAME);
    
    await runTargetedJsonTC_With_SimpleToJSON();

    // Outros testes do Script 3 podem ser adicionados ou descomentados aqui se necessário
    // logS3("Outros testes do Script 3 (se houver) seriam executados agora...", "info", FNAME);

    logS3(`\n==== Script 3 CONCLUÍDO (Foco JSON TC com lógica SIMPLES) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
