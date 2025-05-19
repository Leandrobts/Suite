// js/main.mjs
import { // Funções de teste do Script 1
    testCSPBypassS1, testOOBReadInfoLeakEnhancedStoreS1, testOOBUAFPatternS1,
    testOOBOtherTypesS1, testBasicPPS1, testPPJsonHijackS1, testWebSocketsS1,
    testWebWorkersS1, testIndexedDBS1, testDOMStressS1,
    runAllTestsS1 // Função agregadora S1
} from './script1Tests.mjs';

import { // Funções de teste do Script 2
    testWebGLCheckS2, testAdvancedPPS2, testOOBWriteMetadataS2,
    // Adicione aqui importações para os outros testes S2 quando estiverem completos:
    // testOOBReadEnhancedS2, testWebGLDeeperPlusS2, testOOBWriteToImageDataCheckS2,
    testFileSystemAccessS2, testWebGPUCheckS2,
    runCanvasTest, // Função agregadora S2 (que configura UI e executa testes automáticos)
    cleanupScript2
} from './script2Tests.mjs';

import { // Funções de teste do Script 3
    testWebAssemblyInterface, testSharedArrayBufferSupport, explainMemoryPrimitives,
    buildRopChain, viewMemory, // Ferramentas interativas
    runAllAdvancedTestsS3 // Função agregadora S3
} from './script3Tests.mjs';

import { updateOOBConfigFromUI } from './config.mjs';
import { logS1, logS2, logS3 } from './logger.mjs';
import { setButtonDisabled as genericSetButtonDisabled, getEl, clearOutput } from './domUtils.mjs'; // Renomear para evitar conflito

// --- Definição dos Testes Individuais ---
const allIndividualTests = [
    // Script 1 Tests
    { label: "S1: XSS Básico", func: testCSPBypassS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: OOB R/W (Leak)", func: testOOBReadInfoLeakEnhancedStoreS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: OOB UAF Pattern", func: testOOBUAFPatternS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: OOB Outros Tipos", func: testOOBOtherTypesS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: PP Básica", func: testBasicPPS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: PP JSON Hijack", func: testPPJsonHijackS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: WebSockets", func: testWebSocketsS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: Web Workers", func: testWebWorkersS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: IndexedDB", func: testIndexedDBS1, group: 'S1', outputDivId: 'output' },
    { label: "S1: DOM Stress", func: testDOMStressS1, group: 'S1', outputDivId: 'output' },

    // Script 2 Tests
    { label: "S2: WebGL Check", func: testWebGLCheckS2, group: 'S2', outputDivId: 'output-canvas' },
    { label: "S2: PP Avançado", func: testAdvancedPPS2, group: 'S2', outputDivId: 'output-canvas' },
    { label: "S2: OOB Write Metadata", func: testOOBWriteMetadataS2, group: 'S2', outputDivId: 'output-canvas' },
    // { label: "S2: OOB Read Enhanced", func: testOOBReadEnhancedS2, group: 'S2', outputDivId: 'output-canvas' }, // Quando implementado
    // { label: "S2: WebGL Deeper Plus", func: testWebGLDeeperPlusS2, group: 'S2', outputDivId: 'output-canvas' }, // Quando implementado
    // { label: "S2: OOB Write ImageData", func: testOOBWriteToImageDataCheckS2, group: 'S2', outputDivId: 'output-canvas' }, // Quando implementado
    { label: "S2: File System Access", func: testFileSystemAccessS2, group: 'S2', outputDivId: 'output-canvas' },
    { label: "S2: WebGPU Check", func: testWebGPUCheckS2, group: 'S2', outputDivId: 'output-canvas' },

    // Script 3 Tests (Automáticos)
    { label: "S3: WebAssembly", func: testWebAssemblyInterface, group: 'S3', outputDivId: 'output-advanced' },
    { label: "S3: SharedArrayBuffer", func: testSharedArrayBufferSupport, group: 'S3', outputDivId: 'output-advanced' },
    { label: "S3: Explicar Primitivas", func: explainMemoryPrimitives, group: 'S3', outputDivId: 'output-advanced' },
];

function getLoggerForGroup(group) {
    if (group === 'S1') return logS1;
    if (group === 'S2') return logS2;
    if (group === 'S3') return logS3;
    return console.log; // Fallback
}

function initializeIndividualTestButtons() {
    const container = getEl('individual-tests-container');
    if (!container) {
        console.error("Contêiner 'individual-tests-container' não encontrado.");
        return;
    }

    let currentGroup = null;
    allIndividualTests.forEach((test, index) => {
        if (test.group !== currentGroup) {
            if (currentGroup !== null) { // Adicionar <hr> entre grupos, exceto antes do primeiro
                // const hr = document.createElement('hr');
                // container.appendChild(hr);
            }
            const groupLabel = document.createElement('span');
            groupLabel.className = 'test-group-separator';
            groupLabel.textContent = `--- Testes do Script ${test.group} ---`;
            container.appendChild(groupLabel);
            currentGroup = test.group;
        }

        const button = document.createElement('button');
        button.textContent = test.label;
        button.id = `runTest-${test.group}-${index}`; // ID único para cada botão

        button.onclick = async () => {
            const logger = getLoggerForGroup(test.group);
            logger(`--- Iniciando teste individual: ${test.label} ---`, 'test', test.func.name);
            genericSetButtonDisabled(button.id, true);
            // Desabilitar todos os outros botões de teste individual e os "run all" para evitar concorrência
            document.querySelectorAll('#individual-tests-container button, #runBtnS1, #runCanvasBtn, #runAdvancedBtn').forEach(btn => {
                if (btn.id !== button.id) genericSetButtonDisabled(btn.id, true);
            });


            try {
                await test.func(); // Executa a função de teste individual
            } catch (e) {
                logger(`Erro EXCEPCIONAL no teste individual ${test.label}: ${e.message}`, 'critical', test.func.name);
                console.error(`Erro EXCEPCIONAL no teste individual ${test.label}:`, e);
            } finally {
                logger(`--- Teste individual ${test.label} concluído ---`, 'test', test.func.name);
                genericSetButtonDisabled(button.id, false);
                // Reabilitar todos os outros botões
                 document.querySelectorAll('#individual-tests-container button, #runBtnS1, #runCanvasBtn, #runAdvancedBtn').forEach(btn => {
                     genericSetButtonDisabled(btn.id, false);
                 });
            }
        };
        container.appendChild(button);
    });
}


function initialize() {
    console.log("Suite de Vulnerabilidades Modular (Execução Individual) Inicializada.");

    // Botões "Run All"
    const runBtnS1El = getEl('runBtnS1');
    if (runBtnS1El) runBtnS1El.onclick = runAllTestsS1;
    else console.error("Botão 'runBtnS1' não encontrado.");

    const runCanvasBtnEl = getEl('runCanvasBtn');
    if (runCanvasBtnEl) runCanvasBtnEl.onclick = runCanvasTest;
    else console.error("Botão 'runCanvasBtn' não encontrado.");

    const runAdvancedBtnEl = getEl('runAdvancedBtn');
    if (runAdvancedBtnEl) runAdvancedBtnEl.onclick = runAllAdvancedTestsS3;
    else console.error("Botão 'runAdvancedBtn' não encontrado.");

    // Ferramentas Interativas S3
    const buildRopBtnEl = getEl('buildRopChainBtn');
    if (buildRopBtnEl) buildRopBtnEl.onclick = buildRopChain;
    else console.error("Botão 'buildRopChainBtn' não encontrado.");

    const viewMemoryBtnEl = getEl('viewMemoryBtn');
    if (viewMemoryBtnEl) viewMemoryBtnEl.onclick = viewMemory;
    else console.error("Botão 'viewMemoryBtn' não encontrado.");

    // Inicializar botões de teste individuais
    initializeIndividualTestButtons();

    try {
        updateOOBConfigFromUI(document);
    } catch (e) {
        console.warn("Não foi possível atualizar OOB_CONFIG a partir da UI (elementos podem estar faltando):", e.message);
    }

    // Listener para XSS postMessage
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type) {
            const logger = getLoggerForGroup(event.data.type.replace('log', '')); // logS1 -> S1
            if (logger && event.data.args && event.data.args.length >= 1) {
                logger(
                    event.data.args[0], // message
                    event.data.args[1] || 'info', // type
                    event.data.args[2] || '' // funcName
                );
            }
        }
    });

    // Limpeza do S2 no unload da página
    window.addEventListener('unload', cleanupScript2);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
