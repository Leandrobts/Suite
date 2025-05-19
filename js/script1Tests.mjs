// js/script1Tests.mjs
import { logS1 } from './logger.mjs';
import { PAUSE_FUNC, toHex } from './utils.mjs';
import { setButtonDisabled, clearOutput, getEl } from './domUtils.mjs';
// Se precisar de OOB_CONFIG ou JSC_OFFSETS aqui para algum teste específico, importe de './config.mjs';
// Por enquanto, os testes do S1 não usam diretamente os offsets de estrutura do config.mjs.

const SHORT_PAUSE_S1 = 50;
const MEDIUM_PAUSE_S1 = 500;
let leakedValueFromOOB_S1 = null; // Estado gerenciado internamente

// Funções de ajuda específicas do S1
const isPotentialPointer64S1 = (high, low) => {
    if (high === null || low === null || typeof high !== 'number' || typeof low !== 'number') return false;
    if (high === 0 && low === 0) return false;
    if (high === 0xFFFFFFFF && low === 0xFFFFFFFF) return false;
    if (high === 0xAAAAAAAA && low === 0xAAAAAAAA) return false;
    if (high === 0xAAAAAAEE && low === 0xAAAAAAAA) return false; // Adicionado com base nos seus logs
    if (high === 0xAAAAAAAA && low === 0xAAAAAAEE) return false; // Adicionado com base nos seus logs
    if (high === 0 && low < 0x100000) return false; // Evitar ponteiros para endereços muito baixos (possíveis falsos positivos)
    return true;
};

const isPotentialData32S1 = (val) => {
    if (val === null || typeof val !== 'number') return false;
    val = val >>> 0;
    if (val === 0 || val === 0xFFFFFFFF || val === 0xAAAAAAAA || val === 0xAAAAAAEE) return false;
    if (val < 0x1000) return false; // Evitar dados muito pequenos (possíveis falsos positivos)
    return true;
};

async function testCSPBypassS1() {
    const FNAME = 'testCSPBypassS1';
    logS1("--- Iniciando Teste 1: XSS Básico (Script 1) ---", 'test', FNAME);
    const xssTargetDiv = getEl('xss-target-div');

    // Teste com data: URI
    try {
        // Para comunicar de volta ao logger principal a partir de um contexto diferente (como o data: URI)
        // usamos parent.postMessage. O main.mjs deve ter um listener para isso.
        const payloadJS = `try { parent.postMessage({ type: 'logS1', args: ["[Payload Data:] Alerta data: URI executado!", "vuln", "XSS Payload"] }, '*'); alert('XSS S1 via Data URI!'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["[Payload Data:] Alerta data: URI bloqueado: " + e.message, "good", "XSS Payload"] }, '*'); }`;
        const encodedPayload = btoa(payloadJS);
        const scriptTag = document.createElement('script');
        scriptTag.src = 'data:text/javascript;base64,' + encodedPayload;
        scriptTag.onerror = (e) => { logS1(`ERRO: Falha carregar script data: URI! Event: ${e.type}`, 'error', FNAME); };
        document.body.appendChild(scriptTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2);
        document.body.removeChild(scriptTag);
    } catch (e) {
        logS1(`Erro ao criar/adicionar script data: URI: ${e.message}`, 'error', FNAME);
    }
    await PAUSE_FUNC(SHORT_PAUSE_S1);

    // Teste com img onerror
    try {
        const imgTag = document.createElement('img');
        const imgSrc = 'invalid_img_' + Date.now();
        imgTag.src = imgSrc;
        const onerrorPayload = ` try { const target = document.getElementById('xss-target-div'); if (target) { target.innerHTML += '<br><span class="log-vuln">XSS S1 DOM via ONERROR Executado!</span>'; parent.postMessage({ type: 'logS1', args: ["XSS DOM via onerror OK!", "vuln", "ONERROR Payload"] }, '*'); } else { parent.postMessage({ type: 'logS1', args: ["Alvo XSS DOM não encontrado.", "error", "ONERROR Payload"] }, '*'); } alert('XSS_S1_DOM_ONERROR'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["Erro payload onerror: " + e.message, "warn", "ONERROR Payload"] }, '*'); } `;
        imgTag.setAttribute('onerror', onerrorPayload);
        document.body.appendChild(imgTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2); // Dar tempo para o erro carregar
        if (imgTag.parentNode) document.body.removeChild(imgTag);
    } catch (e) {
        logS1(`Erro ao criar/adicionar img onerror: ${e.message}`, 'error', FNAME);
    }
    await PAUSE_FUNC(SHORT_PAUSE_S1);

    // Teste com javascript: href (requer clique manual)
    try {
        const link = document.createElement('a');
        link.href = "javascript:try{parent.postMessage({ type: 'logS1', args: ['[Payload JS Href:] Executado!', 'vuln', 'XSS Payload JS Href']},'*'); alert('XSS S1 via JS Href!');}catch(e){parent.postMessage({ type: 'logS1', args: ['[Payload JS Href:] Bloqueado: '+e.message,'good','XSS Payload JS Href']},'*');}";
        link.textContent = "[Test Link JS Href - Clique Manual]";
        link.style.display = 'block';
        link.style.color = 'cyan';
        if (xssTargetDiv) xssTargetDiv.appendChild(link);
        logS1("Adicionado link javascript: href para teste manual.", 'info', FNAME);
    } catch(e) {
        logS1(`Erro ao criar link js: href: ${e.message}`, 'error', FNAME);
    }
    logS1("--- Teste 1 Concluído ---", 'test', FNAME);
}

async function testOOBReadInfoLeakEnhancedStoreS1() {
    const FNAME = 'testOOBReadInfoLeakEnhancedStoreS1';
    logS1("--- Iniciando Teste 2: OOB Write/Read (Leak) ---", 'test', FNAME);
    const bufferSize = 32; const writeValue = 0xEE; const oobWriteOffset = bufferSize;
    const readRangeStart = -64; const readRangeEnd = bufferSize + 64;
    const allocationSize = bufferSize + 256; // Poderia usar OOB_CONFIG.ALLOCATION_SIZE do config.mjs
    const baseOffsetInBuffer = 128;       // Poderia usar OOB_CONFIG.BASE_OFFSET_IN_DV

    let writeSuccess = false; let potentialLeakFoundCount = 0;
    leakedValueFromOOB_S1 = null; // Reset global state for this script

    try {
        const buffer = new ArrayBuffer(allocationSize);
        const dataView = new DataView(buffer);
        for (let i = 0; i < buffer.byteLength; i++) { dataView.setUint8(i, 0xAA); } // Preencher com padrão conhecido
        const writeTargetAddress = baseOffsetInBuffer + oobWriteOffset;
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        try {
            // Simular a escrita OOB. Em um navegador real, isso pode ou não causar um erro dependendo do motor JS e da vulnerabilidade.
            // Para o propósito deste teste, assumimos que a escrita DENTRO do DataView mas FORA dos limites lógicos do "bufferSize" original é o alvo.
            // Se a intenção é corromper metadados do ArrayBuffer, a lógica seria diferente e mais complexa.
            // Aqui, o "OOB" é relativo ao `bufferSize` lógico, não necessariamente ao `allocationSize` do ArrayBuffer.
            if (writeTargetAddress < allocationSize) { // Garantir que não estamos escrevendo fora do ArrayBuffer real
                 dataView.setUint8(writeTargetAddress, writeValue);
                 logS1(`VULN: Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) OK! Val=${toHex(writeValue, 8)}`, 'vuln', FNAME);
                 logS1(`---> *** ALERTA: Primitivo Relevante (OOB Write Simples) ***`, 'escalation', FNAME);
                 writeSuccess = true;
            } else {
                logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) estaria fora do ArrayBuffer alocado. Teste inválido.`, 'error', FNAME);
                writeSuccess = false;
            }
        } catch (e) { // Um erro aqui significaria que o motor JS impediu a escrita
            logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) FALHOU/Bloqueada: ${e.message}`, 'good', FNAME);
            logS1(`--- Teste 2 Concluído (Escrita OOB Falhou) ---`, 'test', FNAME);
            return false;
        }
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        if (writeSuccess) {
            for (let readOffset = readRangeStart; readOffset < readRangeEnd; readOffset += 4) {
                const readTargetAddress = baseOffsetInBuffer + readOffset;
                const relOffsetStr = `@${readOffset} (addr ${readTargetAddress})`;

                if (readTargetAddress >= 0 && (readTargetAddress + 8) <= allocationSize) { // Checar leitura de 64 bits
                    try {
                        const low = dataView.getUint32(readTargetAddress, true);
                        const high = dataView.getUint32(readTargetAddress + 4, true);
                        if (isPotentialPointer64S1(high, low)) {
                            const vStr = `H=${toHex(high)} L=${toHex(low)}`;
                            logS1(` -> PTR? U64 ${relOffsetStr}: ${vStr}`, 'ptr', FNAME);
                            potentialLeakFoundCount++;
                            if (leakedValueFromOOB_S1 === null) { // Armazenar o primeiro ponteiro potencial
                                leakedValueFromOOB_S1 = { high, low, type: 'U64', offset: readOffset, addr: readTargetAddress };
                                logS1(` -> VALOR U64 ARMAZENADO ${relOffsetStr}.`, 'vuln', FNAME);
                                logS1(` ---> *** ALERTA: Primitivo Relevante (OOB Read Pointer Leak) ***`, 'escalation', FNAME);
                                logS1(` ---> INSIGHT: O valor vazado ${vStr} (tipo ${leakedValueFromOOB_S1.type}) em ${relOffsetStr} é um candidato a ponteiro...`, 'info', FNAME);
                            }
                        }
                    } catch (e) { /* Leitura pode falhar, ignora */ }
                }
                if (leakedValueFromOOB_S1 === null && readTargetAddress >= 0 && (readTargetAddress + 4) <= allocationSize) { // Checar leitura de 32 bits se nenhum 64-bit foi achado ainda
                     try {
                        const val32 = dataView.getUint32(readTargetAddress, true);
                        if (isPotentialData32S1(val32)) {
                            logS1(` -> Leak U32? ${relOffsetStr}: ${toHex(val32)}`, 'leak', FNAME);
                            potentialLeakFoundCount++;
                            leakedValueFromOOB_S1 = { high: 0, low: val32, type: 'U32', offset: readOffset, addr: readTargetAddress };
                            logS1(` -> VALOR U32 ARMAZENADO ${relOffsetStr}.`, 'vuln', FNAME);
                            logS1(` ---> *** ALERTA: Potencial Vazamento Info OOB Read U32 ***`, 'escalation', FNAME);
                        }
                        // Verifica se leu de volta o valor escrito
                        if (readOffset === oobWriteOffset && val32 === (writeValue | (0xAA << 8) | (0xAA << 16) | (0xAA << 24))) {
                             logS1(` -> Leu valor OOB escrito (${toHex(val32)}) ${relOffsetStr}! Confirma R/W.`, 'vuln', FNAME);
                        }
                    } catch (e) { /* Leitura pode falhar, ignora */ }
                }
                if (readOffset % 32 === 0) await PAUSE_FUNC(1); // Pequena pausa para não sobrecarregar o log/browser
            }
        }
    } catch (e) {
        logS1(`Erro fatal no Teste 2: ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        const leakStatus = leakedValueFromOOB_S1 ? `1 valor ${leakedValueFromOOB_S1.type} @${leakedValueFromOOB_S1.offset}` : 'nenhum valor armazenado';
        logS1(`--- Teste 2 Concluído (${potentialLeakFoundCount} leaks potenciais?, ${leakStatus}) ---`, 'test', FNAME);
    }
    return writeSuccess;
}

async function testOOBUAFPatternS1() {
    const FNAME = 'testOOBUAFPatternS1';
    logS1("--- Iniciando Teste 3: OOB Write -> UAF Pattern ---", 'test', FNAME);
    const buffer1Size = 64; const buffer2Size = 128; const oobWriteOffset = buffer1Size; // Escrever logo após buffer1
    const corruptedValue = 0xDEADBEEF;
    const allocationSize1 = buffer1Size + 128; // Buffer maior para permitir escrita OOB "segura" dentro dele
    const baseOffset1 = 64;

    let buffer1 = null, buffer2 = null; // Estes serão ArrayBuffers
    let dv1 = null; // DataView para buffer1
    let writeOK = false;
    let uafTriggered = false;

    try {
        buffer1 = new ArrayBuffer(allocationSize1);
        dv1 = new DataView(buffer1);
        for (let i = 0; i < buffer1.byteLength; i++) dv1.setUint8(i, 0xBB); // Preencher buffer1

        buffer2 = new ArrayBuffer(buffer2Size); // Buffer alvo adjacente (esperançosamente)
        const dv2_init = new DataView(buffer2);
        for (let i = 0; i < buffer2.byteLength; i++) dv2_init.setUint8(i, 0xCC); // Preencher buffer2

        await PAUSE_FUNC(SHORT_PAUSE_S1);
        const targetWriteAddr = baseOffset1 + oobWriteOffset;

        try {
            if (targetWriteAddr >= 0 && (targetWriteAddr + 4) <= buffer1.byteLength) {
                dv1.setUint32(targetWriteAddr, corruptedValue, true); // Escrita OOB (relativa ao buffer1Size lógico)
                logS1(`VULN: Escrita OOB U32 @${oobWriteOffset} (addr ${targetWriteAddr}) parece OK.`, 'vuln', FNAME);
                logS1(`---> *** ALERTA: Primitivo Relevante (OOB Write) ***`, 'escalation', FNAME);
                writeOK = true;
            } else {
                logS1(`Offset de escrita OOB (${targetWriteAddr}) fora do buffer1. Teste inválido.`, 'warn', FNAME);
            }
        } catch (e) {
            logS1(`Escrita OOB U32 FALHOU/Bloqueada: ${e.message}`, 'good', FNAME);
        }

        if (writeOK) {
            await PAUSE_FUNC(SHORT_PAUSE_S1);
            // Tentar usar buffer2. Se a escrita OOB corrompeu metadados de buffer2, pode dar erro aqui.
            try {
                const slicedBuffer2 = buffer2.slice(0, 10); // Operação comum em ArrayBuffer
                const dv2_check = new DataView(buffer2);
                const lengthCheck = buffer2.byteLength;
                logS1(`Uso do buffer 2 (slice, DataView, byteLength: ${lengthCheck}) após escrita OOB parece OK. Nenhuma UAF óbvia detectada.`, 'good', FNAME);
                 // Poderia tentar ler o valor corrompido se buffer2 estivesse sobreposto
                 // const readCorrupted = dv2_init.getUint32(0, true); // Se oobWriteOffset fosse negativo em relação a buffer2
                 // if (readCorrupted === corruptedValue) { ... }
            } catch (e) {
                logS1(`---> VULN? ERRO ao usar buffer 2 após escrita OOB: ${e.message}`, 'critical', FNAME);
                logS1(`---> *** ALERTA: Potencial UAF ou Corrupção de Metadados detectada! O erro ao usar buffer2 PODE indicar sucesso na corrupção. ***`, 'escalation', FNAME);
                uafTriggered = true;
                console.error("Erro UAF Pattern:", e);
            }
        }
    } catch (e) {
        logS1(`Erro fatal no Teste 3 (OOB UAF): ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        // Limpar referências para ajudar o GC, embora em JS não seja garantia de liberação imediata
        buffer1 = null; buffer2 = null; dv1 = null;
        logS1(`--- Teste 3 Concluído (Escrita OOB: ${writeOK}, Potencial UAF/Erro: ${uafTriggered}) ---`, 'test', FNAME);
    }
    return writeOK && uafTriggered;
}

async function testOOBOtherTypesS1() {
    const FNAME = 'testOOBOtherTypesS1';
    logS1("--- Iniciando Teste 4: OOB Write/Read (Float64/BigInt64) ---", 'test', FNAME);
    const bufferSize = 64; const oobWriteOffset = bufferSize;
    const allocationSize = bufferSize + 128;
    const baseOffset = 64;

    let buffer = null; let dv = null;
    let writeF64OK = false; let writeB64OK = false;
    let readF64OK = false; let readB64OK = false;

    try {
        buffer = new ArrayBuffer(allocationSize);
        dv = new DataView(buffer);
        for (let i = 0; i < buffer.byteLength; i++) dv.setUint8(i, 0xDD);

        const targetAddr = baseOffset + oobWriteOffset;
        const writeValF64 = Math.PI;
        const writeValB64 = BigInt("0x1122334455667788");

        logS1(`Tentando escrita OOB Float64 @${oobWriteOffset} (addr ${targetAddr})`, 'info', FNAME);
        try {
            if (targetAddr >= 0 && (targetAddr + 8) <= buffer.byteLength) {
                dv.setFloat64(targetAddr, writeValF64, true);
                logS1(`Escrita OOB Float64 parece OK.`, 'vuln', FNAME);
                writeF64OK = true;
            } else { logS1(`Offset F64 OOB (${targetAddr}) fora do buffer.`, 'warn', FNAME); }
        } catch(e) { logS1(`Escrita OOB Float64 FALHOU/Bloqueada: ${e.message}`, 'good', FNAME); }

        if (writeF64OK) {
            try {
                const readVal = dv.getFloat64(targetAddr, true);
                if (readVal === writeValF64) {
                    logS1(`Leitura OOB Float64 CONFIRMADA (${readVal}). R/W OK.`, 'vuln', FNAME);
                    logS1(`---> *** ALERTA: Primitivo R/W OOB Float64 confirmado ***`, 'escalation', FNAME);
                    readF64OK = true;
                } else { logS1(`Leitura OOB Float64 retornou valor inesperado: ${readVal}`, 'warn', FNAME); }
            } catch(e) { logS1(`Leitura OOB Float64 FALHOU/Bloqueada: ${e.message}`, 'good', FNAME); }
        }
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        if (typeof DataView.prototype.setBigInt64 !== 'undefined') {
            logS1(`Tentando escrita OOB BigInt64 @${oobWriteOffset} (addr ${targetAddr})`, 'info', FNAME);
            try {
                if (targetAddr >= 0 && (targetAddr + 8) <= buffer.byteLength) {
                    dv.setBigInt64(targetAddr, writeValB64, true);
                    logS1(`Escrita OOB BigInt64 parece OK.`, 'vuln', FNAME);
                    writeB64OK = true;
                } else { logS1(`Offset B64 OOB (${targetAddr}) fora do buffer.`, 'warn', FNAME); }
            } catch(e) { logS1(`Escrita OOB BigInt64 FALHOU/Bloqueada: ${e.message}`, 'good', FNAME); }

            if (writeB64OK) {
                try {
                    const readVal = dv.getBigInt64(targetAddr, true);
                    if (readVal === writeValB64) {
                        logS1(`Leitura OOB BigInt64 CONFIRMADA (0x${readVal.toString(16)}). R/W OK.`, 'vuln', FNAME);
                        logS1(`---> *** ALERTA: Primitivo R/W OOB BigInt64 confirmado ***`, 'escalation', FNAME);
                        readB64OK = true;
                    } else { logS1(`Leitura OOB BigInt64 retornou valor inesperado: 0x${readVal.toString(16)}`, 'warn', FNAME); }
                } catch(e) { logS1(`Leitura OOB BigInt64 FALHOU/Bloqueada: ${e.message}`, 'good', FNAME); }
            }
        } else { logS1("BigInt64 em DataView não suportado neste navegador.", 'warn', FNAME); }
    } catch(e) {
        logS1(`Erro fatal no Teste 4 (OOB Types): ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        buffer = null; dv = null;
        logS1(`--- Teste 4 Concluído (F64 R/W: ${readF64OK}, B64 R/W: ${readB64OK}) ---`, 'test', FNAME);
    }
}

async function testBasicPPS1() {
    const FNAME = 'testBasicPPS1';
    logS1("--- Iniciando Teste 5: PP (Básica) ---", 'test', FNAME);
    const prop = '__pp_basic_s1__'; // Renomear para evitar conflitos entre testes se executados repetidamente sem refresh
    const val = 'Polluted_S1!';
    let ok = false;
    let testObj = null;
    try {
        Object.prototype[prop] = val;
        await PAUSE_FUNC(SHORT_PAUSE_S1); // Dar tempo para a poluição propagar, se relevante
        testObj = {};
        if (testObj[prop] === val) {
            logS1(`VULN: PP Básica OK! Objeto herdou a propriedade poluída '${prop}'.`, 'vuln', FNAME);
            ok = true;
        } else {
            logS1(`PP Básica falhou ou não detectada para '${prop}'.`, 'good', FNAME);
        }
    } catch (e) {
        logS1(`Erro durante teste PP Básico para '${prop}': ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        try {
            delete Object.prototype[prop]; // Limpeza
        } catch(e){ logS1(`Erro ao limpar Object.prototype.${prop}: ${e.message}`, 'error', FNAME); }
    }
    logS1(`--- Teste 5 Concluído (PP Básica ${ok ? 'OK' : 'Falhou'}) ---`, 'test', FNAME);
    return ok;
}

async function testPPJsonHijackS1() {
    const FNAME = 'testPPJsonHijackS1';
    logS1("--- Iniciando Teste 6: PP Hijack (JSON.stringify) ---", 'test', FNAME);
    const originalJSONStringify = JSON.stringify; // Salvar original
    let hijackExecuted = false;
    let returnValueVerified = false;
    let leakReadSuccess = false;

    try {
        JSON.stringify = function hijackedJSONStringify(value, replacer, space) {
            hijackExecuted = true; // Marcar que a função sequestrada foi chamada
            logS1("===> VULN: JSON.stringify SEQUESTRADO! <===", 'vuln', FNAME);

            const currentLeakedValue = getLeakedValueS1(); // Obter o valor mais recente
            let leakedStr = "NULO ou Indefinido";
            if (currentLeakedValue) {
                leakedStr = currentLeakedValue.type === 'U64' ?
                    `U64 H=${toHex(currentLeakedValue.high)} L=${toHex(currentLeakedValue.low)}@${currentLeakedValue.offset}` :
                    `U32 ${toHex(currentLeakedValue.low)}@${currentLeakedValue.offset}`;
                leakReadSuccess = true;
                logS1(` ---> INFO: Interação Hijack + OOB Read Leak OK.`, 'escalation', FNAME);
            }
            logS1(` -> Valor OOB lido (dentro do hijack): ${leakedStr}`, leakReadSuccess ? 'leak' : 'warn', FNAME);

            // Retornar algo previsível para verificar o hijack completo
            const hijackReturnValue = { "hijacked": true, "leak_read_success": leakReadSuccess, "original_data": value };
            // É importante chamar o stringify original aqui para não quebrar a funcionalidade esperada de quem chamou
            // Mas para o teste de *sequestro*, podemos retornar nosso próprio objeto stringificado por ele mesmo
            // ou um valor fixo. Se retornarmos `originalJSONStringify(hijackReturnValue)` garantimos que é uma string JSON válida.
            return originalJSONStringify(hijackReturnValue); // Ou apenas uma string: '{"hijacked":true}'
        };

        await PAUSE_FUNC(SHORT_PAUSE_S1);

        const testObject = { a: 1, b: 'test_pp_json' };
        const resultString = JSON.stringify(testObject); // Chamar a função (agora sequestrada)

        if (hijackExecuted) {
            try {
                const parsedResult = JSON.parse(resultString);
                if (parsedResult && parsedResult.hijacked === true && parsedResult.original_data && parsedResult.original_data.b === 'test_pp_json') {
                    logS1("VULN: Retorno da função JSON.stringify sequestrada verificado e dados originais preservados!", 'vuln', FNAME);
                    returnValueVerified = true;
                } else if (parsedResult && parsedResult.hijacked === true) {
                    logS1("VULN: Retorno da função JSON.stringify sequestrada verificado (estrutura básica)!", 'vuln', FNAME);
                    returnValueVerified = true; // Considerar sucesso parcial
                } else {
                     logS1("AVISO: JSON.stringify sequestrado, mas retorno inesperado ou dados corrompidos.", 'warn', FNAME);
                }
            } catch(e) {
                logS1("AVISO: JSON.stringify sequestrado, mas o retorno não é um JSON válido: " + resultString, 'warn', FNAME);
            }
        } else {
            logS1("JSON.stringify não foi sequestrado.", 'good', FNAME);
        }

    } catch (e) {
        logS1(`Erro fatal durante Teste 6: ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        if (JSON.stringify !== originalJSONStringify) {
            JSON.stringify = originalJSONStringify; // Restaurar o original
            if (JSON.stringify === originalJSONStringify) {
                logS1("JSON.stringify restaurado.", 'good', 'Cleanup');
            } else {
                logS1("ERRO CRÍTICO: FALHA ao restaurar JSON.stringify!", 'critical', 'Cleanup');
            }
        }
    }
    logS1(`--- Teste 6 Concluído (Hijack: ${hijackExecuted}, Retorno Verif.: ${returnValueVerified}, Leitura Leak: ${leakReadSuccess}) ---`, 'test', FNAME);
    return hijackExecuted && returnValueVerified && leakReadSuccess;
}


async function testWebSocketsS1() {
    const FNAME = 'testWebSocketsS1';
    logS1("--- Iniciando Teste 7: WebSockets ---", 'test', FNAME);
    const wsUrl = "wss://websocket-echo.com/"; // URL de echo para teste
    let ws = null;
    let connected = false;
    let messageReceived = false;
    let errorOccurred = false;
    const ppProp = '__ws_polluted_s1__';
    Object.prototype[ppProp] = 'WS Polluted S1!';
    let ppDetected = false;

    const connectionPromise = new Promise((resolve, reject) => {
        try {
            ws = new WebSocket(wsUrl);

            try { // Verificar PP logo após a criação
                if (ws && ws[ppProp] === 'WS Polluted S1!') {
                    logS1(`VULN: PP afetou instância WebSocket ('${ppProp}')!`, 'vuln', FNAME);
                    ppDetected = true;
                }
            } catch(e){ logS1(`Erro ao checar PP em WebSocket: ${e.message}`, 'warn', FNAME); }


            ws.onopen = (event) => {
                logS1("WebSocket Conectado!", 'good', FNAME);
                connected = true;
                try {
                    const testMsg = "Hello WebSocket Test S1 " + Date.now();
                    ws.send(testMsg);
                    // Tentar enviar outros tipos de dados
                    try { ws.send(new Blob(["blob data s1"])); } catch(e) { logS1(`Erro send Blob: ${e.message}`, 'warn', FNAME); }
                    try { ws.send(new ArrayBuffer(16)); } catch(e) { logS1(`Erro send ArrayBuffer: ${e.message}`, 'warn', FNAME); }
                    // try { const largeSize = 1 * 1024 * 1024; const largeBuffer = new Uint8Array(largeSize).fill(0x41); ws.send(largeBuffer); }
                    // catch(e) { logS1(`Erro send Large Buffer: ${e.message}`, 'warn', FNAME); }

                } catch (e) {
                    logS1(`Erro ao enviar mensagem WebSocket: ${e.message}`, 'error', FNAME);
                    errorOccurred = true;
                    reject(e);
                }
            };

            ws.onmessage = (event) => {
                const recMsg = String(event.data);
                logS1(`Mensagem WebSocket recebida: ${recMsg.substring(0, 100)}${recMsg.length > 100 ? '...' : ''}`, 'good', FNAME);
                if (recMsg.startsWith("Hello WebSocket Test S1")) {
                    messageReceived = true;
                }
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, "Test Completed S1");
                }
                resolve();
            };

            ws.onerror = (event) => {
                // Um objeto de evento simples é passado para onerror, pode não ter `message`
                logS1(`Erro no WebSocket: ${event.type || 'Erro desconhecido'}`, 'error', FNAME);
                errorOccurred = true;
                reject(new Error("WebSocket onerror triggered"));
            };

            ws.onclose = (event) => {
                logS1(`WebSocket Fechado. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`, event.wasClean ? 'good' : 'warn', FNAME);
                if (!connected && !errorOccurred) { // Fechou antes de conectar sem erro explícito
                     // reject(new Error("WS fechado antes de conectar/msg."));
                }
                resolve(); // Resolve mesmo se fechar para finalizar o teste
            };

            setTimeout(() => {
                if (!messageReceived) { // Se não recebeu a mensagem de volta (ou não conectou)
                    logS1("Timeout no WebSocket.", 'warn', FNAME);
                    try { if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1001, "Timeout S1"); } catch(e){}
                    reject(new Error("WebSocket timeout"));
                } else {
                    resolve(); // Já recebeu mensagem, resolve
                }
            }, 10000); // Timeout de 10 segundos

        } catch (e) {
            logS1(`Erro CRÍTICO ao criar WebSocket: ${e.message}`, 'critical', FNAME);
            errorOccurred = true;
            console.error(e);
            reject(e);
        }
    });

    try {
        await connectionPromise;
    } catch(e) {
        // Erros já logados pelos handlers ou timeout
        if (!errorOccurred) logS1(`Promessa WebSocket rejeitada: ${e.message}`, 'warn', FNAME);
    } finally {
        try {
            if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                ws.close(1000, "Cleanup S1");
            }
        } catch (e) { /* Silencioso no cleanup */ }
        ws = null;
        delete Object.prototype[ppProp]; // Limpar PP
        logS1(`--- Teste 7 Concluído (Conectado: ${connected}, Msg OK: ${messageReceived}, Erro: ${errorOccurred}, PP Detect: ${ppDetected}) ---`, 'test', FNAME);
    }
}


async function testWebWorkersS1() {
    const FNAME = 'testWebWorkersS1';
    logS1("--- Iniciando Teste 8: Web Workers ---", 'test', FNAME);
    let worker = null;
    let workerReplied = false;
    let workerError = false;
    let ppDetectedWorkerMain = false;
    let ppDetectedInWorker = false;
    const ppPropWorker = '__worker_polluted_s1__';
    Object.prototype[ppPropWorker] = 'Worker Polluted S1!';

    const workerCode = `
        // Dentro do Worker
        self.onmessage = function(e) {
            let response = 'Worker received: ' + e.data;
            let ppDetectedHere = false;
            try {
                if (self.${ppPropWorker} === 'Worker Polluted S1!') {
                    response += ' [PP Detected In Worker Scope!]';
                    ppDetectedHere = true;
                }
            } catch(err) {}
            self.postMessage({payload: response, ppWorkerScope: ppDetectedHere});
        };
        // Checar PP no escopo global do worker ao iniciar
        try {
            if (self.${ppPropWorker} === 'Worker Polluted S1!') {
                 self.postMessage({payload: 'PP Detected on Worker Self at init!', ppWorkerScope: true});
            }
        } catch(e){}
    `;

    const workerPromise = new Promise((resolve, reject) => {
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            worker = new Worker(blobUrl);

            try { // Checar PP na instância do worker na thread principal
                if (worker && worker[ppPropWorker] === 'Worker Polluted S1!') {
                    logS1(`VULN: PP afetou instância Worker main thread ('${ppPropWorker}')!`, 'vuln', FNAME);
                    ppDetectedWorkerMain = true;
                }
            } catch(e){ logS1(`Erro ao checar PP em Worker (main thread): ${e.message}`, 'warn', FNAME); }


            worker.onmessage = (event) => {
                if (event.data && event.data.payload) {
                    logS1(`Mensagem do Worker: "${event.data.payload}"`, 'good', FNAME);
                    if (event.data.payload.includes("Worker received:")) {
                        workerReplied = true;
                    }
                    if (event.data.ppWorkerScope) {
                         logS1(`VULN: PP detectada DENTRO do escopo do worker!`, 'vuln', FNAME);
                         ppDetectedInWorker = true;
                    }
                } else {
                    logS1(`Mensagem inesperada do Worker: ${JSON.stringify(event.data)}`, 'warn', FNAME);
                }
                resolve(); // Resolve na primeira mensagem para simplificar
            };

            worker.onerror = (event) => {
                logS1(`Erro no Worker: ${event.message} em ${event.filename}:${event.lineno}`, 'error', FNAME);
                workerError = true;
                event.preventDefault(); // Prevenir que o erro borbulhe mais se não tratado
                reject(event.error || new Error(event.message || "Worker error event"));
            };

            worker.postMessage("Hello Worker S1 " + Date.now());

            setTimeout(() => {
                if (!workerReplied && !workerError) { // Adicionado !workerError para não rejeitar se já houve erro
                    workerError = true; // Marcar como erro de timeout
                    logS1("Timeout no Web Worker.", 'warn', FNAME);
                    reject(new Error("Worker timeout"));
                } else {
                    resolve(); // Já respondeu ou teve erro, promessa deve ter sido resolvida/rejeitada
                }
            }, 5000); // Timeout de 5 segundos

            URL.revokeObjectURL(blobUrl); // Revogar URL do blob após criar o worker

        } catch (e) {
            logS1(`Erro CRÍTICO criar/comunicar Worker: ${e.message}`, 'critical', FNAME);
            workerError = true;
            console.error(e);
            reject(e);
        }
    });

    try {
        await workerPromise;
    } catch(e) {
        if (!workerError) logS1(`Promessa Web Worker rejeitada: ${e.message}`, 'warn', FNAME);
    } finally {
        try {
            if (worker) worker.terminate();
        } catch(e) { /* Silencioso */ }
        worker = null;
        delete Object.prototype[ppPropWorker]; // Limpar PP
        logS1(`--- Teste 8 Concluído (Resposta OK: ${workerReplied}, Erro: ${workerError}, PP Main: ${ppDetectedWorkerMain}, PP Worker: ${ppDetectedInWorker}) ---`, 'test', FNAME);
    }
}


async function testIndexedDBS1() {
    const FNAME = 'testIndexedDBS1';
    logS1("--- Iniciando Teste 9: IndexedDB ---", 'test', FNAME);
    const dbName = "TestDB_S1_v19"; const storeName = "TestStoreS1";
    let db = null; let errorMsg = null;
    let addOK = false; let getOK = false; let deleteOK = false; let addComplexOK = false;

    // Checar se IndexedDB está disponível
    if (typeof indexedDB === 'undefined') {
        logS1("API IndexedDB NÃO disponível neste ambiente.", 'error', FNAME);
        errorMsg = "indexedDB is undefined";
        logS1(`--- Teste 9 Concluído (API NÃO DISPONÍVEL) ---`, 'test', FNAME);
        return;
    }

    try {
        logS1("Tentando deletar DB antigo (se existir)...", 'info', FNAME);
        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            deleteRequest.onsuccess = () => { logS1("DB antigo deletado ou não existia.", 'good', FNAME); resolve(); };
            deleteRequest.onerror = (e) => { logS1(`Erro ao deletar DB antigo: ${e.target.error}`, 'warn', FNAME); resolve(); /* Não rejeita, continua mesmo assim */ };
            deleteRequest.onblocked = () => { logS1("Deleção do DB bloqueada (conexões abertas?).", 'warn', FNAME); resolve(); /* Não rejeita */ };
            setTimeout(() => { logS1("Timeout ao deletar DB antigo.", 'warn', FNAME); resolve(); }, 3000); // Não rejeitar no timeout da deleção
        }).catch(e => logS1(`Erro não esperado na deleção prévia: ${e.message}`, 'warn', FNAME));
    } catch(e) {logS1("Erro GERAL na deleção prévia do DB.", 'warn', FNAME);}

    await PAUSE_FUNC(SHORT_PAUSE_S1);

    try {
        logS1("Abrindo/Criando IndexedDB...", 'info', FNAME);
        db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);
            request.onupgradeneeded = (event) => {
                logS1("Evento onupgradeneeded disparado.", 'info', FNAME);
                try {
                    const dbInstance = event.target.result;
                    if (!dbInstance.objectStoreNames.contains(storeName)) {
                        logS1(`Criando object store: ${storeName}`, 'info', FNAME);
                        dbInstance.createObjectStore(storeName, { keyPath: "id" });
                    }
                } catch (e) {
                    logS1(`Erro durante onupgradeneeded: ${e.message}`, 'error', FNAME);
                    errorMsg = `Upgrade error: ${e.message}`;
                    reject(e);
                }
            };
            request.onsuccess = (event) => { logS1("IndexedDB aberto com sucesso.", 'good', FNAME); resolve(event.target.result); };
            request.onerror = (event) => {
                logS1(`Erro ao abrir IndexedDB: ${event.target.error}`, 'error', FNAME);
                errorMsg = `Open error: ${event.target.error}`;
                reject(event.target.error);
            };
            setTimeout(() => reject(new Error("Timeout abrindo DB")), 5000);
        });

        if (db) {
            logS1("Testando adicionar registro simples...", 'info', FNAME);
            const simpleId = "simple_" + Date.now();
            const addData = { id: simpleId, name: "TestDataS1", value: Math.random() };
            await new Promise((resolve, reject) => {
                try {
                    const transaction = db.transaction([storeName], "readwrite");
                    const store = transaction.objectStore(storeName);
                    const request = store.add(addData);
                    request.onsuccess = () => { addOK = true; resolve(simpleId); };
                    request.onerror = (event) => reject(event.target.error);
                    transaction.onabort = (event) => reject(new Error(`Transação abortada Add Simples: ${event.target.error}`));
                    setTimeout(() => reject(new Error("Timeout add simples")), 3000);
                } catch (e) { reject(e); }
            });
            logS1(`Adicionar registro simples ${addOK ? 'OK' : 'FALHOU'}. ID: ${simpleId}`, addOK ? 'good' : 'error', FNAME);

            if (addOK) {
                logS1("Testando ler registro simples...", 'info', FNAME);
                const getData = await new Promise((resolve, reject) => {
                     try {
                        const transaction = db.transaction([storeName], "readonly");
                        const store = transaction.objectStore(storeName);
                        const request = store.get(simpleId);
                        request.onsuccess = (event) => { getOK = (event.target.result != null); resolve(event.target.result); };
                        request.onerror = (event) => reject(event.target.error);
                        transaction.onabort = (event) => reject(new Error(`Transação abortada Get Simples: ${event.target.error}`));
                        setTimeout(() => reject(new Error("Timeout get simples")), 3000);
                    } catch (e) { reject(e); }
                });
                logS1(`Ler registro simples ${getOK ? 'OK' : 'FALHOU'}. Data: ${JSON.stringify(getData)}`, getOK ? 'good' : 'error', FNAME);

                if (getOK) {
                    logS1("Testando deletar registro simples...", 'info', FNAME);
                    await new Promise((resolve, reject) => {
                        try {
                            const transaction = db.transaction([storeName], "readwrite");
                            const store = transaction.objectStore(storeName);
                            const request = store.delete(simpleId);
                            request.onsuccess = () => { deleteOK = true; resolve(); }; // Resolve na conclusão da request
                            request.onerror = (event) => reject(event.target.error);
                            transaction.onabort = (event) => reject(new Error(`Transação abortada Delete Simples: ${event.target.error}`));
                            // transaction.oncomplete não é necessário esperar aqui se request.onsuccess for suficiente
                            setTimeout(() => reject(new Error("Timeout delete simples")), 3000);
                        } catch (e) { reject(e); }
                    });
                    logS1(`Deletar registro simples ${deleteOK ? 'OK' : 'FALHOU'}.`, deleteOK ? 'good' : 'error', FNAME);
                }
            }

            logS1("Testando adicionar Blob e ArrayBuffer...", 'info', FNAME);
            const blobData = new Blob(['Test Blob Data S1 - ' + Date.now()], {type: 'text/plain'});
            const bufferData = new Uint8Array([10, 20, 30, 40, Date.now() % 256]).buffer;
            try {
                await new Promise(async (resolve, reject) => {
                    const transaction = db.transaction([storeName], "readwrite");
                    transaction.onerror = (event) => reject(event.target.error);
                    transaction.onabort = (event) => reject(new Error(`Transação abortada Add Complex: ${event.target.error}`));
                    transaction.oncomplete = resolve; // Esperar a transação completar
                    const store = transaction.objectStore(storeName);
                    store.put({ id: 'blob_test_s1', data: blobData });
                    store.put({ id: 'buffer_test_s1', data: bufferData });
                    // Não precisa de setTimeout aqui se oncomplete/onerror/onabort cobrem os casos.
                });
                addComplexOK = true;
                logS1("Adicionar/Put Blob e ArrayBuffer parece OK.", 'good', FNAME);
            } catch(eAddComplex) {
                logS1(`Erro ao adicionar/put Blob/ArrayBuffer: ${eAddComplex?.message || String(eAddComplex)}`, 'error', FNAME);
                errorMsg = errorMsg || `Add complex failed: ${eAddComplex?.message || String(eAddComplex)}`;
            }
        }
    } catch (e) {
        logS1(`Erro GERAL no teste IndexedDB: ${e?.message || String(e)}`, 'error', FNAME);
        if (!errorMsg) errorMsg = e?.message || String(e);
        console.error("IndexedDB Error S1:", e);
    } finally {
        logS1("Fechando conexão IndexedDB (se aberta)...", 'info', FNAME);
        try { if (db) db.close(); } catch (e) { /* silencioso */ }
        db = null;
        logS1(`--- Teste 9 Concluído (Add Simples: ${addOK}, Get: ${getOK}, Del: ${deleteOK}, Add Complex: ${addComplexOK}, Erro: ${!!errorMsg}) ---`, 'test', FNAME);
    }
}


async function testDOMStressS1() {
    const FNAME = 'testDOMStressS1';
    logS1("--- Iniciando Teste 10: DOM Stress ---", 'test', FNAME);
    const container = document.body;
    const elementCount = 200; const cycles = 5;
    let errors = 0;
    logS1(`Iniciando ${cycles} ciclos de stress com ${elementCount} elementos...`, 'info', FNAME);
    try {
        for (let c = 0; c < cycles; c++) {
            logS1(`Ciclo ${c + 1}/${cycles}...`, 'info', FNAME);
            const elements = [];
            for (let i = 0; i < elementCount; i++) {
                try {
                    const el = document.createElement('div');
                    el.textContent = `StressS1-${c}-${i}`;
                    el.style.position = 'absolute'; // Para não afetar layout principal
                    el.style.left = `${(i * 5) % 300}px`;
                    el.style.top = `-${10 + (c*2)}px`; // Posicionar fora da tela
                    el.style.color = `rgb(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)})`;
                    container.appendChild(el);
                    elements.push(el);
                } catch (e) {
                    errors++;
                    logS1(`Erro ao criar/adicionar el ${i} no ciclo ${c+1}: ${e.message}`, 'warn', FNAME);
                }
            }
            await PAUSE_FUNC(50); // Pausa para permitir renderização/stress
            elements.forEach(el => {
                try {
                    if (el.parentNode === container) { // Checar se ainda é filho antes de remover
                        container.removeChild(el);
                    }
                } catch(e) { errors++; /* Erro ao remover, pode já ter sido removido ou outro problema */ }
            });
            await PAUSE_FUNC(10); // Pausa entre ciclos
        }
        logS1("Ciclos de stress concluídos.", 'good', FNAME);
    } catch (e) {
        logS1(`Erro GERAL durante DOM Stress: ${e.message}`, 'error', FNAME);
        errors++;
        console.error("DOM Stress Error S1:", e);
    } finally {
        logS1(`--- Teste 10 Concluído (Erros reportados: ${errors}) ---`, 'test', FNAME);
    }
}


export async function runAllTestsS1() {
    const FNAME = 'runAllTestsS1';
    setButtonDisabled('runBtnS1', true);
    clearOutput('output'); // Limpa a div de output específica do S1
    logS1("==== INICIANDO Script 1 (v19.0 - Arsenal Expandido Modular) ====", 'test', FNAME);

    await testCSPBypassS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBReadInfoLeakEnhancedStoreS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBUAFPatternS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBOtherTypesS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testBasicPPS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testPPJsonHijackS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testWebSocketsS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testWebWorkersS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testIndexedDBS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testDOMStressS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);

    logS1("\n==== Script 1 CONCLUÍDO (v19.0 Modular) ====", 'test', FNAME);
    setButtonDisabled('runBtnS1', false);
}

export function getLeakedValueS1() {
    return leakedValueFromOOB_S1;
}
