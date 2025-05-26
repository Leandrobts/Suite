// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a função de teste principal do arquivo correto
import { executeSprayAndProbeComplexObjects_SpecificToJSON } from './testSprayComplexObjects.mjs'; 
// import { executeAggressiveABFingerprintTest } from './testAggressiveFingerprintAB.mjs'; // Comentado por enquanto


async function runInvestigateComplexObjectInteraction() {
    const FNAME_RUNNER = "runInvestigateComplexObjectInteraction";
    logS3(`==== INICIANDO Investigação da Interação com Objetos Complexos Pós-Corrupção ====`, 'test', FNAME_RUNNER);

    const result = await executeSprayAndProbeComplexObjects_SpecificToJSON();
    
    if (result && (result.sprayError || result.oobError || result.oobWriteError)) {
        logS3(`   Falha na configuração do teste. Verifique os logs.`, "error", FNAME_RUNNER);
    } else if (result && result.error) {
        logS3(`   ---> PROBLEMA DETECTADO DURANTE A SONDAGEM: ${result.error.name} - ${result.error.message} (Objeto Index: ${result.index})`, "critical", FNAME_RUNNER);
         if (result.error.name === 'RangeError') {
            logS3(`       RangeError confirmado. A toJSON_ProbeMyComplexObjectSpecific ainda causa recursão.`, "vuln", FNAME_RUNNER);
         }
    } else if (result && result.integrityOK === false ) { // Checagem se o retorno tem essa propriedade
         logS3(`   ---> PROBLEMA DETECTADO: FALHA DE INTEGRIDADE no objeto ${result.index}`, "critical", FNAME_RUNNER);
    }
     else {
        logS3(`   Sondagem dos primeiros objetos completou sem RangeError ou falha de integridade óbvia.`, "good", FNAME_RUNNER);
    }
    
    logS3(`==== Investigação da Interação com Objetos Complexos CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_InvestigateComplexObjInteraction';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Investigação da Interação com Objetos Complexos Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Investiga ComplexObj Interaction";
    
    await runInvestigateComplexObjectInteraction();
    
    // Se quiser rodar o fingerprinting depois:
    // logS3(`\n==== Iniciando Teste de Fingerprinting Agressivo (APÓS InvestigateComplex) ====\n`, 'test', FNAME);
    // await executeAggressiveABFingerprintTest();
    // logS3(`\n==== Teste de Fingerprinting Agressivo CONCLUÍDO ====\n`, 'test', FNAME);
    
    logS3(`\n==== Script 3 CONCLUÍDO (Investigação ComplexObj Interaction) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("CORRUPTED") || document.title.includes("SUCCESS") || document.title.includes("ERRO") || document.title.includes("RangeError") || document.title.includes("PROBLEM")) {
        // Manter títulos que indicam resultados específicos
    }
    else {
        document.title = "Script 3 Concluído - Investiga ComplexObj Interaction";
    }
}
