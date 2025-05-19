// js/script1Tests.mjs
import { logS1 } from './logger.mjs';
import { PAUSE_FUNC, toHex } from './utils.mjs';
import { setButtonDisabled, clearOutput, getEl } from './domUtils.mjs';
// Se precisar de OOB_CONFIG ou JSC_OFFSETS aqui, importe de './config.mjs';

const SHORT_PAUSE_S1 = 50;
const MEDIUM_PAUSE_S1 = 500;
let leakedValueFromOOB_S1 = null; // Estado gerenciado internamente ou via módulo de estado

// Funções de ajuda específicas do S1 (isPotentialPointer64S1, etc.)
const isPotentialPointer64S1 = (high, low) => { /* ... implementação original ... */
    if (high === null || low === null || typeof high !== 'number' || typeof low !== 'number') return false;
    if (high === 0 && low === 0) return false;
    if (high === 0xFFFFFFFF && low === 0xFFFFFFFF) return false;
    if (high === 0xAAAAAAAA && low === 0xAAAAAAAA) return false; // Adicionado com base nos seus logs
    if (high === 0 && low < 0x100000) return false;
    return true;
};
const isPotentialData32S1 = (val) => { /* ... implementação original ... */
    if (val === null || typeof val !== 'number') return false;
    val = val >>> 0;
    if (val === 0 || val === 0xFFFFFFFF || val === 0xAAAAAAAA || val === 0xAAAAAAEE) return false;
    if (val < 0x1000) return false;
    return true;
};


async function testCSPBypassS1() {
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
        document.body.removeChild(scriptTag);
    } catch (e) {
        logS1(`Erro ao criar/adicionar script data: URI: ${e.message}`, 'error', FNAME);
    }
    await PAUSE_FUNC(SHORT_PAUSE_S1);

    try {
        const imgTag = document.createElement('img');
        const imgSrc = 'invalid_img_' + Date.now();
        imgTag.src = imgSrc;
        const onerrorPayload = ` try { const target = document.getElementById('xss-target-div'); if (target) { target.innerHTML += '<br><span class="log-vuln">XSS S1 DOM via ONERROR Executado!</span>'; parent.postMessage({ type: 'logS1', args: ["XSS DOM via onerror OK!", "vuln", "ONERROR Payload"] }, '*'); } else { parent.postMessage({ type: 'logS1', args: ["Alvo XSS DOM não encontrado.", "error", "ONERROR Payload"] }, '*'); } alert('XSS_S1_DOM_ONERROR'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["Erro payload onerror: " + e.message, "warn", "ONERROR Payload"] }, '*'); } `;
        imgTag.setAttribute('onerror', onerrorPayload);
        document.body.appendChild(imgTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2);
        document.body.removeChild(imgTag);
    } catch (e) {
        logS1(`Erro ao criar/adicionar img onerror: ${e.message}`, 'error', FNAME);
    }
    await PAUSE_FUNC(SHORT_PAUSE_S1);

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
    // ... (Implementação completa do teste, usando logS1, PAUSE_FUNC, toHex, isPotentialPointer64S1, isPotentialData32S1)
    // Exemplo de como atualizar leakedValueFromOOB_S1:
    // leakedValueFromOOB_S1 = { high, low, type: 'U64', offset: readOffset };
    // Este teste é crucial e precisa de atenção aos detalhes na refatoração.
    // Por brevidade, não vou colar toda a lógica complexa aqui.

    // Simulação da lógica principal:
    const bufferSize = 32; const writeValue = 0xEE; const oobWriteOffset = bufferSize;
    const readRangeStart = -64; const readRangeEnd = bufferSize + 64;
    const allocationSize = bufferSize + 256; // Poderia usar OOB_CONFIG.ALLOCATION_SIZE se adaptado
    const baseOffsetInBuffer = 128;       // Poderia usar OOB_CONFIG.BASE_OFFSET_IN_DV

    let writeSuccess = false; let potentialLeakFoundCount = 0;
    leakedValueFromOOB_S1 = null; // Reset

    try {
        const buffer = new ArrayBuffer(allocationSize);
        const dataView = new DataView(buffer);
        for (let i = 0; i < buffer.byteLength; i++) { dataView.setUint8(i, 0xAA); }
        const writeTargetAddress = baseOffsetInBuffer + oobWriteOffset;
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        try {
            dataView.setUint8(writeTargetAddress, writeValue); // Esta é a escrita OOB
            logS1(`VULN: Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) OK! Val=${toHex(writeValue, 8)}`, 'vuln', FNAME);
            logS1(`---> *** ALERTA: Primitivo Relevante (OOB Write Simples) ***`, 'escalation', FNAME);
            writeSuccess = true;
        } catch (e) {
            logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) FALHOU/Bloqueada: ${e.message}`, 'good', FNAME);
            logS1(`--- Teste 2 Concluído (Escrita OOB Falhou) ---`, 'test', FNAME);
            return false;
        }
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        for (let readOffset = readRangeStart; readOffset < readRangeEnd; readOffset += 4) {
            const readTargetAddress = baseOffsetInBuffer + readOffset;
            const relOffsetStr = `@${readOffset} (addr ${readTargetAddress})`;

            if (readTargetAddress >= 0 && readTargetAddress + 8 <= buffer.byteLength) {
                try {
                    const low = dataView.getUint32(readTargetAddress, true);
                    const high = dataView.getUint32(readTargetAddress + 4, true);
                    if (isPotentialPointer64S1(high, low)) {
                        const vStr = `H=${toHex(high)} L=${toHex(low)}`;
                        logS1(` -> PTR? U64 ${relOffsetStr}: ${vStr}`, 'ptr', FNAME);
                        potentialLeakFoundCount++;
                        if (leakedValueFromOOB_S1 === null) {
                            leakedValueFromOOB_S1 = { high, low, type: 'U64', offset: readOffset, addr: readTargetAddress };
                            logS1(` -> VALOR U64 ARMAZENADO ${relOffsetStr}.`, 'vuln', FNAME);
                            logS1(` ---> *** ALERTA: Primitivo Relevante (OOB Read Pointer Leak) ***`, 'escalation', FNAME);
                            // Insight log
                        }
                    }
                } catch (e) { /* Leitura pode falhar, ignora */ }
            }
             // ... (lógica para U32 e verificação do valor escrito) ...
            if (readOffset % 32 === 0) await PAUSE_FUNC(1);
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


// ... (demais funções de teste: testOOBUAFPatternS1, testOOBOtherTypesS1, etc.)

export async function runAllTestsS1() {
    const FNAME = 'runAllTestsS1';
    setButtonDisabled('runBtnS1', true); // Assumindo que runBtnS1 é o ID
    clearOutput('output');
    logS1("==== INICIANDO Script 1 (v19.0 - Arsenal Expandido Modular) ====", 'test', FNAME);

    await testCSPBypassS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBReadInfoLeakEnhancedStoreS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // ... (chamar outras funções de teste do S1) ...
    // await testOOBUAFPatternS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testOOBOtherTypesS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testBasicPPS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testPPJsonHijackS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testWebSocketsS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testWebWorkersS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testIndexedDBS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    // await testDOMStressS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);

    logS1("\n==== Script 1 CONCLUÍDO (v19.0 Modular) ====", 'test', FNAME);
    setButtonDisabled('runBtnS1', false);
}

// Exportar leakedValueFromOOB_S1 para S2 poder acessá-lo
// Uma forma simples é exportar uma função getter
export function getLeakedValueS1() {
    return leakedValueFromOOB_S1;
}

// Para comunicação do iframe XSS para o logger principal
// No script principal (main.mjs ou no HTML)
// window.addEventListener('message', (event) => {
//   if (event.source === iframe.contentWindow && event.data.type === 'logS1') {
//     logS1(event.data.args[0], event.data.args[1], event.data.args[2]);
//   }
// });
// Nos payloads do XSS, use: parent.postMessage({ type: 'logS1', args: ["mensagem", "tipo", "funcName"] }, '*')
// Isso requer que o script que cria o iframe XSS (testCSPBypassS1) configure o iframe corretamente
// ou, para data URI e onerror, que o logger principal esteja acessível como `parent.logS1` se não estiverem em iframes.
// Para simplificar aqui, os logs dentro dos payloads do XSS precisarão ser adaptados.
// Uma alternativa é o payload escrever em um elemento específico e o teste principal ler esse elemento.
// Para os data: e onerror que não estão em iframes, eles podem chamar logS1 diretamente se estiver no mesmo escopo,
// o que não será o caso com módulos.
// A forma mais simples para data: e onerror seria eles modificarem um div específico
// e a função de teste principal observar esse div ou logar o resultado.
// A chamada `parent.postMessage` foi adicionada aos exemplos de XSS acima, assumindo que logS1
// está no pai e há um listener de mensagem.
