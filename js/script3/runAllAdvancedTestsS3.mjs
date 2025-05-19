// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Import automated tests for S3
import { testWebAssemblyInterface } from './testWebAssembly.mjs';
// import { testSharedArrayBufferSupport } from './testSharedArrayBuffer.mjs';
// import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';
    
    logS3("==== INICIANDO Script 3: Testes Avançados Automatizados (Modular - Exemplo) ====", 'test', FNAME);
    
    await testWebAssemblyInterface();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Call other S3 automated tests
    logS3("AVISO: Outros testes do Script 3 não implementados nesta demo modular.", "warn", FNAME);
    // await testSharedArrayBufferSupport(); await PAUSE_S3(MEDIUM_PAUSE_S3);
    // explainMemoryPrimitives(); await PAUSE_S3(SHORT_PAUSE_S3);


    logS3("\n==== Script 3 CONCLUÍDO (Testes Automáticos - Modular Exemplo) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
