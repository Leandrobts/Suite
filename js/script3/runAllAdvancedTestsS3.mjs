// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeCorruptArrayBufferMetadataTest } from './testCorruptMetadata.mjs'; 
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; 
import { AdvancedInt64, toHex } from '../utils.mjs';

async function runAggressiveMetadataCorruptionTestsWithActiveCheck() { // Nome atualizado
    const FNAME_RUNNER = "runAggressiveMetadataCorruptionTestsWithActiveCheck";
    logS3(`==== INICIANDO Testes Agressivos de Corrupção de Metadados AB (com Verificação Ativa) ====`, 'test', FNAME_RUNNER);

    // Teste 1: Corromper o TAMANHO (como antes, mas a verificação interna mudou)
    const offsetCorromperTamanho = JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START;
    logS3(`\n--- Testando Corrupção de Tamanho do ArrayBuffer ---`, 'subtest', FNAME_RUNNER);
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_Size_to_Large_ActiveCheck",
        offsetCorromperTamanho, 
        0x7FFFFFFF,             
        4,                      
        false                   // isPointerCorruptionTest = false
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 2: Corromper o PONTEIRO DE CONTEÚDO para Nulo e tentar ler
    const offsetCorromperConteudoPtr = JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET;
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do AB (Anular) e TENTAR LER ---`, 'subtest', FNAME_RUNNER);
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_ContentsPtr_to_Null_And_Read",
        offsetCorromperConteudoPtr, 
        new AdvancedInt64(0,0),   
        8,                        
        true                      // isPointerCorruptionTest = true
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Teste 3: Corromper o PONTEIRO DE CONTEÚDO para Dummy e tentar ler
    logS3(`\n--- Testando Corrupção de Ponteiro de Conteúdo do AB (Dummy) e TENTAR LER ---`, 'subtest', FNAME_RUNNER);
    await executeCorruptArrayBufferMetadataTest(
        "Corrupt_AB_ContentsPtr_to_Dummy_And_Read",
        offsetCorromperConteudoPtr, 
        new AdvancedInt64("0x4141414142424242"), 
        8,                        
        true                      // isPointerCorruptionTest = true
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Testes Agressivos de Corrupção de Metadados (com Verificação Ativa) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AggressiveCorrupt_ActiveCheck'; // Nome atualizado
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes Agressivos de Corrupção de Metadados AB (com Verificação Ativa) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Corrupção Agressiva AB (Verificação Ativa)";
    
    await runAggressiveMetadataCorruptionTestsWithActiveCheck(); // Nome da função atualizado
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes Agressivos de Corrupção de Metadados AB com Verificação Ativa) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
