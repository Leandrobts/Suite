// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize a importação para a nova função de teste
import { executeFullFreezeScenarioTest, currentCallCount_toJSON } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

const ppKeyConst = 'toJSON';

// --- DEFINIÇÕES DAS VARIANTES DA FUNÇÃO toJSON ---
// (Estas são as mesmas funções da sua resposta anterior: V1 a V6)

// Variante 1: Lógica "v2 - Refinado Congelante"
function toJSON_Variant1_FullRefined() {
    // Acessa currentCallCount_toJSON do módulo importado
    // O reset de currentCallCount_toJSON é feito em executeFullFreezeScenarioTest
    currentCallCount_toJSON++; 
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V1_Full(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) { // Canary para a primeira chamada
        document.title = `toJSON Call ${currentCallCount_toJSON} (V1_FullRefined)`;
    }
    if (currentCallCount_toJSON <= 3) { // Logar um pouco mais no início
      logS3(`[${ppKeyConst} Poluído - V1] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "vuln");
    }

    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
    try {
        details.byteLength = currentOperationThis.byteLength;
        if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
            let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
            let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
            if (bufferToView.byteLength >= offsetInView + 4) {
               details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
            }
        }
        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        if (currentCallCount_toJSON <= 3) {
            logS3(`  [CALL ${currentCallCount_toJSON}] Detalhes V1: byteLength=${details.byteLength}, 1stDword=${(details.first_dword === "N/A" || typeof details.first_dword === 'string') ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info");
        }
        return { toJSON_executed_V1: true, details_byteLength: details.byteLength, call: currentCallCount_toJSON };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V1] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${currentCallCount_toJSON} (V1)`;
        return { toJSON_error_V1: true, message: e.message, call: currentCallCount_toJSON };
    }
}

// Variante 2: Sem new DataView / first_dword
function toJSON_Variant2_NoDataView() {
    currentCallCount_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V2_NoDataView(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V2_NoDataView)`;
    if (currentCallCount_toJSON <= 3) logS3(`[${ppKeyConst} Poluído - V2] ${FNAME_toJSON} Chamado!`, "vuln");
    try {
        let details = { byteLength: currentOperationThis.byteLength, slice_exists: (typeof currentOperationThis.slice === 'function') };
        if (currentCallCount_toJSON <= 3) logS3(`  [CALL ${currentCallCount_toJSON}] Detalhes V2: byteLength=${details.byteLength}, slice_exists=${details.slice_exists}`, "info");
        return { toJSON_executed_V2: true, details_byteLength: details.byteLength, call: currentCallCount_toJSON };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V2] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${currentCallCount_toJSON} (V2)`;
        return { toJSON_error_V2: true, message: e.message, call: currentCallCount_toJSON };
    }
}

// Adicione as Variantes 3, 4, 5, 6 aqui, adaptando-as para usar currentCallCount_toJSON
// e a estrutura de logging/canary similar à V1 e V2 se desejar. Exemplo para V6:

function toJSON_Variant6_NoOp() {
    currentCallCount_toJSON++;
    const FNAME_toJSON = `toJSON_V6_NoOp(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V6_NoOp)`;
    if (currentCallCount_toJSON <= 3) {
      logS3(`[${ppKeyConst} Poluído - V6] ${FNAME_toJSON} Chamado!`, "vuln");
    }
    return {toJSON_executed_V6: true, call: currentCallCount_toJSON}; // Retornar algo para evitar problemas com stringify
}


async function runSimplificationStepByStep_WithJSONStringify() {
    const FNAME_RUNNER = "runSimplificationStepByStep_WithJSONStringify";
    logS3(`==== INICIANDO Testes de Simplificação Iterativa do toJSON (COM JSON.stringify) ====`, 'test', FNAME_RUNNER);

    const testsToRun = [
        { desc: "V1_FullRefined_WithJSON", func: toJSON_Variant1_FullRefined },
        { desc: "V2_NoDataView_WithJSON", func: toJSON_Variant2_NoDataView },
        // Adicione aqui as outras variantes simplificadas (V3 a V5)
        { desc: "V6_NoOp_WithJSON", func: toJSON_Variant6_NoOp },
    ];

    for (const test of testsToRun) {
        logS3(`\n--- Executando com toJSON Lógica: ${test.desc} ---`, 'subtest', FNAME_RUNNER);
        await executeFullFreezeScenarioTest(test.desc, test.func); // Chama a função de teste atualizada
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${test.desc}: ${document.title}`, "info");
    }

    logS3(`==== Testes de Simplificação Iterativa do toJSON (COM JSON.stringify) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_SimplifyToJSON_WithStringify';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Simplificação toJSON COM JSON.stringify para Congelamento ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Simplificação toJSON + Stringify";
    
    await runSimplificationStepByStep_WithJSONStringify();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Simplificação toJSON COM JSON.stringify) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
