// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';

import { testWebAssemblyInterface } from './testWebAssembly.mjs';
import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
import { testJsonTypeConfusionUAFSpeculative } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';
import { discoverStructureIDs } from './readStructureIDs.mjs';
import { testCoreExploitModule } from '../core_exploit.mjs';

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_Modular';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3("==== INICIANDO Script 3: Testes Avançados Automatizados (v19.0 - Modular com Descoberta de IDs) ====", 'test', FNAME);

    await testWebAssemblyInterface();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    await testSharedArrayBufferSupport();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    explainMemoryPrimitives();
    await PAUSE_S3(SHORT_PAUSE_S3);

    await discoverStructureIDs();
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3("Continuando com outros testes avançados após a tentativa de descoberta de IDs...", "info", FNAME);

    await testJsonTypeConfusionUAFSpeculative();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    await testCorruptArrayBufferStructure();
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    if (typeof testCoreExploitModule === 'function') {
        await testCoreExploitModule(logS3);
        await PAUSE_S3(MEDIUM_PAUSE_S3);
    } else {
        logS3("AVISO: testCoreExploitModule não encontrado/importado.", "warn", FNAME);
    }

    logS3("\n==== Script 3 CONCLUÍDO (Testes Automáticos - Modular) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
