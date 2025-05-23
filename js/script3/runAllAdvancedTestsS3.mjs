// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeCorruptArrayBufferMetadataTest } from './testCorruptMetadata.mjs'; 
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; 
import { AdvancedInt64, toHex } from '../utils.mjs';

async function runAggressiveMetadataCorruptionTestsWithActiveCheck() {
    const FNAME_RUNNER = "runAggressiveMetadataCorruptionTestsWithActiveCheck";
    logS3(`==== INICIANDO Testes Agressivos de Corrupção de Metadados AB (com Verificação Ativa) ====`, 'test', FNAME_RUNNER); // [cite: 2486]
    
    // Teste 1: Tentar corromper o TAMANHO do oob_array_buffer_real
    const offsetCorromperTamanho = parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16); // [cite: 2487, 2450]
    logS3(`\n--- Testando Corrupção de Tamanho do ArrayBuffer (Offset: ${toHex(offsetCorromperTamanho)}) ---`, 'subtest', FNAME_RUNNER); // [cite: 2488]
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_Size_to_Large_ActiveCheck",
        offsetCorromperTamanho, 
        0x7FFFFFFF,             
        4,                      
        false                   // isPointerCorruptionTest = false // [cite: 2489]
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3); // [cite: 2490]

    // Teste 2: Corromper o PONTEIRO DE CONTEÚDO para Nulo e tentar ler
    const offsetCorromperConteudoPtr = parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16); // [cite: 2491, 2454]
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do AB (Anular) e TENTAR LER (Offset: ${toHex(offsetCorromperConteudoPtr)}) ---`, 'subtest', FNAME_RUNNER); // [cite: 2491]
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_ContentsPtr_to_Null_And_Read",
        offsetCorromperConteudoPtr, 
        new AdvancedInt64(0,0),   
        8,                        
        true                      // isPointerCorruptionTest = true // [cite: 2492]
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3); // [cite: 2493]
    
    // Teste 3: Corromper o PONTEIRO DE CONTEÚDO para Dummy e tentar ler
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do AB (Dummy) e TENTAR LER (Offset: ${toHex(offsetCorromperConteudoPtr)}) ---`, 'subtest', FNAME_RUNNER); // [cite: 2494]
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_ContentsPtr_to_Dummy_And_Read",
        offsetCorromperConteudoPtr, 
        new AdvancedInt64("0x4141414142424242"), 
        8,                        
        true                      // isPointerCorruptionTest = true // [cite: 2495]
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3); // [cite: 2495]

    logS3(`==== Testes Agressivos de Corrupção de Metadados (com Verificação Ativa) CONCLUÍDOS ====`, 'test', FNAME_RUNNER); // [cite: 2496]
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AggressiveCorrupt_ActiveCheck';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true; // [cite: 2498]
    if (outputDiv) outputDiv.innerHTML = ''; // [cite: 2498]

    logS3(`==== INICIANDO Script 3: Testes Agressivos de Corrupção de Metadados AB (com Verificação Ativa) ====`,'test', FNAME); // [cite: 2499]
    document.title = "Iniciando Script 3 - Corrupção Agressiva AB (Verificação Ativa)"; // [cite: 2499]
    
    await runAggressiveMetadataCorruptionTestsWithActiveCheck(); // [cite: 2500]
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes Agressivos de Corrupção de Metadados AB com Verificação Ativa) ====`,'test', FNAME); // [cite: 2501]
    if (runBtn) runBtn.disabled = false; // [cite: 2501]
    // Ajuste no título final para refletir o estado real
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CRASH")) {
        // Manter título de erro/crash ou o inicial se nada mudou drasticamente
    } else {
        document.title = "Script 3 Concluído - Corrupção Agressiva AB";
    }
}
