// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a nova função de teste
import { executeExploreS1LeakEffectTest } from './testExploreS1LeakEffect.mjs'; 

// import { OOB_CONFIG } from '../config.mjs'; 
// import { toHex } from '../utils.mjs';     

async function runS1LeakExplorationStrategy() {
    const FNAME_RUNNER = "runS1LeakExplorationStrategy";
    logS3(`==== INICIANDO Estratégia de Exploração do "Leak" do Script 1 ====`, 'test', FNAME_RUNNER);
    
    await executeExploreS1LeakEffectTest();
    
    logS3(`==== Estratégia de Exploração do "Leak" do Script 1 CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ExploreS1LeakEffect';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Exploração dos Efeitos da Sobrescrita do "Leak" do Script 1 ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Explore S1 Leak";
    
    await runS1LeakExplorationStrategy();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Exploração dos Efeitos da Sobrescrita do "Leak S1") ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?") || document.title.includes("CRASH")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Explore S1 Leak";
    }
}
