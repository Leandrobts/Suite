// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs'; // Nova importação
import { OOB_CONFIG } from '../config.mjs'; // Importado mas usado por módulos chamados
import { toHex } from '../utils.mjs'; // Importado mas usado por módulos chamados

// Função anterior para variar valor OOB, pode ser mantida ou removida se não for mais o foco.
async function runUAFTC_VaryingOOBValue_WithSpecRead() {
    const FNAME_RUNNER = "runUAFTC_VaryingOOBValue_WithSpecRead";
    logS3(`==== INICIANDO Testes UAF/TC Variando Valor OOB (com Checagem de Leitura Especulativa) ====`, 'test', FNAME_RUNNER);

    const valuesToWrite = [
        // { desc: "Val_FFFFFFFF", val: 0xFFFFFFFF }, // Reduzido para focar no novo teste
        { desc: "Val_00010000", val: 0x00010000 },
    ];
    const baseTestDescription = "UAFTC_SpecRead_Offset0x70";

    for (const oobValue of valuesToWrite) {
        const testDescription = `${baseTestDescription}_${oobValue.desc}`;
        logS3(`\n--- Executando Teste UAF/TC (SpecRead): ${testDescription} (Valor OOB: ${toHex(oobValue.val)}) ---`, 'subtest', FNAME_RUNNER);
        let result = await executeUAFTypeConfusionTestWithValue(testDescription, oobValue.val);
        if (result.potentiallyFroze) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);
    }
    logS3(`==== Testes UAF/TC Variando Valor OOB (Leitura Especulativa) CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_Main';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3 Avançado ====`,'test', FNAME);
    document.title = "Iniciando Script 3 Avançado";

    // --- FOCO PRINCIPAL: Teste de Corrupção Direta de Estrutura ArrayBuffer ---
    logS3(`\n--- Sub-Teste: Corrupção Direta de Estrutura ArrayBuffer ---`, 'subtest', FNAME);
    logS3(`   AVISO: Este teste requer que KNOWN_STRUCTURE_IDS.ArrayBuffer em config.mjs esteja correto`, "warn", FNAME);
    logS3(`   E que search_base_address_str/search_range_bytes em testCorruptArrayBufferStructure.mjs sejam ajustados!`, "warn", FNAME);
    await testCorruptArrayBufferStructure();
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`--- Sub-Teste: Corrupção Direta de Estrutura ArrayBuffer CONCLUÍDO ---`, 'subtest', FNAME);

    // Opcional: Executar os testes anteriores de variação de OOB, se desejar.
    // logS3(`\n--- Sub-Teste: Variação de Valor OOB com Leitura Especulativa (Opcional) ---`, 'subtest', FNAME);
    // await runUAFTC_VaryingOOBValue_WithSpecRead();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // logS3(`--- Sub-Teste: Variação de Valor OOB com Leitura Especulativa CONCLUÍDO ---`, 'subtest', FNAME);

    logS3(`\n==== Script 3 Avançado CONCLUÍDO ====`,'test', FNAME);
    document.title = "Script 3 Avançado Concluído";
    if (runBtn) runBtn.disabled = false;
}
