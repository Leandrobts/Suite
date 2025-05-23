// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';

// --- Funções toJSON para teste de decomposição ULTRA MINIMALISTA ---

// Variante 0: Absolutamente Mínima (apenas return {})
// Não incrementa contador nem muda título para isolar o ato de ser chamada e retornar.
function toJSON_Decomp_V0_ReturnEmptyObject() {
    // current_toJSON_call_count_for_TypeError_test++; // O contador será 0 se o erro for antes
    // document.title = `toJSON_Decomp_V0 Call`;
    return {}; 
}

// Variante 1: Apenas incrementa o contador global e retorna.
function toJSON_Decomp_V1_CounterOnly() {
    current_toJSON_call_count_for_TypeError_test++;
    // document.title = `toJSON_Decomp_V1 Call ${current_toJSON_call_count_for_TypeError_test}`;
    return { step: 1, call: current_toJSON_call_count_for_TypeError_test };
}

// Variante 2: Apenas muda document.title e retorna.
function toJSON_Decomp_V2_TitleOnly() {
    current_toJSON_call_count_for_TypeError_test++; // Contar a entrada
    document.title = `toJSON_Decomp_V2 Call ${current_toJSON_call_count_for_TypeError_test}`;
    return { step: 2, call: current_toJSON_call_count_for_TypeError_test };
}

// Variante 3: Apenas uma operação matemática local e retorna.
function toJSON_Decomp_V3_LocalMathOnly() {
    current_toJSON_call_count_for_TypeError_test++;
    document.title = `toJSON_Decomp_V3 Call ${current_toJSON_call_count_for_TypeError_test}`;
    let x = 1 + 1; // Operação puramente local
    return { step: 3, res: x, call: current_toJSON_call_count_for_TypeError_test };
}

// Variante 4 (Referência do problema anterior): Tentativa de logS3
// Esta é para confirmar se o logS3 ainda é o gatilho como suspeitado.
function toJSON_Decomp_V4_AttemptLogS3() {
    current_toJSON_call_count_for_TypeError_test++;
    const FNAME_toJSON = "toJSON_Decomp_V4_AttemptLogS3_Internal";
    document.title = `toJSON_Decomp_V4 Call ${current_toJSON_call_count_for_TypeError_test}`;
    try {
        // Esta linha era o ponto de falha nos logs anteriores
        logS3(`[${FNAME_toJSON}] Chamada ${current_toJSON_call_count_for_TypeError_test}! this: ${typeof this}`, "critical", FNAME_toJSON);
    } catch (e) {
        console.error("ERRO DENTRO de toJSON_Decomp_V4_AttemptLogS3 ao chamar logS3:", e);
        document.title = "ERRO INTERNO toJSON_Decomp_V4";
        throw e; // Re-lançar para ser pego pelo catch em executeFocusedTestForTypeError
    }
    return { step: 4, logged: true, call: current_toJSON_call_count_for_TypeError_test };
}


async function runUltraMinimalDecomposition() {
    const FNAME_RUNNER = "runUltraMinimalDecomposition";
    logS3(`==== INICIANDO Decomposição Ultra-Minimalista do Gatilho do TypeError ====`, 'test', FNAME_RUNNER);

    const tests = [
        { description: "Decomp_V0_ReturnEmptyObject", func: toJSON_Decomp_V0_ReturnEmptyObject },
        { description: "Decomp_V1_CounterOnly", func: toJSON_Decomp_V1_CounterOnly },
        { description: "Decomp_V2_TitleOnly", func: toJSON_Decomp_V2_TitleOnly },
        { description: "Decomp_V3_LocalMathOnly", func: toJSON_Decomp_V3_LocalMathOnly },
        { description: "Decomp_V4_AttemptLogS3", func: toJSON_Decomp_V4_AttemptLogS3 },
    ];

    for (const test of tests) {
        logS3(`\n--- Testando Variante toJSON Ultra-Minimalista: ${test.description} ---`, 'subtest', FNAME_RUNNER);
        document.title = `Iniciando SubTeste: ${test.description}`; 
        
        const result = await executeFocusedTestForTypeError( // Chama a função do outro arquivo
            test.description,
            test.func 
        );
        
        if (result.errorOccurred) {
            logS3(`   RESULTADO ${test.description}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO ${test.description}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${test.description}: Completou sem erro explícito. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
        }
        logS3(`   Título da página ao final de ${test.description}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // Se um TypeError ocorrer, ele será capturado e logado.
        // Vamos continuar para testar todas as variantes, a menos que seja um crash completo.
        if (document.title.startsWith("CONGELOU?")) {
            logS3("Congelamento detectado, interrompendo próximos testes de decomposição.", "error", FNAME_RUNNER);
            break;
        }
    }

    logS3(`==== Decomposição Ultra-Minimalista do Gatilho do TypeError CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UltraMinimalDecomp';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Decomposição Ultra-Minimalista do Gatilho do TypeError ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Decomp UltraMinimal";
    
    await runUltraMinimalDecomposition();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Decomposição Ultra-Minimalista do Gatilho do TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Decomp UltraMinimal";
    }
}
