// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// A função detailed_toJSON_for_UAF_TC_test não precisa ser importada aqui se 
// executeUAFTypeConfusionTestWithValue a usa internamente e está no mesmo arquivo que ela.
// No entanto, a versão anterior passava a função toJSON como argumento.
// A versão de executeUAFTypeConfusionTestWithValue que causou o ReferenceError foi a que
// *não* recebia a função toJSON como argumento, mas sim usava uma detailed_toJSON_for_UAF_TC_test definida no mesmo escopo.
// Vou assumir que detailed_toJSON_for_UAF_TC_test é definida e usada por executeUAFTypeConfusionTestWithValue.
// Para o código que gerei, executeUAFTypeConfusionTestWithValue *usa* detailed_toJSON_for_UAF_TC_test
// quando Object.defineProperty(Object.prototype, ppKeyToPollute, { value: detailed_toJSON_for_UAF_TC_test, ...}) é chamado.
// Mas, na verdade, o `executeUAFTypeConfusionTestWithValue` da minha última resposta *não*
// tinha um parâmetro para `toJSONFunctionToUse`. Ele usava `detailed_toJSON_for_UAF_TC_test` implicitamente.
// Vou corrigir isso para que `executeUAFTypeConfusionTestWithValue` TOME a função `toJSON` como parâmetro,
// e `runAllAdvancedTestsS3` definirá qual usar.

// Corrigindo executeUAFTypeConfusionTestWithValue para aceitar toJSONFunctionLogic
// (Esta correção deve ser feita no arquivo testJsonTypeConfusionUAFSpeculative.mjs)
// A versão que gerei antes já fazia isso! A chamada era:
// await executeUAFTypeConfusionTestWithValue(testDescription, valueTest.val);
// E a assinatura era: executeUAFTypeConfusionTestWithValue(testVariantDescription, valueToWriteOOB)
// A `detailed_toJSON_for_UAF_TC_test` era usada internamente por ela ao definir o prototype.
// Isso está correto.

import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';


async function runSingleCriticalTest() {
    const FNAME_RUNNER = "runSingleCriticalTest";
    logS3(`==== INICIANDO Teste Crítico UAF/TC com 0xFFFFFFFF em 0x70 ====`, 'test', FNAME_RUNNER);

    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const criticalValue = 0xFFFFFFFF;

    const testDescription = `CriticalTest_Val_FFFF_Offset0x70_DetailedToJSON`;
    logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    // A função detailed_toJSON_for_UAF_TC_test está definida em testJsonTypeConfusionUAFSpeculative.mjs
    // e é usada por executeUAFTypeConfusionTestWithValue quando Object.defineProperty é chamado.
    let result = await executeUAFTypeConfusionTestWithValue(
        testDescription,
        criticalValue // Passa apenas o valor, o offset é fixo dentro de TARGETED_UAF_TC_PARAMS
                      // e a toJSON usada é a detailed_toJSON_for_UAF_TC_test
    );

    if (result.potentiallyFroze) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
    } else if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
        logS3(`      Stringify Result: ${String(result.stringifyResult).substring(0,200)}`, "info", FNAME_RUNNER);
    }
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");

    logS3(`==== Teste Crítico UAF/TC CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusCriticalUAFTC';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste Crítico UAF/TC com 0xFFFFFFFF em 0x70 ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Teste Crítico UAF/TC";
    
    await runSingleCriticalTest();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste Crítico UAF/TC) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
