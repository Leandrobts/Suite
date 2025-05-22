// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize para a nova função de teste
import { executeReadWriteVerificationAtOffset } from './testReadWriteAtOffset.mjs'; 
import { OOB_CONFIG } from '../config.mjs'; 
import { AdvancedInt64, toHex } from '../utils.mjs'; // toHex não é mais necessário aqui diretamente

async function runFocusedReadWriteTests() {
    const FNAME_RUNNER = "runFocusedReadWriteTests";
    logS3(`==== INICIANDO Testes Focados de Leitura/Escrita em Offsets Específicos ====`, 'test', FNAME_RUNNER);

    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    // Teste 1: Ler, escrever 0xFFFFFFFF em 0x70, ler de volta, testar DataView
    logS3(`\n--- Testando R/W em Offset Crítico ${toHex(criticalOffset)} com valor 0xFFFFFFFF ---`, 'subtest', FNAME_RUNNER);
    await executeReadWriteVerificationAtOffset(
        `RW_Verify_Offset_${toHex(criticalOffset)}_Val_FFFF`,
        criticalOffset, 
        0xFFFFFFFF,             
        4                       // bytesToReadWrite (para DWORD)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 2: Ler, escrever 0x0 em 0x70, ler de volta, testar DataView
    logS3(`\n--- Testando R/W em Offset Crítico ${toHex(criticalOffset)} com valor 0x0 ---`, 'subtest', FNAME_RUNNER);
    await executeReadWriteVerificationAtOffset(
        `RW_Verify_Offset_${toHex(criticalOffset)}_Val_0000`,
        criticalOffset, 
        0x00000000,             
        4                       // bytesToReadWrite
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Teste 3: Investigar 8 bytes em 0x70
    logS3(`\n--- Investigando 8 bytes em Offset ${toHex(criticalOffset)} com escrita 0xFF...FF (QWORD) ---`, 'subtest', FNAME_RUNNER);
    await executeReadWriteVerificationAtOffset(
        `RW_Verify_Offset_${toHex(criticalOffset)}_Val_FFFF_QWORD`,
        criticalOffset, 
        new AdvancedInt64("0xFFFFFFFFFFFFFFFF"), // Escrever QWORD
        8                                        // Ler/Escrever QWORD
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    logS3(`==== Testes Focados de Leitura/Escrita CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ReadWriteVerify'; 
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes Focados de Leitura/Escrita em Offsets Específicos ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Testes R/W em Offset";
    
    await runFocusedReadWriteTests(); 
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes Focados de Leitura/Escrita em Offsets Específicos) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
