// js/script2Tests.mjs
import { logS2 } from './logger.mjs';
import { PAUSE_FUNC, toHex } from './utils.mjs';
import { setButtonDisabled, clearOutput, getEl } from './domUtils.mjs';
// import { JSC_OFFSETS, WEBKIT_LIBRARY_INFO } from './config.mjs'; // Se precisar de offsets
import { getLeakedValueS1 } from './script1Tests.mjs';

const SHORT_PAUSE_CANVAS_S2 = 50;
const MEDIUM_PAUSE_S2 = 500;

// --- Estado e Configurações do Canvas S2 ---
let canvasElementS2 = null;
let ctxS2 = null; // Contexto 2D
let glContextS2 = null; // Contexto WebGL
let isWebGL2S2 = false;
let gpuAdapterS2 = null;
let gpuDeviceS2 = null;

let coordStatusDivS2 = null;
let currentHoverTargetS2 = null;
let canvasClickListenerS2 = null; // Listener de clique
let canvasMoveListenerS2 = null;  // Listener de movimento

const interactiveAreasS2 = [
    { id: 'rect-log-s2', x: 10, y: 10, w: 70, h: 25, color: '#FF5733', hoverColor: '#FF8C66', text: 'Log Clk' },
    { id: 'rect-link-s2', x: 90, y: 10, w: 80, h: 25, color: '#337BFF', hoverColor: '#66A3FF', text: 'Abrir Link' },
    { id: 'rect-rerun-s2', x: 180, y: 10, w: 100, h: 25, color: '#4CAF50', hoverColor: '#80C883', text: 'Re-ler Leak S1' }
];

const imgSquareSizeS2 = 28;
const imgSquareSpacingS2 = 5;
const imgSquaresS2 = []; // Será populado em runCanvasTestSequenceS2
const imgSquaresStartYS2 = 45;

let currentLeakDataS2 = { text: "Leak(S1): N/A", color: "#AAAAAA" };

// Funções de ajuda específicas do S2 (podem ser as mesmas do S1 ou específicas)
const isPotentialPointer64_S2_FUNC = (high, low) => { /* ... mesma lógica de isPotentialPointer64S1 ou adaptada ... */
    return (high !== 0 || low !== 0) && !(high === 0xFFFFFFFF && low === 0xFFFFFFFF) && !(high === 0xAAAAAAAA && low === 0xAAAAAAAA) && !(high === 0xAAAAAAEE && low === 0xAAAAAAAA) && !(high === 0 && low < 0x100000);
};
const isPotentialData32_S2_FUNC = (val) => {  /* ... mesma lógica de isPotentialData32S1 ou adaptada ... */
    val = val >>> 0; return val !== 0 && val !== 0xFFFFFFFF && val !== 0xAAAAAAAA && val !== 0xAAAAAAEE && val >= 0x1000;
};


// --- Funções de Desenho do Canvas S2 ---
function drawInteractiveAreasS2() {
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
        ctxS2.textAlign = "start"; // Reset
        ctxS2.textBaseline = "alphabetic"; // Reset
    } catch (e) { logS2(`Erro drawAreasS2: ${e.message}`, 'error', 'drawInteractiveAreasS2'); }
}

function drawImageSquaresS2() {
    if (!ctxS2) return;
    try {
        imgSquaresS2.forEach(sq => {
            ctxS2.fillStyle = sq.hover ? '#FFFF88' : sq.color; // Cor de hover
            ctxS2.fillRect(sq.x, sq.y, sq.size, sq.size);
            ctxS2.strokeStyle = '#AAA';
            ctxS2.lineWidth = 1;
            ctxS2.strokeRect(sq.x, sq.y, sq.size, sq.size);
            if (sq.text) {
                ctxS2.fillStyle = "#FFF"; // Cor do texto
                ctxS2.font = "bold 9px mono";
                ctxS2.textAlign = "center";
                ctxS2.textBaseline = "middle";
                ctxS2.fillText(sq.text, sq.x + sq.size / 2, sq.y + sq.size / 2);
            }
             if (sq.url) { // Indicar se é um link
                ctxS2.fillStyle = "#6cf"; ctxS2.font = "bold 8px mono";
                ctxS2.fillText("LINK", sq.x + sq.size / 2, sq.y + sq.size - 6);
            }
        });
        ctxS2.textAlign = "start"; ctxS2.textBaseline = "alphabetic"; // Reset
    } catch (e) { logS2(`Erro drawImageSquaresS2: ${e.message}`, 'error', 'drawImageSquaresS2'); }
}

function redrawAllS2() {
    if (!ctxS2 || !canvasElementS2) return;
    try {
        ctxS2.save();
        ctxS2.clearRect(0, 0, canvasElementS2.width, canvasElementS2.height);
        ctxS2.fillStyle = "#334"; // Fundo do canvas
        ctxS2.fillRect(0, 0, canvasElementS2.width, canvasElementS2.height);

        drawInteractiveAreasS2();
        drawImageSquaresS2();

        // Desenhar info do leak
        ctxS2.fillStyle = currentLeakDataS2.color;
        ctxS2.font = "10px mono";
        ctxS2.textAlign = "start";
        ctxS2.fillText(currentLeakDataS2.text, 10, canvasElementS2.height - 5);
        ctxS2.restore();
    } catch (e) { logS2(`Erro redrawAllS2: ${e.message}`, 'error', 'redrawAllS2'); }
}


// --- Testes do Script 2 ---
async function testWebGLCheckS2() {
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
                    glContextS2 = gl2; // Priorizar WebGL2
                } else { logS2("WebGL2 não disponível.", 'good', FNAME); }
            } catch(e2) { logS2("WebGL2 não disponível (erro check).", 'good', FNAME); }
        } else { logS2('WebGL N/A.', 'good', FNAME); }
    } catch(e) {
        logS2(`Erro ao verificar WebGL: ${e.message}`, 'error', FNAME);
        console.error(e);
        glContextS2 = null;
    }
    logS2(`--- Teste Verificação WebGL Concluído (Ativo: ${!!glContextS2}, WebGL2: ${isWebGL2S2}) ---`, 'test', FNAME);
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
}

async function testAdvancedPPS2() {
    const FNAME = 'testAdvancedPPS2';
    logS2("--- Teste: PP Avançado (Gadgets++) ---", 'test', FNAME);
    // Definição completa de propsToPollute do HTML original
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
        { name: 'call', proto: Function.prototype, protoName: 'Function', gadgetCheck: (obj, v) => { try{function f(){}; f.call(null); return null;} catch(e){ return `Function.call quebrou! ${e.message}`;} }, createTarget: () => function(){} }, // Adicionado null a call
        { name: 'apply', proto: Function.prototype, protoName: 'Function', gadgetCheck: (obj, v) => { try{function f(){}; f.apply(null); return null;} catch(e){ return `Function.apply quebrou! ${e.message}`;} }, createTarget: () => function(){} }, // Adicionado null a apply
    ];
    const testValue = "PP_Adv_Polluted_S2_" + Date.now();
    let successCount = 0; let gadgetCount = 0; let gadgetMessages = [];

    for (const item of propsToPollute) {
        if (!item.proto || !item.proto.constructor) { // Checar se o protótipo é válido
            logS2(`AVISO: Protótipo inválido para ${item.name} no ${item.protoName}. Pulando.`, 'warn', FNAME);
            continue;
        }
        const prop = item.name; const targetProto = item.proto; const targetProtoName = item.protoName;
        let inherited = false; let gadgetMsg = null; let originalValue = undefined; let wasDefined = false;

        try { // Tentar obter o valor original de forma segura
            if (Object.prototype.hasOwnProperty.call(targetProto, prop)) {
                wasDefined = true;
                originalValue = targetProto[prop];
            }
        } catch (e) {
            logS2(`AVISO: Erro ao verificar/obter original para ${targetProtoName}.${prop}: ${e.message}`, 'warn', FNAME);
            continue; // Pular se não puder obter o original de forma segura
        }

        try {
            targetProto[prop] = testValue;
            let obj;
            if (item.createTarget) {
                try { obj = item.createTarget(); } catch (e) { obj = {}; /* fallback */ }
            } else { obj = {}; }

            let inheritedValue = undefined;
            try { inheritedValue = obj[prop]; } catch (e) { /* pode falhar se getter for poluído */ }

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
                if (prop === '__proto__') { // __proto__ é especial
                    logS2(`-> FAIL: Herança de '__proto__' não OK (Comportamento esperado em navegadores modernos).`, 'good', FNAME);
                } else {
                    // Logar falha apenas se não for __proto__
                    // logS2(`-> FAIL: Herança PP para '${targetProtoName}.${prop}' não OK. Recebido: ${inheritedValue}`, 'warn', FNAME);
                }
            }
        } catch (e) {
            logS2(`Erro ao poluir/testar '${targetProtoName}.${prop}': ${e.message}`, 'error', FNAME);
        } finally { // Limpeza
            try {
                if (wasDefined) {
                    targetProto[prop] = originalValue;
                } else {
                    delete targetProto[prop];
                }
                // Verificar limpeza
                if (targetProto[prop] === testValue && prop !== '__proto__') { // Não poluir permanentemente
                     logS2(`---> CRITICAL: FALHA ao limpar/restaurar ${targetProtoName}.${prop}!`, 'critical', FNAME);
                }
            } catch (eClean) {
                logS2(`AVISO CRÍTICO: Erro INESPERADO ao limpar/restaurar ${targetProtoName}.${prop}: ${eClean.message}`, 'critical', FNAME);
            }
        }
        await PAUSE_FUNC(15); // Pequena pausa entre cada propriedade
    }
    logS2(`--- Teste PP Avançado Concluído (${successCount} heranças OK, ${gadgetCount} gadgets encontrados) ---`, 'test', FNAME);
    if (gadgetCount > 0) {
        logS2(`Resumo dos Gadgets detectados: ${gadgetMessages.join('; ')}`, 'critical', FNAME);
    }
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
}


// ... (Outras funções de teste do S2: testOOBReadEnhancedS2, testOOBWriteMetadataS2, testWebGLDeeperPlusS2, etc.
//      Estas são bastante longas e seguiriam o mesmo padrão de adaptação:
//      - Usar logS2, PAUSE_FUNC, toHex.
//      - Gerenciar estado se necessário (ex: glContextS2).
//      - Interagir com o DOM via getEl, setButtonDisabled.
//      - Usar constantes de config.mjs se aplicável.)

// Exemplo do testOOBWriteMetadataS2 (parcial)
async function testOOBWriteMetadataS2() {
    const FNAME = 'testOOBWriteMetadataS2';
    logS2("--- Teste: OOB Write -> Metadata (ArrayBuffer.byteLength) ---",'test', FNAME);
    // ... (lógica original com adaptações para logS2, PAUSE_FUNC, toHex, etc.)
    // Este teste é complexo e envolve criar múltiplos buffers e tentar corromper.
    // Vou omitir a implementação completa por brevidade, mas o padrão seria:
    // - Alocar buffers.
    // - Iterar sobre offsets de escrita OOB.
    // - Tentar escrever (dv.setUint32).
    // - Verificar o byteLength dos buffers alvo.
    // - Logar VULN/CRITICAL se a corrupção for detectada.
    // - Logar escalations.
    logS2("--- Teste OOB Write -> Metadata Concluído (LÓGICA A SER IMPLEMENTADA COMPLETAMENTE) ---",'test', FNAME);
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);
}


// --- Lógica Principal e Interatividade do Script 2 ---
async function runCanvasTestSequenceS2() {
    const FNAME = 'runCanvasTestSequenceS2';
    logS2("Iniciando sequência focada do Script 2 (v19.0 Modular)...", "test", FNAME);

    // Inicializar elementos do canvas se ainda não foram
    if (!canvasElementS2) canvasElementS2 = getEl('interactive-canvas');
    if (!coordStatusDivS2) coordStatusDivS2 = getEl('canvas-coord-status');

    if (!canvasElementS2 || !coordStatusDivS2) {
        logS2("FATAL: Elementos essenciais do Canvas S2 não encontrados!", 'critical', FNAME);
        return;
    }

    try {
        ctxS2 = canvasElementS2.getContext('2d');
        if (!ctxS2) throw new Error("Falha ao obter Ctx 2D para S2.");
    } catch (e) {
        logS2(`Falha Ctx 2D (S2): ${e.message}`, 'critical', FNAME);
        return; // Interrompe se não puder desenhar
    }

    imgSquaresS2.length = 0; // Limpar quadrados
    let sqX = 10; let sqY = imgSquaresStartYS2;
    const squareDefsS2Config = [ // Ações são os próprios testes
        { id: 's2-sq-meta', text: 'Meta', color: '#FF5733', action: testOOBWriteMetadataS2 },
        { id: 's2-sq-pp', text: 'PP++', color: '#C70039', action: testAdvancedPPS2 },
        // Adicionar outras definições de quadrados e suas ações de teste
        // { id: 's2-sq-oobrd', text: 'OOBRd', color: '#E67E22', action: testOOBReadEnhancedS2 },
        // { id: 's2-sq-imgdt', text: 'ImgDt', color: '#900C3F', action: testOOBWriteToImageDataCheckS2 },
        // { id: 's2-sq-file', text: 'File', color: '#581845', action: testFileSystemAccessS2 },
        // { id: 's2-sq-gpu', text: 'WebGPU', color: '#337BFF', action: testWebGPUCheckS2 },
        // { id: 's2-sq-webgl', text: 'WebGL+', color: '#2ECC71', action: testWebGLDeeperPlusS2 },
    ];

    squareDefsS2Config.forEach(def => {
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

    // Ler leak de S1
    try {
        const l = getLeakedValueS1();
        if (l) {
            const ls = l.type === 'U64' ? `L(S1):U64 H=${toHex(l.high)} L=${toHex(l.low)}@${l.offset}` : `L(S1):U32 ${toHex(l.low)}@${l.offset}`;
            logS2(`-> Leak S1 encontrado: ${ls}`, 'leak', FNAME);
            currentLeakDataS2 = { text: ls, color: "#FF9800" };
        } else {
            logS2(`-> Leak S1 (leakedValueFromOOB_S1) nulo/não encontrado.`, 'warn', FNAME);
            currentLeakDataS2 = { text: "L(S1):NULO", color: "#FFC107" };
        }
    } catch (e) {
        logS2(`Erro ao acessar leak S1: ${e.message}`, 'error', FNAME);
        currentLeakDataS2 = { text: "L(S1):ERRO", color: "#F44336" };
    }
    redrawAllS2(); // Desenha estado inicial com leak info
    await PAUSE_FUNC(SHORT_PAUSE_CANVAS_S2);

    // Executar sequência de testes automáticos S2
    await testWebGLCheckS2();
    await testAdvancedPPS2();
    // await testOOBReadEnhancedS2(); // Implementar completamente
    await testOOBWriteMetadataS2(); // Implementar completamente
    // ... (outros testes automáticos do S2)

    logS2("--- Sequência principal de testes S2 focados concluída ---", 'test', FNAME);
    setupCanvasListenersS2(); // Configurar listeners após os testes automáticos
    redrawAllS2(); // Garantir que tudo está desenhado
}

function handleCanvasClickS2(event) {
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
            case 'rect-rerun-s2':
                logS2('Re-lendo leak S1...', 'info', FNAME_CLICK);
                try {
                    const l = getLeakedValueS1();
                    if (l) {
                        const ls = l.type === 'U64' ? `L(S1):U64 H=${toHex(l.high)} L=${toHex(l.low)}@${l.offset}` : `L(S1):U32 ${toHex(l.low)}@${l.offset}`;
                        logS2(`-> Re-read Leak S1: ${ls}`, 'leak', FNAME_CLICK);
                        currentLeakDataS2 = { text: ls, color: "#FF9800" };
                    } else {
                        logS2(`-> Re-read Leak S1: Nulo`, 'warn', FNAME_CLICK);
                        currentLeakDataS2 = { text: "L(S1):NULO", color: "#FFC107" };
                    }
                } catch (e) { logS2(`Erro re-ler leak S1: ${e.message}`, 'error', FNAME_CLICK); }
                redrawAllS2();
                break;
        }
    } else if (clickedSquare) {
        logS2(`Click Quadrado S2 ID: ${clickedSquare.id} (Texto: ${clickedSquare.text})`, 'vuln', FNAME_CLICK);
        if (clickedSquare.action && typeof clickedSquare.action === 'function') {
            logS2(`Executando re-run S2 ${clickedSquare.id} (${clickedSquare.action.name || 'anon_action'})...`, 'test', FNAME_CLICK);
            setButtonDisabled('runCanvasBtn', true);
            clickedSquare.action() // Chamar a função de teste associada
                .then(() => {
                    logS2(`Re-run S2 ${clickedSquare.id} concluído.`, 'good', FNAME_CLICK);
                    clickedSquare.color = '#8A2BE2'; // Mudar cor para indicar execução
                })
                .catch(e => {
                    logS2(`Erro durante re-run S2 ${clickedSquare.id}: ${e.message}`, 'error', FNAME_CLICK);
                    clickedSquare.color = '#FFA500'; // Mudar cor para indicar erro
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

function handleCanvasMouseMoveS2(event) {
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

function setupCanvasListenersS2() {
    if (!canvasElementS2) return;
    // Remover listeners antigos para evitar duplicação se chamado múltiplas vezes
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
    logS2("==== INICIANDO Script 2 (Canvas e APIs Avançadas Modular) ====", 'test', FNAME);

    try {
        await runCanvasTestSequenceS2();
    } catch (e) {
        logS2(`Erro GERAL SCRIPT 2: ${e.message}`, 'critical', FNAME);
        console.error("Erro GERAL SCRIPT 2:", e);
    } finally {
        logS2("\n==== Script 2 CONCLUÍDO (Modular) ====", 'test', FNAME);
        setButtonDisabled('runCanvasBtn', false);
    }
}

// Limpeza no unload (pode ser chamado de main.mjs ou globalmente)
export function cleanupScript2() {
    try {
        if (canvasClickListenerS2 && canvasElementS2) canvasElementS2.removeEventListener('click', canvasClickListenerS2);
        if (canvasMoveListenerS2 && canvasElementS2) canvasElementS2.removeEventListener('mousemove', canvasMoveListenerS2);
        if (gpuDeviceS2 && typeof gpuDeviceS2.destroy === 'function') {
            // gpuDeviceS2.destroy(); // Considerar implicações de destruir o dispositivo
        }
        gpuDeviceS2 = null; gpuAdapterS2 = null; glContextS2 = null; ctxS2 = null;
        logS2("[Canvas Unload S2] Limpeza tentada.", 'info', 'cleanupScript2');
    } catch (e) { console.error("Erro na limpeza do Script 2:", e); }
}
