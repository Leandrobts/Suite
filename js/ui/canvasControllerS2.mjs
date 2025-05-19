// js/ui/canvasControllerS2.mjs
import { logS2 } from '../logger.mjs';
import { PAUSE_FUNC, toHex } from '../utils.mjs';
import { getEl, setButtonDisabled } from '../domUtils.mjs';
import { getLeakedValueS1 } from '../state.mjs';

// Importar testes individuais do S2 que são acionados por botões no canvas
import { testOOBWriteMetadataS2 } from '../tests/s2/testOOBWriteMetadataS2.mjs';
import { testAdvancedPPS2 } from '../tests/s2/testAdvancedPPS2.mjs';
// ... e outros testes S2 que você queira ligar aos botões do canvas

let canvasElementS2 = null;
let ctxS2 = null;
let coordStatusDivS2 = null;
let currentHoverTargetS2 = null;
let canvasClickListener = null;
let canvasMoveListener = null;

const interactiveAreasS2 = [
    { id: 'rect-log-s2', x: 10, y: 10, w: 70, h: 25, color: '#FF5733', hoverColor: '#FF8C66', text: 'Log Clk' },
    { id: 'rect-link-s2', x: 90, y: 10, w: 80, h: 25, color: '#337BFF', hoverColor: '#66A3FF', text: 'Abrir Link' },
    { id: 'rect-rerun-s2', x: 180, y: 10, w: 100, h: 25, color: '#4CAF50', hoverColor: '#80C883', text: 'Re-ler Leak S1' }
];
const imgSquareSizeS2 = 28;
const imgSquareSpacingS2 = 5;
const imgSquaresS2 = [];
const imgSquaresStartYS2 = 45;
let currentLeakDataS2 = { text: "Leak(S1): N/A", color: "#AAAAAA" };

function defineSquareActions() {
    imgSquaresS2.length = 0; // Limpar antes de redefinir
    let sqX = 10; let sqY = imgSquaresStartYS2;
    
    const squareDefs = [
        { id: 's2-sq-meta', text: 'Meta', color: '#FF5733', action: testOOBWriteMetadataS2 },
        { id: 's2-sq-pp', text: 'PP++', color: '#C70039', action: testAdvancedPPS2 },
        // Adicione mais quadrados aqui com seus respectivos testes importados
        // Ex: { id: 's2-sq-webgl', text: 'WebGL', color: '#2ECC71', action: testWebGLCheckS2 },
    ];

    squareDefs.forEach(def => {
        if (!canvasElementS2) return;
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
            logS2(`AVISO: Sem espaço para o quadrado ${def.id} no canvas. Pulando.`, 'warn', 'defineSquareActions');
        }
    });
}


function drawInteractiveAreasS2() { /* ... implementação como antes ... */
    if (!ctxS2) return;
    interactiveAreasS2.forEach(a => {
        ctxS2.fillStyle = (currentHoverTargetS2 === a.id) ? a.hoverColor : a.color;
        ctxS2.fillRect(a.x, a.y, a.w, a.h);
        ctxS2.fillStyle = "#FFF"; ctxS2.font = "bold 10px mono"; ctxS2.textAlign = "center"; ctxS2.textBaseline = "middle";
        ctxS2.fillText(a.text, a.x + a.w / 2, a.y + a.h / 2 + 1);
    });
    ctxS2.textAlign = "start"; ctxS2.textBaseline = "alphabetic";
}

function drawImageSquaresS2() { /* ... implementação como antes ... */
    if (!ctxS2) return;
    imgSquaresS2.forEach(sq => {
        ctxS2.fillStyle = sq.hover ? '#FFFF88' : sq.color; 
        ctxS2.fillRect(sq.x, sq.y, sq.size, sq.size);
        ctxS2.strokeStyle = '#AAA'; ctxS2.lineWidth = 1;
        ctxS2.strokeRect(sq.x, sq.y, sq.size, sq.size);
        if (sq.text) {
            ctxS2.fillStyle = "#FFF"; ctxS2.font = "bold 9px mono"; ctxS2.textAlign = "center"; ctxS2.textBaseline = "middle";
            ctxS2.fillText(sq.text, sq.x + sq.size / 2, sq.y + sq.size / 2);
        }
    });
    ctxS2.textAlign = "start"; ctxS2.textBaseline = "alphabetic";
}

function redrawAllS2() { /* ... implementação como antes ... */
    if (!ctxS2 || !canvasElementS2) return;
    ctxS2.save();
    ctxS2.clearRect(0, 0, canvasElementS2.width, canvasElementS2.height);
    ctxS2.fillStyle = "#334"; 
    ctxS2.fillRect(0, 0, canvasElementS2.width, canvasElementS2.height);
    drawInteractiveAreasS2();
    drawImageSquaresS2();
    ctxS2.fillStyle = currentLeakDataS2.color;
    ctxS2.font = "10px mono"; ctxS2.textAlign = "start";
    ctxS2.fillText(currentLeakDataS2.text, 10, canvasElementS2.height - 5);
    ctxS2.restore();
}

function updateLeakDisplayS2() {
    const leakedS1 = getLeakedValueS1();
    if (leakedS1) {
        const ls = leakedS1.type === 'U64' ?
            `L(S1):U64 H=${toHex(leakedS1.high)} L=${toHex(leakedS1.low)}@${leakedS1.offset}` :
            `L(S1):U32 ${toHex(leakedS1.low)}@${leakedS1.offset}`;
        currentLeakDataS2 = { text: ls, color: "#FF9800" };
    } else {
        currentLeakDataS2 = { text: "L(S1):NULO", color: "#FFC107" };
    }
    redrawAllS2();
}


function handleCanvasClick(event) {
    const FNAME_CLICK = 'CanvasClickS2';
    if (!canvasElementS2) return;
    // ... (lógica de clique como antes, chamando clickedSquare.action() para os quadrados)
    // Certifique-se de que `setButtonDisabled('runCanvasBtn', ...)` seja usado para o botão principal do canvas.
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
        if (clickedArea.id === 'rect-rerun-s2') {
            logS2('Re-lendo leak S1...', 'info', FNAME_CLICK);
            updateLeakDisplayS2(); // Atualiza e redesenha
        } else if (clickedArea.id === 'rect-link-s2') {
             logS2('Abrindo link externo (google.com)...', 'info', FNAME_CLICK);
             try { window.open('https://google.com', '_blank'); }
             catch (e) { logS2('Erro window.open: ' + e.message, 'error', FNAME_CLICK); }
        }
        // ... outros 'cases' para interactiveAreasS2
    } else if (clickedSquare && clickedSquare.action) {
        logS2(`Click Quadrado S2 ID: ${clickedSquare.id}, Executando: ${clickedSquare.action.name || 'anon_action'}`, 'vuln', FNAME_CLICK);
        const runCanvasBtnEl = getEl('runCanvasBtn'); // Botão principal do S2
        if(runCanvasBtnEl) runCanvasBtnEl.disabled = true; // Desabilitar botão principal durante teste de quadrado
        
        // Desabilitar todos os botões individuais de teste para evitar concorrência
        document.querySelectorAll('#individual-tests-container button').forEach(btn => btn.disabled = true);


        clickedSquare.action()
            .then(() => {
                logS2(`Re-run do quadrado ${clickedSquare.id} concluído.`, 'good', FNAME_CLICK);
                clickedSquare.color = '#8A2BE2'; // Cor de sucesso
            })
            .catch(e => {
                logS2(`Erro durante re-run do quadrado ${clickedSquare.id}: ${e.message}`, 'error', FNAME_CLICK);
                clickedSquare.color = '#FFA500'; // Cor de erro
            })
            .finally(() => {
                redrawAllS2();
                if(runCanvasBtnEl) runCanvasBtnEl.disabled = false;
                document.querySelectorAll('#individual-tests-container button').forEach(btn => btn.disabled = false);
                logS2(`Re-run do quadrado ${clickedSquare.id} finalizado.`, 'test', FNAME_CLICK);
            });
    }
}

function handleCanvasMouseMove(event) { /* ... implementação como antes ... */
    if (!canvasElementS2 || !ctxS2) return;
    const rect = canvasElementS2.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let needsRedraw = false; let newHoverTarget = null; let cursorStyle = 'default';
    interactiveAreasS2.forEach(a => {
        if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) { newHoverTarget = a.id; cursorStyle = 'pointer';}
    });
    imgSquaresS2.forEach(sq => {
        let oldHover = sq.hover; sq.hover = false;
        if (x >= sq.x && x <= sq.x + sq.size && y >= sq.y && y <= sq.y + sq.size) {
            newHoverTarget = sq.id; cursorStyle = sq.action ? 'crosshair' : 'default'; sq.hover = true;
        }
        if (oldHover !== sq.hover) needsRedraw = true;
    });
    if (newHoverTarget !== currentHoverTargetS2) { currentHoverTargetS2 = newHoverTarget; needsRedraw = true; }
    if (needsRedraw) redrawAllS2();
    canvasElementS2.style.cursor = cursorStyle;
    if (coordStatusDivS2) coordStatusDivS2.textContent = `Coords: X=${x.toFixed(0)}, Y=${y.toFixed(0)}`;
}

export function initializeCanvasS2(runAutoTests = true, autoTestFunctions = []) {
    logS2("Inicializando Canvas Controller S2...", 'info', 'initializeCanvasS2');
    canvasElementS2 = getEl('interactive-canvas');
    coordStatusDivS2 = getEl('canvas-coord-status');

    if (!canvasElementS2) {
        logS2("Elemento canvas S2 não encontrado!", 'error', 'initializeCanvasS2');
        return;
    }
    try {
        ctxS2 = canvasElementS2.getContext('2d');
        if (!ctxS2) throw new Error("Não foi possível obter o contexto 2D do canvas S2.");
    } catch (e) {
        logS2(`Erro ao obter contexto do canvas: ${e.message}`, 'error', 'initializeCanvasS2');
        return;
    }

    defineSquareActions(); // Define quais quadrados e suas ações
    updateLeakDisplayS2(); // Puxa o leak do S1 e desenha

    // Remover listeners antigos para evitar duplicação
    if (canvasClickListener && canvasElementS2) canvasElementS2.removeEventListener('click', canvasClickListener);
    if (canvasMoveListener && canvasElementS2) canvasElementS2.removeEventListener('mousemove', canvasMoveListener);

    canvasClickListener = handleCanvasClick;
    canvasMoveListener = handleCanvasMouseMove;
    canvasElementS2.addEventListener('click', canvasClickListener);
    canvasElementS2.addEventListener('mousemove', canvasMoveListener);

    redrawAllS2();

    if (runAutoTests && autoTestFunctions.length > 0) {
        logS2("Executando testes automáticos do S2 (via Canvas Controller)...", 'test', 'initializeCanvasS2');
        const runInSequence = async () => {
            for (const testFunc of autoTestFunctions) {
                if (typeof testFunc === 'function') {
                    try {
                        await testFunc();
                    } catch (e) {
                        logS2(`Erro durante teste automático ${testFunc.name || 'anônimo'}: ${e.message}`, 'error', 'initializeCanvasS2');
                    }
                    await PAUSE_FUNC(500); // Pausa entre testes automáticos
                }
            }
            logS2("Testes automáticos do S2 (via Canvas Controller) concluídos.", 'test', 'initializeCanvasS2');
        };
        runInSequence(); // Não aguardar aqui para não bloquear a UI principal
    }
}

export function cleanupCanvasS2() {
    logS2("Limpando Canvas Controller S2...", 'info', 'cleanupCanvasS2');
    if (canvasClickListener && canvasElementS2) canvasElementS2.removeEventListener('click', canvasClickListener);
    if (canvasMoveListener && canvasElementS2) canvasElementS2.removeEventListener('mousemove', canvasMoveListener);
    // Resetar outras variáveis de estado do canvas se necessário
    imgSquaresS2.length = 0;
    currentLeakDataS2 = { text: "Leak(S1): N/A", color: "#AAAAAA" };
}
