// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// A função detailed_toJSON_Inquisitive está agora em testJsonTypeConfusionUAFSpeculative.mjs
// e é usada por executeUAFTypeConfusionTestWithValue.
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';


async function runUAFTC_With_Inquisitive_ToJSON() { // Nome da função atualizado
    const FNAME_RUNNER = "runUAFTC_With_Inquisitive_ToJSON";
    logS3(`==== INICIANDO Teste UAF/TC com toJSON Inquisitiva ====`, 'test', FNAME_RUNNER);

    const criticalValue = 0xFFFFFFFF; 
    const testDescription = `UAFTC_InquisitiveToJSON_Val_FFFF_Offset0x70`;

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

    logS3(`==== Teste UAF/TC com toJSON Inquisitiva CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAFTC_InquisitiveToJSON'; // Nome atualizado
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste UAF/TC com toJSON Inquisitiva ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - UAF/TC com toJSON Inquisitiva";
    
    await runUAFTC_With_Inquisitive_ToJSON();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste UAF/TC com toJSON Inquisitiva) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
