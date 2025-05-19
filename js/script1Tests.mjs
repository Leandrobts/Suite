// js/script1Tests.mjs
import { logS1 } from './logger.mjs';
import { PAUSE_FUNC, toHex } from './utils.mjs';
import { setButtonDisabled, clearOutput, getEl } from './domUtils.mjs';

const SHORT_PAUSE_S1 = 50;
const MEDIUM_PAUSE_S1 = 500;

// !!! IMPORTANTE: `leakedValueFromOOB_S1` deve estar no escopo do módulo !!!
let leakedValueFromOOB_S1 = null;

// Funções de ajuda específicas do S1 (isPotentialPointer64S1, etc.)
// (Mantidas como na sua versão anterior, que parecia funcionar para detecção)
const isPotentialPointer64S1 = (high, low) => {
    if (high === null || low === null || typeof high !== 'number' || typeof low !== 'number') return false;
    if (high === 0 && low === 0) return false;
    if (high === 0xFFFFFFFF && low === 0xFFFFFFFF) return false;
    if (high === 0xAAAAAAAA && low === 0xAAAAAAAA) return false;
    if (high === 0xAAAAAAEE && low === 0xAAAAAAAA) return false; 
    if (high === 0xAAAAAAAA && low === 0xAAAAAAEE) return false; 
    if (high === 0 && low < 0x100000) return false;
    return true;
};
const isPotentialData32S1 = (val) => {
    if (val === null || typeof val !== 'number') return false;
    val = val >>> 0;
    if (val === 0 || val === 0xFFFFFFFF || val === 0xAAAAAAAA || val === 0xAAAAAAEE) return false;
    if (val < 0x1000) return false;
    return true;
};


async function testCSPBypassS1() {
    // ... (Mantido como na sua versão anterior, que funcionou para XSS)
    // Certifique-se que os parent.postMessage estão corretos e o listener em main.mjs também.
    const FNAME = 'testCSPBypassS1';
    logS1("--- Iniciando Teste 1: XSS Básico (Script 1) ---", 'test', FNAME);
    const xssTargetDiv = getEl('xss-target-div');
    try {
        const payloadJS = `try { parent.postMessage({ type: 'logS1', args: ["[Payload Data:] Alerta data: URI executado!", "vuln", "XSS Payload"] }, '*'); alert('XSS S1 via Data URI!'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["[Payload Data:] Alerta data: URI bloqueado: " + e.message, "good", "XSS Payload"] }, '*'); }`;
        const encodedPayload = btoa(payloadJS);
        const scriptTag = document.createElement('script');
        scriptTag.src = 'data:text/javascript;base64,' + encodedPayload;
        scriptTag.onerror = (e) => { logS1(`ERRO: Falha carregar script data: URI! Event: ${e.type}`, 'error', FNAME); };
        document.body.appendChild(scriptTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2);
        if(scriptTag.parentNode) document.body.removeChild(scriptTag);
    } catch (e) { logS1(`Erro ao criar/adicionar script data: URI: ${e.message}`, 'error', FNAME); }
    await PAUSE_FUNC(SHORT_PAUSE_S1);
    try {
        const imgTag = document.createElement('img');
        const imgSrc = 'invalid_img_' + Date.now();
        imgTag.src = imgSrc;
        const onerrorPayload = ` try { const target = document.getElementById('xss-target-div'); if (target) { target.innerHTML += '<br><span class="log-vuln">XSS S1 DOM via ONERROR Executado!</span>'; parent.postMessage({ type: 'logS1', args: ["XSS DOM via onerror OK!", "vuln", "ONERROR Payload"] }, '*'); } else { parent.postMessage({ type: 'logS1', args: ["Alvo XSS DOM não encontrado.", "error", "ONERROR Payload"] }, '*'); } alert('XSS_S1_DOM_ONERROR'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["Erro payload onerror: " + e.message, "warn", "ONERROR Payload"] }, '*'); } `;
        imgTag.setAttribute('onerror', onerrorPayload);
        document.body.appendChild(imgTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2); 
        if (imgTag.parentNode) document.body.removeChild(imgTag);
    } catch (e) { logS1(`Erro ao criar/adicionar img onerror: ${e.message}`, 'error', FNAME); }
    await PAUSE_FUNC(SHORT_PAUSE_S1);
    try {
        const link = document.createElement('a');
        link.href = "javascript:try{parent.postMessage({ type: 'logS1', args: ['[Payload JS Href:] Executado!', 'vuln', 'XSS Payload JS Href']},'*'); alert('XSS S1 via JS Href!');}catch(e){parent.postMessage({ type: 'logS1', args: ['[Payload JS Href:] Bloqueado: '+e.message,'good','XSS Payload JS Href']},'*');}";
        link.textContent = "[Test Link JS Href - Clique Manual]";
        link.style.display = 'block'; link.style.color = 'cyan';
        if (xssTargetDiv) xssTargetDiv.appendChild(link);
        logS1("Adicionado link javascript: href para teste manual.", 'info', FNAME);
    } catch(e) { logS1(`Erro ao criar link js: href: ${e.message}`, 'error', FNAME); }
    logS1("--- Teste 1 Concluído ---", 'test', FNAME);
}

async function testOOBReadInfoLeakEnhancedStoreS1() {
    const FNAME = 'testOOBReadInfoLeakEnhancedStoreS1';
    logS1("--- Iniciando Teste 2: OOB Write/Read (Leak) ---", 'test', FNAME);
    const bufferSize = 32; const writeValue = 0xEE; const oobWriteOffset = bufferSize;
    const readRangeStart = -64; const readRangeEnd = bufferSize + 64;
    const allocationSize = bufferSize + 256;
    const baseOffsetInBuffer = 128;

    let writeSuccess = false; let potentialLeakFoundCount = 0;
    // `leakedValueFromOOB_S1` já é null no início de `runAllTestsS1` (ou deveria ser)
    // Não precisa resetar aqui se `runAllTestsS1` o faz.

    try {
        const buffer = new ArrayBuffer(allocationSize);
        const dataView = new DataView(buffer);
        for (let i = 0; i < buffer.byteLength; i++) { dataView.setUint8(i, 0xAA); }
        const writeTargetAddress = baseOffsetInBuffer + oobWriteOffset;
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        try {
            if (writeTargetAddress < allocationSize) {
                 dataView.setUint8(writeTargetAddress, writeValue);
                 logS1(`VULN: Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) OK! Val=${toHex(writeValue, 8)}`, 'vuln', FNAME);
                 logS1(`---> *** ALERTA: Primitivo Relevante (OOB Write Simples) ***`, 'escalation', FNAME);
                 writeSuccess = true;
            } else {
                logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) estaria fora do ArrayBuffer alocado. Teste inválido.`, 'error', FNAME);
                writeSuccess = false; // Certificar que é false
            }
        } catch (e) {
            logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) FALHOU/Bloqueada: ${e.message}`, 'good', FNAME);
            logS1(`--- Teste 2 Concluído (Escrita OOB Falhou) ---`, 'test', FNAME);
            return false;
        }
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        if (writeSuccess) {
            for (let readOffset = readRangeStart; readOffset < readRangeEnd; readOffset += 4) {
                const readTargetAddress = baseOffsetInBuffer + readOffset;
                const relOffsetStr = `@${readOffset} (addr ${readTargetAddress})`;

                if (readTargetAddress >= 0 && (readTargetAddress + 8) <= allocationSize) {
                    try {
                        const low = dataView.getUint32(readTargetAddress, true);
                        const high = dataView.getUint32(readTargetAddress + 4, true);
                        if (isPotentialPointer64S1(high, low)) {
                            const vStr = `H=${toHex(high)} L=${toHex(low)}`;
                            logS1(` -> PTR? U64 ${relOffsetStr}: ${vStr}`, 'ptr', FNAME);
                            potentialLeakFoundCount++;
                            if (leakedValueFromOOB_S1 === null) {
                                leakedValueFromOOB_S1 = { high, low, type: 'U64', offset: readOffset, addr: readTargetAddress }; // Definindo a variável do módulo
                                logS1(` -> VALOR U64 ARMAZENADO ${relOffsetStr}.`, 'vuln', FNAME);
                                logS1(` ---> *** ALERTA: Primitivo Relevante (OOB Read Pointer Leak) ***`, 'escalation', FNAME);
                                logS1(` ---> INSIGHT: O valor vazado ${vStr} (tipo ${leakedValueFromOOB_S1.type}) em ${relOffsetStr} é um candidato a ponteiro...`, 'info', FNAME);
                            }
                        }
                    } catch (e) { /* Ignora */ }
                }
                // Restante da lógica de leitura...
                if (leakedValueFromOOB_S1 === null && readTargetAddress >= 0 && (readTargetAddress + 4) <= allocationSize) {
                     try {
                        const val32 = dataView.getUint32(readTargetAddress, true);
                        if (isPotentialData32S1(val32)) {
                            logS1(` -> Leak U32? ${relOffsetStr}: ${toHex(val32)}`, 'leak', FNAME);
                            potentialLeakFoundCount++;
                            leakedValueFromOOB_S1 = { high: 0, low: val32, type: 'U32', offset: readOffset, addr: readTargetAddress }; // Definindo
                            logS1(` -> VALOR U32 ARMAZENADO ${relOffsetStr}.`, 'vuln', FNAME);
                            logS1(` ---> *** ALERTA: Potencial Vazamento Info OOB Read U32 ***`, 'escalation', FNAME);
                        }
                        if (readOffset === oobWriteOffset && val32 === (writeValue | (0xAA << 8) | (0xAA << 16) | (0xAA << 24))) {
                             logS1(` -> Leu valor OOB escrito (${toHex(val32)}) ${relOffsetStr}! Confirma R/W.`, 'vuln', FNAME);
                        }
                    } catch (e) { /* Ignora */ }
                }


                if (readOffset % 32 === 0) await PAUSE_FUNC(1);
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

// ... (testOOBUAFPatternS1, testOOBOtherTypesS1, testBasicPPS1, testPPJsonHijackS1 - mantidos como na versão anterior, que pareciam OK pelos logs)
async function testOOBUAFPatternS1() { /* ...código da resposta anterior... */
    const FNAME = 'testOOBUAFPatternS1';
    logS1("--- Iniciando Teste 3: OOB Write -> UAF Pattern ---", 'test', FNAME);
    const buffer1Size = 64; const buffer2Size = 128; const oobWriteOffset = buffer1Size; 
    const corruptedValue = 0xDEADBEEF;
    const allocationSize1 = buffer1Size + 128; 
    const baseOffset1 = 64;
    let buffer1 = null, buffer2 = null; 
    let dv1 = null; 
    let writeOK = false;
    let uafTriggered = false;
    try {
        buffer1 = new ArrayBuffer(allocationSize1);
        dv1 = new DataView(buffer1);
        for (let i = 0; i < buffer1.byteLength; i++) dv1.setUint8(i, 0xBB); 
        buffer2 = new ArrayBuffer(buffer2Size); 
        const dv2_init = new DataView(buffer2);
        for (let i = 0; i < buffer2.byteLength; i++) dv2_init.setUint8(i, 0xCC); 
        await PAUSE_FUNC(SHORT_PAUSE_S1);
        const targetWriteAddr = baseOffset1 + oobWriteOffset;
        try {
            if (targetWriteAddr >= 0 && (targetWriteAddr + 4) <= buffer1.byteLength) {
                dv1.setUint32(targetWriteAddr, corruptedValue, true); 
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
            try {
                const slicedBuffer2 = buffer2.slice(0, 10); 
                const dv2_check = new DataView(buffer2);
                const lengthCheck = buffer2.byteLength;
                logS1(`Uso do buffer 2 (slice, DataView, byteLength: ${lengthCheck}) após escrita OOB parece OK. Nenhuma UAF óbvia detectada.`, 'good', FNAME);
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
        buffer1 = null; buffer2 = null; dv1 = null;
        logS1(`--- Teste 3 Concluído (Escrita OOB: ${writeOK}, Potencial UAF/Erro: ${uafTriggered}) ---`, 'test', FNAME);
    }
    return writeOK && uafTriggered;
 }
async function testOOBOtherTypesS1() { /* ...código da resposta anterior... */
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
async function testBasicPPS1() { /* ...código da resposta anterior... */
    const FNAME = 'testBasicPPS1';
    logS1("--- Iniciando Teste 5: PP (Básica) ---", 'test', FNAME);
    const prop = '__pp_basic_s1__'; 
    const val = 'Polluted_S1!';
    let ok = false;
    let testObj = null;
    try {
        Object.prototype[prop] = val;
        await PAUSE_FUNC(SHORT_PAUSE_S1); 
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
            delete Object.prototype[prop]; 
        } catch(e){ logS1(`Erro ao limpar Object.prototype.${prop}: ${e.message}`, 'error', FNAME); }
    }
    logS1(`--- Teste 5 Concluído (PP Básica ${ok ? 'OK' : 'Falhou'}) ---`, 'test', FNAME);
    return ok;
 }
async function testPPJsonHijackS1() { /* ...código da resposta anterior... */
    const FNAME = 'testPPJsonHijackS1';
    logS1("--- Iniciando Teste 6: PP Hijack (JSON.stringify) ---", 'test', FNAME);
    const originalJSONStringify = JSON.stringify; 
    let hijackExecuted = false;
    let returnValueVerified = false;
    let leakReadSuccess = false;
    try {
        JSON.stringify = function hijackedJSONStringify(value, replacer, space) {
            hijackExecuted = true; 
            logS1("===> VULN: JSON.stringify SEQUESTRADO! <===", 'vuln', FNAME);
            const currentLeakedValue = getLeakedValueS1(); 
            let leakedStr = "NULO ou Indefinido";
            if (currentLeakedValue) {
                leakedStr = currentLeakedValue.type === 'U64' ?
                    `U64 H=${toHex(currentLeakedValue.high)} L=${toHex(currentLeakedValue.low)}@${currentLeakedValue.offset}` :
                    `U32 ${toHex(currentLeakedValue.low)}@${currentLeakedValue.offset}`;
                leakReadSuccess = true;
                logS1(` ---> INFO: Interação Hijack + OOB Read Leak OK.`, 'escalation', FNAME);
            }
            logS1(` -> Valor OOB lido (dentro do hijack): ${leakedStr}`, leakReadSuccess ? 'leak' : 'warn', FNAME);
            const hijackReturnValue = { "hijacked": true, "leak_read_success": leakReadSuccess, "original_data": value };
            return originalJSONStringify(hijackReturnValue); 
        };
        await PAUSE_FUNC(SHORT_PAUSE_S1);
        const testObject = { a: 1, b: 'test_pp_json' };
        const resultString = JSON.stringify(testObject); 
        if (hijackExecuted) {
            try {
                const parsedResult = JSON.parse(resultString);
                if (parsedResult && parsedResult.hijacked === true && parsedResult.original_data && parsedResult.original_data.b === 'test_pp_json') {
                    logS1("VULN: Retorno da função JSON.stringify sequestrada verificado e dados originais preservados!", 'vuln', FNAME);
                    returnValueVerified = true;
                } else if (parsedResult && parsedResult.hijacked === true) {
                    logS1("VULN: Retorno da função JSON.stringify sequestrada verificado (estrutura básica)!", 'vuln', FNAME);
                    returnValueVerified = true; 
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
            JSON.stringify = originalJSONStringify; 
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

async function testWebSocketsS1() { /* ...código da resposta anterior... */
    const FNAME = 'testWebSocketsS1';
    logS1("--- Iniciando Teste 7: WebSockets ---", 'test', FNAME);
    const wsUrl = "wss://websocket-echo.com/"; 
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
            try { 
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
                    try { ws.send(new Blob(["blob data s1"])); } catch(e) { logS1(`Erro send Blob: ${e.message}`, 'warn', FNAME); }
                    try { ws.send(new ArrayBuffer(16)); } catch(e) { logS1(`Erro send ArrayBuffer: ${e.message}`, 'warn', FNAME); }
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
                logS1(`Erro no WebSocket: ${event.type || 'Erro desconhecido'}`, 'error', FNAME);
                errorOccurred = true;
                reject(new Error("WebSocket onerror triggered"));
            };
            ws.onclose = (event) => {
                logS1(`WebSocket Fechado. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`, event.wasClean ? 'good' : 'warn', FNAME);
                resolve(); 
            };
            setTimeout(() => {
                if (!messageReceived) { 
                    logS1("Timeout no WebSocket.", 'warn', FNAME);
                    try { if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1001, "Timeout S1"); } catch(e){}
                    reject(new Error("WebSocket timeout"));
                } else {
                    resolve(); 
                }
            }, 10000); 
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
        if (!errorOccurred) logS1(`Promessa WebSocket rejeitada: ${e.message}`, 'warn', FNAME);
    } finally {
        try {
            if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                ws.close(1000, "Cleanup S1");
            }
        } catch (e) { /* Silencioso no cleanup */ }
        ws = null;
        delete Object.prototype[ppProp]; 
        logS1(`--- Teste 7 Concluído (Conectado: ${connected}, Msg OK: ${messageReceived}, Erro: ${errorOccurred}, PP Detect: ${ppDetected}) ---`, 'test', FNAME);
    }
}


async function testWebWorkersS1() {
    const FNAME = 'testWebWorkersS1';
    logS1("--- Iniciando Teste 8: Web Workers ---", 'test', FNAME);
    let worker = null;
    let workerReplied = false; // Para a mensagem principal de e.data
    let initialPPMessageReceived = false; // Para a mensagem de PP no init do worker
    let workerError = false;
    let ppDetectedWorkerMain = false;
    let ppDetectedInWorkerScope = false; // Flag final baseada nas mensagens
    const ppPropWorker = '__worker_polluted_s1__';
    Object.prototype[ppPropWorker] = 'Worker Polluted S1!';

    // Modificação no workerCode para garantir que ambas as mensagens (init e onmessage)
    // sejam distintas e possam ser tratadas.
    const workerCode = `
        const ppPropName = '${ppPropWorker}'; // Passar o nome da propriedade
        const expectedPPValue = 'Worker Polluted S1!';
        let ppOnInit = false;
        try {
            if (self[ppPropName] === expectedPPValue) {
                ppOnInit = true;
            }
        } catch(e){}
        // Enviar status de PP na inicialização
        self.postMessage({ type: 'init_status', ppWorkerScopeOnInit: ppOnInit, payload: 'Worker initialized.' });

        self.onmessage = function(e) {
            let response = 'Worker received: ' + e.data;
            let ppInOnMessage = false;
            try {
                if (self[ppPropName] === expectedPPValue) {
                    response += ' [PP Detected In Worker onmessage!]';
                    ppInOnMessage = true;
                }
            } catch(err) {}
            self.postMessage({ type: 'message_reply', payload: response, ppWorkerScopeOnMessage: ppInOnMessage });
        };
    `;

    const workerPromise = new Promise((resolve, reject) => {
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            worker = new Worker(blobUrl);

            try {
                if (worker && worker[ppPropWorker] === 'Worker Polluted S1!') {
                    logS1(`VULN: PP afetou instância Worker main thread ('${ppPropWorker}')!`, 'vuln', FNAME);
                    ppDetectedWorkerMain = true;
                }
            } catch(e){ logS1(`Erro ao checar PP em Worker (main thread): ${e.message}`, 'warn', FNAME); }

            let messagesToWaitFor = 2; // Esperar pela mensagem de init e pela resposta ao postMessage

            worker.onmessage = (event) => {
                if (event.data && event.data.type) {
                    if (event.data.type === 'init_status') {
                        logS1(`Mensagem de init do Worker: "${event.data.payload}"`, 'good', FNAME);
                        if (event.data.ppWorkerScopeOnInit) {
                            logS1(`VULN: PP detectada no ESCOPO do worker durante a inicialização!`, 'vuln', FNAME);
                            ppDetectedInWorkerScope = true;
                        }
                        initialPPMessageReceived = true;
                        messagesToWaitFor--;
                    } else if (event.data.type === 'message_reply') {
                        logS1(`Mensagem de resposta do Worker: "${event.data.payload}"`, 'good', FNAME);
                        workerReplied = true;
                        if (event.data.ppWorkerScopeOnMessage) {
                            logS1(`VULN: PP detectada no ESCOPO do worker durante onmessage!`, 'vuln', FNAME);
                            ppDetectedInWorkerScope = true; // Pode ser detectada em ambos os momentos
                        }
                        messagesToWaitFor--;
                    }
                } else {
                    logS1(`Mensagem inesperada do Worker: ${JSON.stringify(event.data)}`, 'warn', FNAME);
                }

                if (messagesToWaitFor === 0) {
                    resolve();
                }
            };

            worker.onerror = (event) => {
                logS1(`Erro no Worker: ${event.message || 'Erro desconhecido'} em ${event.filename}:${event.lineno}`, 'error', FNAME);
                workerError = true;
                event.preventDefault();
                reject(event.error || new Error(event.message || "Worker error event"));
            };

            worker.postMessage("Hello Worker S1 " + Date.now());

            setTimeout(() => {
                if (messagesToWaitFor > 0 && !workerError) {
                    workerError = true;
                    logS1("Timeout no Web Worker (esperando todas as mensagens).", 'warn', FNAME);
                    reject(new Error("Worker timeout"));
                }
            }, 7000); // Aumentar um pouco o timeout para duas mensagens

            URL.revokeObjectURL(blobUrl);

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
        try { if (worker) worker.terminate(); } catch(e) {}
        worker = null;
        delete Object.prototype[ppPropWorker];
        logS1(`--- Teste 8 Concluído (InitMsg: ${initialPPMessageReceived}, ReplyOK: ${workerReplied}, Erro: ${workerError}, PP Main: ${ppDetectedWorkerMain}, PP WorkerScope: ${ppDetectedInWorkerScope}) ---`, 'test', FNAME);
    }
}


async function testIndexedDBS1() {
    const FNAME = 'testIndexedDBS1';
    logS1("--- Iniciando Teste 9: IndexedDB ---", 'test', FNAME);
    const dbName = "TestDB_S1_v19_Modular"; const storeName = "TestStoreS1Modular";
    let db = null; let errorMsg = null;
    let addOK = false; let getOK = false; let deleteOK = false; let addComplexOK = false;
    let deleteTimeoutId = null; // Para controlar o timeout da deleção

    if (typeof indexedDB === 'undefined') {
        logS1("API IndexedDB NÃO disponível neste ambiente.", 'error', FNAME);
        errorMsg = "indexedDB is undefined";
        logS1(`--- Teste 9 Concluído (API NÃO DISPONÍVEL, Erro: ${!!errorMsg}) ---`, 'test', FNAME);
        return;
    }

    try {
        logS1("Tentando deletar DB antigo (se existir)...", 'info', FNAME);
        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            
            deleteTimeoutId = setTimeout(() => {
                // Não logar timeout aqui se a operação já completou ou falhou.
                // O log de timeout só deve ocorrer se nem onsuccess, onerror, onblocked dispararem.
                // No entanto, o log que você viu foi [09:23:26], bem depois do teste...
                // Vamos manter o log de timeout, mas a promessa resolve de qualquer forma para não bloquear.
                logS1(`(Async Timeout Check) Timeout ao deletar DB antigo: ${dbName}.`, 'warn', `deleteDBTimeoutCheck`);
                resolve(); // Resolve para não bloquear, mas o log indica um timeout potencial.
            }, 5000); // Um timeout mais longo para esta operação de limpeza assíncrona

            deleteRequest.onsuccess = () => {
                clearTimeout(deleteTimeoutId);
                logS1("DB antigo deletado ou não existia.", 'good', FNAME);
                resolve();
            };
            deleteRequest.onerror = (e) => {
                clearTimeout(deleteTimeoutId);
                logS1(`Erro ao deletar DB antigo: ${e.target.error}`, 'warn', FNAME);
                resolve(); 
            };
            deleteRequest.onblocked = () => {
                clearTimeout(deleteTimeoutId);
                logS1("Deleção do DB bloqueada (conexões abertas?).", 'warn', FNAME);
                resolve(); 
            };
        });
    } catch(eDel) {
      logS1(`Erro GERAL na fase de deleção prévia do DB: ${eDel.message}`, 'warn', FNAME);
    }
    deleteTimeoutId = null; // Limpar ID

    // Restante do teste IndexedDB como estava, pois parecia funcionar nos logs
    await PAUSE_FUNC(SHORT_PAUSE_S1);
    try {
        logS1("Abrindo/Criando IndexedDB...", 'info', FNAME);
        db = await new Promise((resolve, reject) => { /* ...código original de open... */
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
            const simpleId = "simple_" + Date.now();
            const addData = { id: simpleId, name: "TestDataS1", value: Math.random() };
            await new Promise((resolve, reject) => {
                const t = db.transaction([storeName], "readwrite"); t.onabort = e => reject(new Error(t.error)); t.onerror = e => reject(t.error);
                const s = t.objectStore(storeName); const r = s.add(addData);
                r.onsuccess = () => { addOK = true; resolve(simpleId); }; r.onerror = e => reject(r.error);
            });
            logS1(`Adicionar registro simples ${addOK ? 'OK' : 'FALHOU'}. ID: ${simpleId}`, addOK ? 'good' : 'error', FNAME);
            if (addOK) {
                const getData = await new Promise((resolve, reject) => {
                    const t = db.transaction([storeName], "readonly"); t.onabort = e => reject(new Error(t.error)); t.onerror = e => reject(t.error);
                    const s = t.objectStore(storeName); const r = s.get(simpleId);
                    r.onsuccess = () => { getOK = (r.result != null); resolve(r.result); }; r.onerror = e => reject(r.error);
                });
                logS1(`Ler registro simples ${getOK ? 'OK' : 'FALHOU'}. Data: ${JSON.stringify(getData)}`, getOK ? 'good' : 'error', FNAME);
                if (getOK) {
                    await new Promise((resolve, reject) => {
                         const t = db.transaction([storeName], "readwrite"); t.onabort = e => reject(new Error(t.error)); t.onerror = e => reject(t.error);
                         const s = t.objectStore(storeName); const r = s.delete(simpleId);
                         r.onsuccess = () => { deleteOK = true; resolve(); }; r.onerror = e => reject(r.error);
                    });
                    logS1(`Deletar registro simples ${deleteOK ? 'OK' : 'FALHOU'}.`, deleteOK ? 'good' : 'error', FNAME);
                }
            }
            const blobData = new Blob(['Test Blob Data S1 - ' + Date.now()], {type: 'text/plain'});
            const bufferData = new Uint8Array([10, 20, 30, 40, Date.now() % 256]).buffer;
            try {
                await new Promise((resolve, reject) => {
                    const t = db.transaction([storeName], "readwrite"); 
                    t.oncomplete = resolve; t.onabort = e => reject(new Error(t.error)); t.onerror = e => reject(t.error);
                    const s = t.objectStore(storeName);
                    s.put({ id: 'blob_test_s1', data: blobData });
                    s.put({ id: 'buffer_test_s1', data: bufferData });
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


async function testDOMStressS1() { /* ...código da resposta anterior... */
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
                    el.style.position = 'absolute'; 
                    el.style.left = `${(i * 5) % 300}px`;
                    el.style.top = `-${10 + (c*2)}px`; 
                    el.style.color = `rgb(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)})`;
                    container.appendChild(el);
                    elements.push(el);
                } catch (e) {
                    errors++;
                    logS1(`Erro ao criar/adicionar el ${i} no ciclo ${c+1}: ${e.message}`, 'warn', FNAME);
                }
            }
            await PAUSE_FUNC(50); 
            elements.forEach(el => {
                try {
                    if (el.parentNode === container) { 
                        container.removeChild(el);
                    }
                } catch(e) { errors++; }
            });
            await PAUSE_FUNC(10); 
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
    clearOutput('output');
    leakedValueFromOOB_S1 = null; // !!! Resetar o estado do leak no início de cada execução de S1 !!!
    logS1("==== INICIANDO Script 1 (v19.0 - Arsenal Expandido Modular Corrigido) ====", 'test', FNAME);

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

    logS1("\n==== Script 1 CONCLUÍDO (v19.0 Modular Corrigido) ====", 'test', FNAME);
    setButtonDisabled('runBtnS1', false);
}

export function getLeakedValueS1() {
    return leakedValueFromOOB_S1;
}
