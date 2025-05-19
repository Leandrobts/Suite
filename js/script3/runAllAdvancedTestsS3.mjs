// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Importar todos os testes automatizados do Script 3
import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';


export async function runAllAdvancedTestsS3() { 
    const FNAME = 'runAllAdvancedTestsS3_Modular'; // Nome da função JS
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = ''; 
    
    logS3("==== INICIANDO Script 3: Testes Avançados Automatizados (v19.0 - Modular) ====", 'test', FNAME);

    await testWebAssemblyInterface(); 
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    await testSharedArrayBufferSupport(); 
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    explainMemoryPrimitives(); // Esta função não é async no original, mas podemos dar uma pausa depois
    await PAUSE_S3(SHORT_PAUSE_S3);
    
    // As ferramentas de ROP e Memory Viewer são interativas e chamadas por botões separados em main.mjs

    logS3("\n==== Script 3 CONCLUÍDO (Testes Automáticos - Modular) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
