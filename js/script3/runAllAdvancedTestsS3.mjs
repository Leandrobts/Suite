// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs'; // SHORT_PAUSE_S3 removido se não usado
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

// Importa apenas o teste focado que queremos executar
import { runSingleFocusedFreezingTest } from './testJsonTypeConfusionUAFSpeculative.mjs';

// Comente as importações de outros testes para focar totalmente
/*
import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
import { testCoreExploitModule } from '../core_exploit.mjs';
import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';
*/

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_FocusOriginalFreeze';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Congelamento Focado com Lógica Original toJSON ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Teste Congelamento Original";

    // Chama diretamente o teste focado
    await runSingleFocusedFreezingTest();

    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa ao final

    logS3(`\n==== Script 3 CONCLUÍDO (Teste de Congelamento Focado com Lógica Original toJSON) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    if (document.title.startsWith("CONGELOU?") || document.title.startsWith("ERRO")) {
        // Mantém o título de erro/congelamento
    } else {
        document.title = "Script 3 Concluído - Teste Congelamento Original";
    }
}
