// Em runAllAdvancedTestsS3.mjs
async function runFocusedTest_ToRecreateFreeze() {
    const FNAME_RUNNER = "runFocusedTest_ToRecreateFreeze";
    logS3(`==== INICIANDO TESTE DIRECIONADO (Recriar Congelamento Original com 0x70 e 0xFFFFFFFF) ====`, 'test', FNAME_RUNNER);

    await runSpecificJsonTypeConfusionTest(
        "AttemptRecreateFreeze_0x70_FFFF_PP_SimpleToJSON_MinLog",
        0x70,       // corruptionOffset
        0xFFFFFFFF, // valueToWrite
        true,       // enablePP
        true,       // attemptOOBWrite
        false       // skipOOBEnvironmentSetup
    );
    logS3(`==== TESTE DIRECIONADO (Recriar Congelamento Original) CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_RecreateFreeze';
    // ... (setup do botão e outputDiv) ...
    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';
    logS3(`==== INICIANDO Script 3: Tentativa de Recriar Congelamento Original ====`,'test', FNAME);
    await runFocusedTest_ToRecreateFreeze();
    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Recriar Congelamento Original) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
