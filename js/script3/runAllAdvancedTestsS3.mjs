// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// A função detailed_toJSON_for_UAF_TC_test_WithDepthControl está agora em testJsonTypeConfusionUAFSpeculative.mjs
// e é usada implicitamente por executeUAFTypeConfusionTestWithValue através de Object.defineProperty.
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';


async function runUAFTC_With_ToJSON_DepthControl() {
    const FNAME_RUNNER = "runUAFTC_With_ToJSON_DepthControl";
    logS3(`==== INICIANDO Teste UAF/TC com toJSON Detalhada e Controle de Profundidade ====`, 'test', FNAME_RUNNER);

    const criticalValue = 0xFFFFFFFF; // Foco no valor que antes causava problemas
    const testDescription = `UAFTC_DepthCtrl_Val_FFFF_Offset0x70`;

    logS3(`\n--- Executando Teste UAF/TC: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    let result = await executeUAFTypeConfusionTestWithValue(
        testDescription,
        criticalValue
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

    logS3(`==== Teste UAF/TC com toJSON Detalhada e Controle de Profundidade CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAFTC_DepthControl';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste UAF/TC com toJSON Detalhada e Controle de Profundidade ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - UAF/TC com Controle de Profundidade";
    
    await runUAFTC_With_ToJSON_DepthControl();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste UAF/TC com toJSON Detalhada e Controle de Profundidade) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
