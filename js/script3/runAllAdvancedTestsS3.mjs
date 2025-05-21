// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { runSpecificJsonTypeConfusionTest } from './testJsonTypeConfusionUAFSpeculative.mjs';
// Adicione outras importações de teste do script3 se necessário
// import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
// ...

async function runGranularOffsetTests_around_0x70() {
    const FNAME_RUNNER = "runGranularOffsetTests_around_0x70";
    logS3(`==== INICIANDO TESTES DIRECIONADOS JSON TC (Variação Granular de Offset em torno de 0x70) ====`, 'test', FNAME_RUNNER);

    const baseOffset = 0x70;
    const offsetsToTest = [
        baseOffset - 4, // 0x6C
        baseOffset - 3, // 0x6D
        baseOffset - 2, // 0x6E
        baseOffset - 1, // 0x6F
        baseOffset,     // 0x70
        baseOffset + 1, // 0x71
        baseOffset + 2, // 0x72
        baseOffset + 3, // 0x73
        baseOffset + 4  // 0x74
    ];
    const valueToWrite = 0xFFFFFFFF; // Valor crítico
    const enablePP = true;
    const attemptOOBWrite = true;
    const skipOOBEnvSetup = false; // Queremos o ambiente OOB para cada teste

    for (const offset of offsetsToTest) {
        const description = `GranularOffset_0x${offset.toString(16)}_Val_FFFF_PP_SimpleToJSON_MinLog`;
        await runSpecificJsonTypeConfusionTest(
            description,
            offset,
            valueToWrite,
            enablePP,
            attemptOOBWrite,
            skipOOBEnvSetup
        );
        await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa entre cada teste de offset
    }

    logS3(`==== TESTES DIRECIONADOS JSON TC (Variação Granular de Offset) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusGranularOffset';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Foco JSON TC (Variação Granular de Offset) ====`,'test', FNAME);
    
    await runGranularOffsetTests_around_0x70();

    // Outros testes do Script 3 podem ser adicionados ou descomentados aqui se necessário
    // logS3("Outros testes do Script 3 (se houver) seriam executados agora...", "info", FNAME);

    logS3(`\n==== Script 3 CONCLUÍDO (Foco JSON TC - Variação Granular de Offset) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
