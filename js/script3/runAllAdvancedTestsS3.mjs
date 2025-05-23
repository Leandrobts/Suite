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
    const FNAME = 'runAllAdvancedTestsS3_FocusSuperMinimalToJSON';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3("==== INICIANDO Script 3: Foco no Crash com toJSON Super Minimalista ====",'test', FNAME);
    document.title = "Iniciando Script 3 - Foco toJSON SuperMinimal";

    await testJsonTypeConfusionUAFSpeculative(); // Chama a função que agora executa o teste com toJSON SuperMinimal
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    logS3("\n==== Script 3 CONCLUÍDO (Foco no Crash com toJSON Super Minimalista) ====",'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever o título se congelou ou deu erro
    } else {
        document.title = "Script 3 Concluído - toJSON SuperMinimal";
    }
}
