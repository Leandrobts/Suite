// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs'; // SHORT_PAUSE_S3 removido se não usado
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Importa apenas o teste focado que queremos executar
import { runSpecificFreezingTest_0x70_FFFF } from './testJsonTypeConfusionUAFSpeculative.mjs';

// Comente as importações de outros testes para focar
// import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
// import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
// import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
// import { testCoreExploitModule } from '../core_exploit.mjs';
// import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusFreeze_0x70_FFFF'; // Nome reflete o foco
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Congelamento Focado (Offset 0x70, Valor 0xFFFFFFFF) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Teste Congelamento";

    // Chama diretamente o teste focado
    await runSpecificFreezingTest_0x70_FFFF();

    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`\n==== Script 3 CONCLUÍDO (Teste de Congelamento Focado) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    // document.title será definido dentro do teste ou ao final dele.
}
