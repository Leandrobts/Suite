// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
// OOB_CONFIG e toHex não são mais necessários aqui diretamente.

// Função toJSON para tentar reproduzir o TypeError
// Baseada na toJSON_ConfirmationNotCalled que parecia ser o gatilho do TypeError no log do depurador.
function toJSON_FocusTypeError() {
    // Usa o contador exportado de testJsonTypeConfusionUAFSpeculative.mjs
    current_toJSON_call_count_for_TypeError_test++; 
    const FNAME_toJSON = "toJSON_FocusTypeError_Internal";

    // LogS3 e document.title aqui são cruciais para ver se a função é chamada
    // e se o erro ocorre nesta linha, como indicado pelas stack traces anteriores.
    logS3(`[toJSON_FocusTypeError] Chamada ${current_toJSON_call_count_for_TypeError_test}! this: ${typeof this}, constructor: ${this?.constructor?.name}`, "critical", FNAME_toJSON);
    document.title = `toJSON_FocusTypeError Call ${current_toJSON_call_count_for_TypeError_test}`;
    
    // Retorna um objeto simples, como a toJSON_ConfirmationNotCalled fazia implicitamente ao logar e retornar.
    return { "in_toJSON_FocusTypeError": true, "call_number": current_toJSON_call_count_for_TypeError_test };
}


async function runSingleTypeErrorReproTest() {
    const FNAME_RUNNER = "runSingleTypeErrorReproTest";
    logS3(`==== INICIANDO Teste Único para Reprodução do TypeError ====`, 'test', FNAME_RUNNER);

    const testDescription = "ReproduceTypeError_0x70_FFFF_SimpleToJSON";
    
    await executeFocusedTestForTypeError(
        testDescription,
        toJSON_FocusTypeError // Passa a função toJSON a ser usada
    );

    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");

    logS3(`==== Teste Único para Reprodução do TypeError CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ReproduceTypeError';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Reproduzir TypeError Específico ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Reprodução TypeError";
    
    await runSingleTypeErrorReproTest();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Reproduzir TypeError Específico) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever título
    } else {
        document.title = "Script 3 Concluído - Reprodução TypeError";
    }
}
