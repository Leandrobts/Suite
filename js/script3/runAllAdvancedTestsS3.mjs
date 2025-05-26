// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa as novas funções de teste
import { executeSprayAndCorruptComplexObjectsTest } from './testSprayComplexObjects.mjs'; 
import { executeAggressiveABFingerprintTest } from './testAggressiveFingerprintAB.mjs'; 


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_ComplexAndFingerprint';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Corrupção de Objetos Complexos e Fingerprinting Agressivo ====`,'test', FNAME);
    
    // Teste 1: Corrupção Indireta de Objetos Complexos Pulverizados
    document.title = "Iniciando Script 3 - Spray Complex Objs";
    await executeSprayAndCorruptComplexObjectsTest();
    logS3(`\n==== Teste de Spray de Objetos Complexos CONCLUÍDO ====\n`, 'test', FNAME);
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Teste 2: Fingerprinting Agressivo do oob_array_buffer_real
    if (!document.title.startsWith("CORRUPTED") && !document.title.startsWith("SUCCESS")) { // Só prossegue se o anterior não achou algo drástico
        document.title = "Iniciando Script 3 - Aggro AB Fingerprint";
        await executeAggressiveABFingerprintTest();
        logS3(`\n==== Teste de Fingerprinting Agressivo CONCLUÍDO ====\n`, 'test', FNAME);
    } else {
        logS3("Pulando Fingerprinting Agressivo devido a resultado crítico no teste anterior.", "warn", FNAME);
    }
    
    logS3(`\n==== Script 3 CONCLUÍDO (Corrupção Complexa & Fingerprint) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    // Ajuste final do título
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("CORRUPTED") || document.title.includes("SUCCESS")) {
        // Manter
    }
    else {
        document.title = "Script 3 Concluído - Complex & Fingerprint";
    }
}
