// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeTypeErrorInvestigationTest, currentCallCount_toJSON_for_typeerror_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs'; // Necessário se toHex for usado em alguma toJSON, mas não nas simplificadas

// --- DEFINIÇÕES DAS VARIANTES `toJSON` SIMPLIFICADAS ---

// Variante Original (para referência, se necessário, mas focaremos nas simplificadas)
// function toJSON_OriginalConfirmation() { ... }

// Variante A: Apenas contador e retorno de objeto simples
function toJSON_VariantA_CounterOnly() {
    // Usamos o contador exportado de testJsonTypeConfusionUAFSpeculative.mjs
    currentCallCount_toJSON_for_typeerror_test++; 
    // document.title = `toJSON_A_CounterOnly Call ${currentCallCount_toJSON_for_typeerror_test}`; // Canary opcional
    // logS3(`toJSON_VariantA_CounterOnly: Chamada ${currentCallCount_toJSON_for_typeerror_test}`, "info");
    return { test_val_A: 123, call: currentCallCount_toJSON_for_typeerror_test };
}

// Variante B: Apenas document.title e retorno de objeto simples
function toJSON_VariantB_TitleOnly() {
    currentCallCount_toJSON_for_typeerror_test++;
    document.title = "toJSON_B_TitleOnly Call " + currentCallCount_toJSON_for_typeerror_test;
    // logS3(`toJSON_VariantB_TitleOnly: Chamada ${currentCallCount_toJSON_for_typeerror_test}`, "info");
    return { test_val_B: 456, call: currentCallCount_toJSON_for_typeerror_test };
}

// Variante C: Apenas return de objeto simples (sem operações internas)
function toJSON_VariantC_ReturnObjectOnly() {
    currentCallCount_toJSON_for_typeerror_test++; // Ainda contamos a entrada
    // document.title = "toJSON_C_ReturnObjectOnly Call " + currentCallCount_toJSON_for_typeerror_test;
    // logS3(`toJSON_VariantC_ReturnObjectOnly: Chamada ${currentCallCount_toJSON_for_typeerror_test}`, "info");
    return { test_val_C_simple: 789 };
}

// Variante D: Apenas return undefined
function toJSON_VariantD_ReturnUndefined() {
    currentCallCount_toJSON_for_typeerror_test++;
    // document.title = "toJSON_D_ReturnUndefined Call " + currentCallCount_toJSON_for_typeerror_test;
    // logS3(`toJSON_VariantD_ReturnUndefined: Chamada ${currentCallCount_toJSON_for_typeerror_test}`, "info");
    return undefined;
}

async function runSimplifiedToJSONInvestigation() {
    const FNAME_RUNNER = "runSimplifiedToJSONInvestigation";
    logS3(`==== INICIANDO Investigação do TypeError com toJSON Simplificadas ====`, 'test', FNAME_RUNNER);

    const testsToRun = [
        { desc: "Test_toJSON_A_CounterOnly", func: toJSON_VariantA_CounterOnly },
        { desc: "Test_toJSON_B_TitleOnly", func: toJSON_VariantB_TitleOnly },
        { desc: "Test_toJSON_C_ReturnObjectOnly", func: toJSON_VariantC_ReturnObjectOnly },
        { desc: "Test_toJSON_D_ReturnUndefined", func: toJSON_VariantD_ReturnUndefined },
    ];

    for (const test of testsToRun) {
        logS3(`\n--- Testando com toJSON Lógica: ${test.desc} ---`, 'subtest', FNAME_RUNNER);
        await executeTypeErrorInvestigationTest(
            test.desc,
            true, // applyPrototypePollution é sempre true para estes testes
            test.func 
        );
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${test.desc}: ${document.title}`, "info");
    }

    // Re-teste o cenário SEM PP como controle final
    logS3(`\n--- Teste de CONTROLE FINAL: OOB SEM PP (Esperado JSON.stringify normal) ---`, 'subtest', FNAME_RUNNER);
    await executeTypeErrorInvestigationTest(
        "FinalControl_OOB_Without_PP",
        false, // applyPrototypePollution = false
        null   // toJSONFunctionToUse (não será usada)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== Investigação do TypeError com toJSON Simplificadas CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_SimplifiedToJSONTypeError';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Investigação do TypeError com toJSON Simplificadas ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Investigação TypeError Simplificada";
    
    await runSimplifiedToJSONInvestigation();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Investigação do TypeError com toJSON Simplificadas) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
