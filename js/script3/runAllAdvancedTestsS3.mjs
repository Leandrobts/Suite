// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
// Importa a função de teste principal e as novas toJSONs do arquivo correto
import { 
    executeSprayAndProbeComplexObjects_MinimalToJSON,
    toJSON_Complex_V0_EmptyReturn,
    toJSON_Complex_V1_ToStringCallThis,
    toJSON_Complex_V2_AccessThisId,
    toJSON_Complex_V3_ToStringAndId
} from './testSprayComplexObjects.mjs'; 

// O executeAggressiveABFingerprintTest pode ser chamado depois, se desejado.
// import { executeAggressiveABFingerprintTest } from './testAggressiveFingerprintAB.mjs'; 


async function runInvestigateComplexObjectRangeError() {
    const FNAME_RUNNER = "runInvestigateComplexObjectRangeError";
    logS3(`==== INICIANDO Investigação do RangeError com Objetos Complexos ====`, 'test', FNAME_RUNNER);

    const toJSON_variants = [
        { name: "toJSON_Complex_V0_EmptyReturn", func: toJSON_Complex_V0_EmptyReturn },
        { name: "toJSON_Complex_V1_ToStringCallThis", func: toJSON_Complex_V1_ToStringCallThis },
        { name: "toJSON_Complex_V2_AccessThisId", func: toJSON_Complex_V2_AccessThisId },
        { name: "toJSON_Complex_V3_ToStringAndId", func: toJSON_Complex_V3_ToStringAndId }
    ];

    for (const variant of toJSON_variants) {
        logS3(`\n exécutant avec toJSON: ${variant.name}`, "info", FNAME_RUNNER);
        const result = await executeSprayAndProbeComplexObjects_MinimalToJSON(variant.func, variant.name);
        
        if (result && (result.sprayError || result.oobError || result.oobWriteError)) {
            logS3(`   Falha na configuração do teste para ${variant.name}. Abortando mais variantes.`, "error", FNAME_RUNNER);
            break;
        }
        if (result && result.error) { // Se um erro foi pego durante stringify/toJSON
            logS3(`   ---> ${variant.name} CAUSOU ERRO: ${result.error.name} - ${result.error.message} (Objeto Index: ${result.index})`, "critical", FNAME_RUNNER);
             if (result.error.name === 'RangeError') {
                logS3(`   RangeError confirmado com ${variant.name}. Esta pode ser a causa da recursão.`, "vuln", FNAME_RUNNER);
                // Não necessariamente paramos aqui, podemos querer ver se outras também causam
             }
        } else if (result && result.integrityOK === false) {
            logS3(`   ---> ${variant.name} NÃO CAUSOU ERRO de stringify, MAS DETECTOU FALHA DE INTEGRIDADE no objeto ${result.index}`, "critical", FNAME_RUNNER);
        } else {
            logS3(`   ${variant.name} completou sem RangeError ou falha de integridade nos primeiros objetos sondados.`, "good", FNAME_RUNNER);
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        if (document.title.includes("CRASH") || document.title.includes("CORRUPTED") || (result && result.error && result.error.name === 'RangeError')) {
             logS3(`   Problema significativo (RangeError, Crash ou Corrupção) detectado com ${variant.name}. Verifique e decida se continua.`, "warn", FNAME_RUNNER);
             // break; // Descomente para parar após o primeiro RangeError
        }
    }
    
    logS3(`==== Investigação do RangeError com Objetos Complexos CONCLUÍDA ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_InvestigateRangeError';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Investigação do RangeError com Objetos Complexos Pós-Corrupção ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Investiga RangeError ComplexObj";
    
    await runInvestigateComplexObjectRangeError();
    
    // Se quiser rodar o fingerprinting depois:
    // logS3(`\n==== Iniciando Teste de Fingerprinting Agressivo (APÓS RangeError Investigate) ====\n`, 'test', FNAME);
    // await executeAggressiveABFingerprintTest();
    // logS3(`\n==== Teste de Fingerprinting Agressivo CONCLUÍDO ====\n`, 'test', FNAME);
    
    logS3(`\n==== Script 3 CONCLUÍDO (Investigação RangeError ComplexObj) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("CONGELOU?")) {
        // Manter
    } else if (document.title.includes("CORRUPTED") || document.title.includes("SUCCESS") || document.title.includes("ERRO") || document.title.includes("RangeError")) {
        // Manter títulos que indicam resultados específicos
    }
    else {
        document.title = "Script 3 Concluído - Investiga RangeError ComplexObj";
    }
}
