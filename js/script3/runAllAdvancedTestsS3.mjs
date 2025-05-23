// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';

// --- Funções toJSON para teste de decomposição do logS3 ---

// Sub-Variante 1: Apenas o incremento do contador e o canary do document.title
function toJSON_Decomp_Step1_TitleOnly() {
    current_toJSON_call_count_for_TypeError_test++;
    document.title = `toJSON_Decomp_Step1 Call ${current_toJSON_call_count_for_TypeError_test}`;
    // Nenhuma outra operação, nem mesmo logS3
    return { step: 1, call: current_toJSON_call_count_for_TypeError_test };
}

// Sub-Variante 2: Adiciona new Date().toLocaleTimeString()
function toJSON_Decomp_Step2_Date() {
    current_toJSON_call_count_for_TypeError_test++;
    document.title = `toJSON_Decomp_Step2 Call ${current_toJSON_call_count_for_TypeError_test}`;
    let timestamp = "N/A";
    try {
        timestamp = `[${new Date().toLocaleTimeString()}]`; // Operação de Data/Hora
    } catch (e) {
        // Se o erro for aqui, logS3 não seria chamado de qualquer forma.
        // Vamos tentar logar um erro mínimo no console do navegador.
        console.error("ERRO em new Date() na toJSON:", e);
        document.title = "ERRO new Date() - toJSON";
        throw e; // Re-lança para ser pego pelo try...catch externo
    }
    return { step: 2, ts: timestamp, call: current_toJSON_call_count_for_TypeError_test };
}

// Sub-Variante 3: Adiciona concatenação de string (simulando a mensagem do logS3)
function toJSON_Decomp_Step3_StringConcat() {
    current_toJSON_call_count_for_TypeError_test++;
    document.title = `toJSON_Decomp_Step3 Call ${current_toJSON_call_count_for_TypeError_test}`;
    let message = "N/A";
    try {
        const timestamp = `[${new Date().toLocaleTimeString()}]`;
        message = `${timestamp} [Test] Mensagem de teste da toJSON (Call ${current_toJSON_call_count_for_TypeError_test})`;
    } catch (e) {
        console.error("ERRO em Date/String Concat na toJSON:", e);
        document.title = "ERRO Date/Str - toJSON";
        throw e;
    }
    return { step: 3, msg: message.substring(0,10), call: current_toJSON_call_count_for_TypeError_test };
}

// Sub-Variante 4: Adiciona getElementById (sem escrever innerHTML)
function toJSON_Decomp_Step4_GetElement() {
    current_toJSON_call_count_for_TypeError_test++;
    document.title = `toJSON_Decomp_Step4 Call ${current_toJSON_call_count_for_TypeError_test}`;
    let elementFound = false;
    try {
        const timestamp = `[${new Date().toLocaleTimeString()}]`;
        const message = `${timestamp} [Test] Mensagem (Call ${current_toJSON_call_count_for_TypeError_test})`;
        const outputDiv = document.getElementById('output-advanced'); // Tenta obter o elemento
        if (outputDiv) {
            elementFound = true;
        }
    } catch (e) {
        console.error("ERRO em Date/Str/GetElement na toJSON:", e);
        document.title = "ERRO GetElement - toJSON";
        throw e;
    }
    return { step: 4, elFound: elementFound, call: current_toJSON_call_count_for_TypeError_test };
}

// Sub-Variante 5: Adiciona escrita no innerHTML (operação completa do logS3 simplificado)
function toJSON_Decomp_Step5_InnerHTML() {
    current_toJSON_call_count_for_TypeError_test++;
    document.title = `toJSON_Decomp_Step5 Call ${current_toJSON_call_count_for_TypeError_test}`;
    try {
        const timestamp = `[${new Date().toLocaleTimeString()}]`;
        const message = `${timestamp} [toJSON_Decomp_Step5] Chamada ${current_toJSON_call_count_for_TypeError_test}!`;
        // Simula a parte mais crítica do logToDiv
        const outputDiv = document.getElementById('output-advanced');
        if (outputDiv) {
            // Atenção: innerHTML += pode ser problemático se a string 'message' for muito grande
            // ou se outputDiv estiver em um estado estranho.
            // Para teste, vamos usar uma mensagem curta e uma classe simples.
            const sanitizedMessage = String(message).replace(/</g, "&lt;").replace(/>/g, "&gt;");
            outputDiv.innerHTML += `<span class="log-critical">${sanitizedMessage}\n</span>`;
        } else {
            console.error("output-advanced não encontrado em toJSON_Decomp_Step5");
        }
    } catch (e) {
        console.error("ERRO na escrita innerHTML em toJSON_Decomp_Step5:", e);
        document.title = "ERRO innerHTML - toJSON";
        throw e; // Re-lança para ser pego pelo try...catch externo
    }
    return { step: 5, written: true, call: current_toJSON_call_count_for_TypeError_test };
}


async function runDecompositionOfLogS3Trigger() {
    const FNAME_RUNNER = "runDecompositionOfLogS3Trigger";
    logS3(`==== INICIANDO Decomposição do Gatilho do TypeError (logS3) ====`, 'test', FNAME_RUNNER);

    const tests = [
        { description: "Decomp_Step1_TitleOnly", func: toJSON_Decomp_Step1_TitleOnly },
        { description: "Decomp_Step2_Date", func: toJSON_Decomp_Step2_Date },
        { description: "Decomp_Step3_StringConcat", func: toJSON_Decomp_Step3_StringConcat },
        { description: "Decomp_Step4_GetElement", func: toJSON_Decomp_Step4_GetElement },
        { description: "Decomp_Step5_InnerHTML", func: toJSON_Decomp_Step5_InnerHTML },
    ];

    for (const test of tests) {
        logS3(`\n--- Testando Variante toJSON: ${test.description} ---`, 'subtest', FNAME_RUNNER);
        document.title = `Iniciando SubTeste: ${test.description}`; // Canary antes do teste
        
        const result = await executeFocusedTestForTypeError(
            test.description,
            test.func 
        );

        // Log adicional para ver o estado após cada sub-teste
        if (result.errorOccurred) {
            logS3(`   RESULTADO ${test.description}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO ${test.description}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${test.description}: Completou sem erro explícito. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
        }
        logS3(`   Título da página ao final de ${test.description}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // Se um erro ocorreu, podemos querer parar para não poluir os próximos testes
        // ou se o navegador estiver instável. Para depuração, vamos continuar por enquanto.
    }

    logS3(`==== Decomposição do Gatilho do TypeError CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_DecomposeLogS3Error';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Decomposição do Gatilho do TypeError (logS3) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Decomposição logS3";
    
    await runDecompositionOfLogS3Trigger();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Decomposição do Gatilho do TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever
    } else {
        document.title = "Script 3 Concluído - Decomposição logS3";
    }
}
