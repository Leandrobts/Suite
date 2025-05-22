// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
import { testJsonTypeConfusionUAFSpeculative } from './testJsonTypeConfusionUAFSpeculative.mjs'; // Seu script original que congela
import { testCoreExploitModule } from '../core_exploit.mjs'; 
import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';


export async function runAllAdvancedTestsS3() { 
    const FNAME = 'runAllAdvancedTestsS3_OriginalFreezingDebug'; // Nomeado para clareza
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3("==== INICIANDO Script 3: DEBUG DO CONGELAMENTO ORIGINAL ====", 'test', FNAME);

    // PARA ACELERAR A DEPURAÇÃO DO testJsonTypeConfusionUAFSpeculative:
    // Comente os outros testes temporariamente se desejar focar nele.
    /* await testWebAssemblyInterface();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    await testSharedArrayBufferSupport();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    explainMemoryPrimitives();
    await PAUSE_S3(SHORT_PAUSE_S3);
    */

    logS3("Executando testJsonTypeConfusionUAFSpeculative (ORIGINAL CONGELANTE)...", "warn", FNAME);
    await testJsonTypeConfusionUAFSpeculative(); // Este é o seu script que itera e congela
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    /*
    await testCorruptArrayBufferStructure(); 
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    await testCoreExploitModule(logS3); 
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    */

    logS3("\n==== Script 3 CONCLUÍDO (DEBUG DO CONGELAMENTO ORIGINAL) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
