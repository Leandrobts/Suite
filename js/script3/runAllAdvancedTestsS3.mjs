// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeUAFTypeConfusionTestWithValue, currentCallCount_for_UAF_TC_test, detailed_toJSON_for_UAF_TC_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';


async function runUAFTypeConfusionValueTests() {
    const FNAME_RUNNER = "runUAFTypeConfusionValueTests";
    logS3(`==== INICIANDO Testes UAF/TC com Valores Variados em 0x70 (COM PP Detalhada) ====`, 'test', FNAME_RUNNER);

    // const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70 // corruption_offset é fixo em executeUAFTypeConfusionTestWithValue

    const valuesToInvestigate = [
        { desc: "Val_0000", val: 0x00000000 },
        { desc: "Val_AAAA", val: 0x41414141 },
        { desc: "Val_0001", val: 0x00000001 },
        { desc: "Val_FFFF", val: 0xFFFFFFFF }, 
    ];

    for (const valueTest of valuesToInvestigate) {
        const testDescription = `UAF_TC_Test_${valueTest.desc}_Offset0x70`; // Offset é implicitamente 0x70
        logS3(`\n--- Executando Teste UAF/TC: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
        
        // A função 'detailed_toJSON_for_UAF_TC_test' está agora definida em
        // testJsonTypeConfusionUAFSpeculative.mjs e é usada por executeUAFTypeConfusionTestWithValue
        // quando Object.defineProperty é chamado. Não precisamos passá-la como argumento aqui.
        let result = await executeUAFTypeConfusionTestWithValue(
            testDescription,
            valueTest.val
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
    }

    logS3(`==== Testes UAF/TC com Valores Variados CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAF_TC_ValueTests';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes UAF/TC com Valores Variados em 0x70 ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Testes UAF/TC";
    
    await runUAFTypeConfusionValueTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes UAF/TC com Valores Variados) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
