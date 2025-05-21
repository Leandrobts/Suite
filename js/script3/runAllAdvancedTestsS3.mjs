// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { runSpecificJsonTypeConfusionTest } from './testJsonTypeConfusionUAFSpeculative.mjs';
// ... (outras importações como testWebAssemblyInterface, testSharedArrayBufferSupport, etc.)
// import { KNOWN_STRUCTURE_IDS } from '../config.mjs'; // Descomente se for usar no futuro

async function runTargetedJsonTCTests_WithRecursionControl() {
    const FNAME_TARGETED_RUNNER = "runTargetedJsonTCTests_WithRecursionControl";
    logS3(`==== INICIANDO TESTES DIRECIONADOS JSON TC COM CONTROLE DE RECURSÃO (S3) ====`, 'test', FNAME_TARGETED_RUNNER);

    /
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 2: Sem escrita OOB, mas com PP e controle de recursão no toJSON
    // Para ver se a modificação do retorno do toJSON em profundidade causa problemas por si só
    await runSpecificJsonTypeConfusionTest(
        "OnlyPP_RecursionMod_NoOOBWrite",
        -1,         // corruptionOffset (inválido para não escrever)
        0,          // valueToWrite (irrelevante)
        true,       // enablePP
        false,      // attemptOOBWrite
        false       // skipOOBEnvironmentSetup (mas o OOBWrite é falso)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Adicione mais cenários aqui. Por exemplo, tente diferentes valores para RECURSION_DEPTH_TARGET_FOR_MODIFICATION
    // ou diferentes estruturas de retorno no toJSON (descomentando os Cenários A ou C lá).

    logS3(`==== TESTES DIRECIONADOS JSON TC COM CONTROLE DE RECURSÃO CONCLUÍDOS ====`, 'test', FNAME_TARGETED_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusJsonTC_Recursion';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Foco JSON TC c/ Controle de Recursão (S3) ====`,'test', FNAME);
    
    await runTargetedJsonTCTests_WithRecursionControl(); // <<< EXECUTA OS NOVOS TESTES DIRECIONADOS

    // Outros testes podem ser comentados para focar
    // await testWebAssemblyInterface();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // ... etc ...

    logS3(`\n==== Script 3 CONCLUÍDO (Foco JSON TC c/ Controle de Recursão) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
