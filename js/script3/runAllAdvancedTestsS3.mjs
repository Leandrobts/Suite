// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Importar todos os testes automatizados do Script 3
import { testWebAssemblyInterface } from './testWebAssembly.mjs';
// Crie os arquivos .mjs correspondentes para os testes abaixo e importe-os
// import { testSharedArrayBufferSupport } from './testSharedArrayBuffer.mjs';
// import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';


export async function runAllAdvancedTestsS3() { // Renomeado para não conflitar com o original
    const FNAME = 'runAllAdvancedTestsS3_Modular';
    const runBtnAdvancedS3 = getRunBtnAdvancedS3();
    const outputDivS3 = getOutputAdvancedS3();

    if (runBtnAdvancedS3) runBtnAdvancedS3.disabled = true;
    if (outputDivS3) outputDivS3.innerHTML = ''; 
    
    logS3("==== INICIANDO Script 3: Ferramentas e Testes Avançados (v19.0 - Modular) ====", 'test', FNAME);

    await testWebAssemblyInterface(); await PAUSE_S3(MEDIUM_PAUSE_S3);
    
    // Adicione chamadas para outros testes S3 aqui
    // if(typeof testSharedArrayBufferSupport === 'function') await testSharedArrayBufferSupport(); else logS3("testSharedArrayBufferSupport não importado", "warn", FNAME);
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // if(typeof explainMemoryPrimitives === 'function') explainMemoryPrimitives(); else logS3("explainMemoryPrimitives não importado", "warn", FNAME);
    // await PAUSE_S3(SHORT_PAUSE_S3);
    logS3("AVISO: Muitos testes/ferramentas do Script 3 não foram completamente portados/chamados nesta demo modular.", "warn", FNAME);


    logS3("\n==== Script 3 CONCLUÍDO (Testes Automáticos - Modular) ====", 'test', FNAME);
    if (runBtnAdvancedS3) runBtnAdvancedS3.disabled = false;
}
