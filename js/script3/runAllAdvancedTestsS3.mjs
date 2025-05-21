// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeTypeErrorInvestigationTest, currentCallCount_toJSON_for_typeerror_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; // Necessário se usado diretamente, mas os parâmetros estão em FOCUSED_TEST_PARAMS
import { toHex } from '../utils.mjs';

const ppKeyConst = 'toJSON'; // Apenas para a função toJSON de exemplo

// Função toJSON mínima para o Teste 1A (para confirmar que não é chamada)
function toJSON_ConfirmationNotCalled() {
    // LogS3 e document.title aqui seriam a "prova de fogo"
    logS3(`!!!! ERRO INESPERADO: toJSON_ConfirmationNotCalled FOI CHAMADA !!!! (Chamada ${currentCallCount_toJSON_for_typeerror_test + 1})`, "error");
    document.title = "ERRO: toJSON FOI CHAMADA!";
    currentCallCount_toJSON_for_typeerror_test++; 
    return { toJSON_was_called_unexpectedly: true };
}


async function runTypeErrorInvestigation() {
    const FNAME_RUNNER = "runTypeErrorInvestigation";
    logS3(`==== INICIANDO Investigação do TypeError em JSON.stringify ====`, 'test', FNAME_RUNNER);

    // Teste 1A: COM PP (usando toJSON_ConfirmationNotCalled), COM Escrita OOB.
    // Esperado: TypeError antes de toJSON_ConfirmationNotCalled ser chamada.
    logS3(`\n--- Teste 1A: OOB + PP (Esperado TypeError ANTES da toJSON ser chamada) ---`, 'subtest', FNAME_RUNNER);
    await executeTypeErrorInvestigationTest(
        "TypeError_OOB_With_PP",
        true, // applyPrototypePollution
        toJSON_ConfirmationNotCalled 
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 1B: Variante de 1A para garantir que o contador de chamadas seja logado corretamente se a toJSON for chamada
     logS3(`\n--- Teste 1B: OOB + PP (Verificar Chamadas toJSON se TypeError não ocorrer) ---`, 'subtest', FNAME_RUNNER);
    await executeTypeErrorInvestigationTest(
        "TypeError_OOB_With_PP_CallCheck",
        true, 
        function() { // Uma toJSON que apenas incrementa e retorna algo simples
            currentCallCount_toJSON_for_typeerror_test++;
            logS3(`toJSON_CallCheck_Variant: Chamada ${currentCallCount_toJSON_for_typeerror_test}`, "info");
            if(currentCallCount_toJSON_for_typeerror_test ===1) document.title = "toJSON Chamada 1 (CallCheck)";
            return {called: currentCallCount_toJSON_for_typeerror_test};
        }
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    // Teste 2: SEM PP, COM Escrita OOB.
    // Esperado: Sem TypeError, JSON.stringify deve funcionar normalmente para ArrayBuffer (retornar {}).
    logS3(`\n--- Teste 2: OOB SEM PP (Esperado JSON.stringify normal) ---`, 'subtest', FNAME_RUNNER);
    await executeTypeErrorInvestigationTest(
        "TypeError_OOB_Without_PP",
        false, // applyPrototypePollution
        null   // toJSONFunctionToUse (não será usada)
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Investigação do TypeError em JSON.stringify CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_TypeErrorInvestigate';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Investigação do TypeError em JSON.stringify ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Investigação TypeError";
    
    await runTypeErrorInvestigation();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Investigação do TypeError em JSON.stringify) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
