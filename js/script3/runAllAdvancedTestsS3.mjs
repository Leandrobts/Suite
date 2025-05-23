// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Certifique-se que esta é a importação correta para a função modificada
import { testJsonTypeConfusionUAFSpeculative } from './testJsonTypeConfusionUAFSpeculative.mjs'; 
// Comente outros para focar
/*
import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
import { testCoreExploitModule } from '../core_exploit.mjs'; 
import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';
*/

export async function runAllAdvancedTestsS3() { 
    const FNAME = 'runAllAdvancedTestsS3_AttemptTypeConfusionExploit';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3("==== INICIANDO Script 3: Tentativa de Exploração de Type Confusion ====",'test', FNAME);
    document.title = "Iniciando Script 3 - Tentativa Exploração TC";

    await testJsonTypeConfusionUAFSpeculative(); // Chama a função que agora executa o teste focado de exploração
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    logS3("\n==== Script 3 CONCLUÍDO (Tentativa de Exploração de Type Confusion) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
