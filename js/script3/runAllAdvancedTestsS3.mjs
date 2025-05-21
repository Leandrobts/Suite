// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs'; // SHORT_PAUSE_S3 importado caso use
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { runSpecificJsonTypeConfusionTest } from './testJsonTypeConfusionUAFSpeculative.mjs';
// Adicione outras importações de teste do script3 se necessário
// import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
// import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
// import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
// import { testCoreExploitModule } from '../core_exploit.mjs';
// import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';

async function runTargetedJsonTC_With_PrimitiveReturnAtDepth() {
    const FNAME_RUNNER = "runTargetedJsonTC_With_PrimitiveReturnAtDepth";
    logS3(`==== INICIANDO TESTES DIRECIONADOS JSON TC (toJSON retorna PRIMITIVO em profundidade) ====`, 'test', FNAME_RUNNER);

    

    // Cenário 2: Apenas PP (sem escrita OOB), toJSON retorna string primitiva na profundidade 2900.
    // Para verificar a estabilidade da própria lógica de recursão + retorno primitivo.
    await runSpecificJsonTypeConfusionTest(
        "OnlyPP_toJSON_ReturnsPrimitive_NoOOB",
        -1,         // corruptionOffset (inválido -> sem escrita OOB efetiva)
        0,          // valueToWrite (irrelevante)
        true,       // enablePP
        false,      // attemptOOBWrite (explicitamente desabilitado)
        false       // skipOOBEnvironmentSetup (configura ambiente OOB, mas não usa para escrita)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 3 (OPCIONAL): Para verificar se o crash OOB acontece ANTES da profundidade 2900.
    // Para este teste, você precisaria temporariamente MUDAR a constante
    // RECURSION_DEPTH_TARGET_FOR_PRIMITIVE_RETURN em testJsonTypeConfusionUAFSpeculative.mjs
    // para um valor MUITO ALTO (ex: 10000) para que ela não seja atingida se o crash OOB for mais rápido.
    // E então rodar:
    // logS3("Próximo teste: verificar se crash OOB ocorre antes da modificação do toJSON. REQUER AJUSTE MANUAL DA CONSTANTE DE PROFUNDIDADE.", "warn", FNAME_RUNNER);
    // await runSpecificJsonTypeConfusionTest(
    //     "OOB_0x70_FFFF_PP_toJSON_StandardLogic (Profundidade Mod NUNCA ATINGIDA)",
    //     0x70,
    //     0xFFFFFFFF,
    //     true,
    //     true,
    //     false
    // );
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // logS3("Lembre-se de restaurar RECURSION_DEPTH_TARGET_FOR_PRIMITIVE_RETURN se alterou.", "warn", FNAME_RUNNER);


    logS3(`==== TESTES DIRECIONADOS JSON TC (toJSON retorna PRIMITIVO) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusJsonTC_PrimitiveReturnLogic';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Foco JSON TC (toJSON Retorna Primitivo em Profundidade) ====`,'test', FNAME);
    
    await runTargetedJsonTC_With_PrimitiveReturnAtDepth();

    // Outros testes do Script 3 podem ser adicionados ou descomentados aqui se necessário
    // logS3("Outros testes do Script 3 (se houver) seriam executados agora...", "info", FNAME);
    // await testWebAssemblyInterface(); // Exemplo
    // await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`\n==== Script 3 CONCLUÍDO (Foco JSON TC com Retorno Primitivo) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
