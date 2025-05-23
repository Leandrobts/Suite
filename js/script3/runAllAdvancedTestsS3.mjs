// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize a importação para a nova função de teste principal
import { executeVerifyAndExploitThisConfusionAttempt } from './testJsonTypeConfusionUAFSpeculative.mjs';

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_VerifyAndExploitThisConfusion';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Verificação e Tentativa de Exploração de Type Confusion em 'this' ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Verify & Exploit 'this' TC";

    // Chama a função de teste atualizada
    await executeVerifyAndExploitThisConfusionAttempt();

    logS3(`\n==== Script 3 CONCLUÍDO (Verificação e Tentativa de Exploração de Type Confusion em 'this') ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;

    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever título se congelou ou erro no início
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    }
    else {
        document.title = "Script 3 Concluído - Verify & Exploit 'this' TC";
    }
}
