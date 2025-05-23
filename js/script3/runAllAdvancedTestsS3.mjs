// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize a importação para a nova função de teste principal
import { executeTypeConfusionExploitAttempt_SimplifiedReturn } from './testJsonTypeConfusionUAFSpeculative.mjs';

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ExploitTypeConfusion_SimplifiedReturn';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Exploração de Type Confusion (Retorno Simplificado) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Exploração TC (Retorno Simplificado)";

    // Chama a função de teste atualizada
    await executeTypeConfusionExploitAttempt_SimplifiedReturn();

    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Exploração de Type Confusion - Retorno Simplificado) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;

    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever título se congelou ou erro no início
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Exploração TC (SR)";
    }
}
