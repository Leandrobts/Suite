// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// A função agora é importada do arquivo que a contém
import { executeCorruptAndReadZoneTest } from './testJsonTypeConfusionUAFSpeculative.mjs'; 
// ^^^ Certifique-se que este nome de arquivo ('testJsonTypeConfusionUAFSpeculative.mjs') 
// é onde você colou o código do Bloco 1 acima.

import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

async function runCorruptAndReadZoneInvestigation() {
    const FNAME_RUNNER = "runCorruptAndReadZoneInvestigation";
    logS3(`==== INICIANDO Investigação de Corrupção e Leitura de Zona de Memória ====`, 'test', FNAME_RUNNER);

    const corruptionOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const valueToWrite = 0xFFFFFFFF;

    await executeCorruptAndReadZoneTest(corruptionOffset, valueToWrite);

    // Você pode adicionar mais chamadas com diferentes 'valueToWrite' ou 'corruptionOffset' aqui se desejar.
    // Exemplo:
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // logS3(`\n--- Testando Corrupção em ${toHex(corruptionOffset)} com valor 0x00000000 ---`, 'subtest', FNAME_RUNNER);
    // await executeCorruptAndReadZoneTest(corruptionOffset, 0x00000000);


    logS3(`==== Investigação de Corrupção e Leitura de Zona CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_CorruptReadZone';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Investigação de Corrupção e Leitura de Zona de Memória ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Corrupt & Read Zone";
    
    await runCorruptAndReadZoneInvestigation();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Investigação de Corrupção e Leitura de Zona) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Corrupt & Read Zone";
    }
}
