// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3, LONG_PAUSE_S3 } from './s3_utils.mjs'; // Importar LONG_PAUSE_S3
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

    logS3(`==== INICIANDO Script 3 (v19.0 - Diagnóstico de Parada) ====`, 'test', FNAME);

    try {
        logS3(`[${FNAME}] EXECUTANDO: testWebAssemblyInterface...`, 'info');
        await testWebAssemblyInterface();
        logS3(`[${FNAME}] CONCLUÍDO: testWebAssemblyInterface. Pausando...`, 'info');
        await PAUSE_S3(SHORT_PAUSE_S3);

        logS3(`[${FNAME}] EXECUTANDO: testSharedArrayBufferSupport...`, 'info');
        await testSharedArrayBufferSupport();
        logS3(`[${FNAME}] CONCLUÍDO: testSharedArrayBufferSupport. Pausando...`, 'info');
        await PAUSE_S3(SHORT_PAUSE_S3);

        logS3(`[${FNAME}] EXECUTANDO: explainMemoryPrimitives...`, 'info');
        explainMemoryPrimitives();
        logS3(`[${FNAME}] CONCLUÍDO: explainMemoryPrimitives. Pausando...`, 'info');
        await PAUSE_S3(SHORT_PAUSE_S3);

        // --- ISOLAR discoverStructureIDs ---
        logS3(`[${FNAME}] EXECUTANDO: discoverStructureIDs (VERSÃO DE DIAGNÓSTICO)...`, 'info');
        await discoverStructureIDs();
        logS3(`[${FNAME}] CONCLUÍDO: discoverStructureIDs. Pausando antes do teste JSON...`, 'critical'); // Log crítico para fácil visualização
        await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa um pouco mais longa aqui

        // --- Se chegou até aqui, discoverStructureIDs não crashou o script ---

        logS3(`[${FNAME}] EXECUTANDO: testJsonTypeConfusionUAFSpeculative...`, 'info');
        await testJsonTypeConfusionUAFSpeculative();
        logS3(`[${FNAME}] CONCLUÍDO: testJsonTypeConfusionUAFSpeculative. Pausando...`, 'info');
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        logS3(`[${FNAME}] EXECUTANDO: testCorruptArrayBufferStructure...`, 'info');
        await testCorruptArrayBufferStructure();
        logS3(`[${FNAME}] CONCLUÍDO: testCorruptArrayBufferStructure. Pausando...`, 'info');
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        if (typeof testCoreExploitModule === 'function') {
            logS3(`[${FNAME}] EXECUTANDO: testCoreExploitModule...`, 'info');
            await testCoreExploitModule(logS3);
            logS3(`[${FNAME}] CONCLUÍDO: testCoreExploitModule. Pausando...`, 'info');
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        } else {
            logS3(`[${FNAME}] AVISO: testCoreExploitModule não encontrado/importado.`, "warn");
        }

    } catch (e) {
        logS3(`ERRO CRÍTICO em runAllAdvancedTestsS3: ${e.name} - ${e.message}`, "critical", FNAME);
        if (e.stack) {
            logS3(e.stack, "error", FNAME);
        }
        console.error("Erro fatal no Script 3:", e);
    } finally {
        logS3(`\n==== Script 3 CONCLUÍDO (Diagnóstico de Parada) ====`, 'test', FNAME);
        if (runBtn) runBtn.disabled = false;
    }
}
