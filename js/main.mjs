// js/main.mjs
import { // Utilitários e Configurações Globais
    logS1, logS2, logS3 
} from './logger.mjs';
import { 
    PAUSE_FUNC 
} from './utils.mjs'; 
import { 
    setButtonDisabled, getEl, clearOutput 
} from './domUtils.mjs';
import { 
    updateOOBConfigFromUI 
} from './config.mjs';
import { 
    resetS1LeakState // Para resetar o leak antes de rodar todos os testes S1
} from './state.mjs';

// --- Importar TODOS os testes individuais do S1 ---
import { testCSPBypassS1 } from './tests/s1/testCSPBypassS1.mjs';
import { testOOBReadInfoLeakS1 } from './tests/s1/testOOBReadInfoLeakS1.mjs';
import { testOOBUAFPatternS1 } from './tests/s1/testOOBUAFPatternS1.mjs';
import { testOOBOtherTypesS1 } from './tests/s1/testOOBOtherTypesS1.mjs';
import { testBasicPPS1 } from './tests/s1/testBasicPPS1.mjs';
import { testPPJsonHijackS1 } from './tests/s1/testPPJsonHijackS1.mjs';
import { testWebSocketsS1 } from './tests/s1/testWebSocketsS1.mjs';
import { testWebWorkersS1 } from './tests/s1/testWebWorkersS1.mjs';
import { testIndexedDBS1 } from './tests/s1/testIndexedDBS1.mjs';
import { testDOMStressS1 } from './tests/s1/testDOMStressS1.mjs';

// --- Importar testes individuais do S2 e o controlador do Canvas ---
// (Estes serão importados de js/tests/s2/ quando você os criar individualmente)
// Por enquanto, podemos manter as importações diretas se eles ainda estão em um único script2Tests.mjs
// ou importar o inicializador do canvas que por sua vez lida com seus testes.
import { initializeCanvasS2, cleanupCanvasS2 } from './ui/canvasControllerS2.mjs';
// Se você já separou os testes S2, importe-os aqui também:
// import { testWebGLCheckS2 } from './tests/s2/testWebGLCheckS2.mjs';
// import { testAdvancedPPS2 } from './tests/s2/testAdvancedPPS2.mjs';
// ... etc.

// --- Importar testes individuais e ferramentas do S3 ---
// (Estes serão importados de js/tests/s3/ quando você os criar individualmente)
// import { testWebAssemblyS3 } from './tests/s3/testWebAssemblyS3.mjs';
// import { testSharedArrayBufferS3 } from './tests/s3/testSharedArrayBufferS3.mjs';
// import { explainMemoryPrimitivesS3 } from './tests/s3/explainMemoryPrimitivesS3.mjs';
// import { buildRopChain } from './tests/s3/ropToolS3.mjs';
// import { viewMemory } from './tests/s3/memoryViewerS3.mjs';

// Por enquanto, vamos simular que as funções de S3 ainda são importadas de um módulo agregado
// ou você pode começar a separá-las e atualizar as importações aqui.
// Para este exemplo, vou assumir que as funções agregadoras de S2 e S3 ainda
// vêm de módulos que agrupam seus testes, e os botões individuais os chamarão
// diretamente se você também exportá-los individualmente desses módulos agregados.
// A estrutura ALL_INDIVIDUAL_TEST_DEFINITIONS será mais precisa quando todos estiverem separados.

// --- Funções Agregadoras "Run All" ---
const MEDIUM_PAUSE = 500; // Pausa genérica entre testes nas sequências "Run All"
const SHORT_PAUSE = 50;

async function runAllS1Tests() {
    const FNAME = 'runAllS1Tests'; 
    const runAllS1BtnEl = getEl('runAllS1Btn');
    if(runAllS1BtnEl) runAllS1BtnEl.disabled = true;
    clearOutput('output');
    resetS1LeakState(); 
    logS1("==== INICIANDO TODOS OS TESTES S1 (Super Modular) ====", 'test', FNAME);

    try {
        await testCSPBypassS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testOOBReadInfoLeakS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testOOBUAFPatternS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testOOBOtherTypesS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testBasicPPS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testPPJsonHijackS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testWebSocketsS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testWebWorkersS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testIndexedDBS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
        await testDOMStressS1(); await PAUSE_FUNC(MEDIUM_PAUSE);
    } catch (e) {
        logS1(`ERRO INESPERADO durante a execução de runAllS1Tests: ${e.message}`, 'critical', FNAME);
        console.error("Erro em runAllS1Tests:", e);
    } finally {
        logS1("\n==== TODOS OS TESTES S1 CONCLUÍDOS (Super Modular) ====", 'test', FNAME);
        if(runAllS1BtnEl) runAllS1BtnEl.disabled = false;
    }
}

async function runAllS2TestsAndUI() {
    const FNAME = 'runAllS2TestsAndUI';
    const runAllS2BtnEl = getEl('runAllS2Btn');
    if(runAllS2BtnEl) runAllS2BtnEl.disabled = true;
    clearOutput('output-canvas');
    logS2("==== INICIANDO TESTES S2 E UI DO CANVAS (Super Modular) ====", 'test', FNAME);
    
    // Defina aqui quais testes S2 automáticos devem ser executados pelo canvasController
    // Você precisará importar essas funções de teste S2 de js/tests/s2/ quando elas estiverem prontas
    const s2AutoTestFunctions = [
        // Exemplo:
        // async () => { await import('./tests/s2/testWebGLCheckS2.mjs').then(m => m.testWebGLCheckS2()); },
        // async () => { await import('./tests/s2/testAdvancedPPS2.mjs').then(m => m.testAdvancedPPS2()); },
        // async () => { await import('./tests/s2/testOOBWriteMetadataS2.mjs').then(m => m.testOOBWriteMetadataS2()); },
        // ...e assim por diante para outros testes S2 que você quer que rodem automaticamente com o canvas.
    ];
    
    // Inicializa a UI do canvas e opcionalmente executa os testes automáticos S2
    initializeCanvasS2(true, s2AutoTestFunctions); 

    logS2("UI do Canvas S2 inicializada. Testes automáticos (se houver) podem estar em execução.", 'info', FNAME);
    if(runAllS2BtnEl) runAllS2BtnEl.disabled = false;
}

async function runAllS3Tests() {
    const FNAME = 'runAllS3Tests';
    const runAllS3BtnEl = getEl('runAllS3Btn');
    if(runAllS3BtnEl) runAllS3BtnEl.disabled = true;
    clearOutput('output-advanced');
    logS3("==== INICIANDO TESTES AUTOMÁTICOS S3 (Super Modular) ====", 'test', FNAME);

    try {
        // Importar e chamar testes S3 individualmente
        const { testWebAssemblyS3 } = await import('./tests/s3/testWebAssemblyS3.mjs');
        await testWebAssemblyS3(); await PAUSE_FUNC(MEDIUM_PAUSE);

        const { testSharedArrayBufferS3 } = await import('./tests/s3/testSharedArrayBufferS3.mjs');
        await testSharedArrayBufferS3(); await PAUSE_FUNC(MEDIUM_PAUSE);

        const { explainMemoryPrimitivesS3 } = await import('./tests/s3/explainMemoryPrimitivesS3.mjs');
        explainMemoryPrimitivesS3(); await PAUSE_FUNC(SHORT_PAUSE);
    } catch (e) {
        logS3(`ERRO INESPERADO durante a execução de runAllS3Tests: ${e.message}`, 'critical', FNAME);
        console.error("Erro em runAllS3Tests:", e);
    } finally {
        logS3("\n==== TESTES AUTOMÁTICOS S3 CONCLUÍDOS (Super Modular) ====", 'test', FNAME);
        if(runAllS3BtnEl) runAllS3BtnEl.disabled = false;
    }
}

// --- Definição e Criação dos Botões de Teste Individuais ---
// Atualize esta lista à medida que você cria os arquivos de teste individuais para S2 e S3
const ALL_INDIVIDUAL_TEST_DEFINITIONS = [
    // S1 Tests
    { label: "S1: XSS Básico", funcPath: './tests/s1/testCSPBypassS1.mjs', funcName: 'testCSPBypassS1', group: 'S1' },
    { label: "S1: OOB R/W (Leak)", funcPath: './tests/s1/testOOBReadInfoLeakS1.mjs', funcName: 'testOOBReadInfoLeakS1', group: 'S1' },
    { label: "S1: OOB UAF Pattern", funcPath: './tests/s1/testOOBUAFPatternS1.mjs', funcName: 'testOOBUAFPatternS1', group: 'S1' },
    { label: "S1: OOB Outros Tipos", funcPath: './tests/s1/testOOBOtherTypesS1.mjs', funcName: 'testOOBOtherTypesS1', group: 'S1' },
    { label: "S1: PP Básica", funcPath: './tests/s1/testBasicPPS1.mjs', funcName: 'testBasicPPS1', group: 'S1' },
    { label: "S1: PP JSON Hijack", funcPath: './tests/s1/testPPJsonHijackS1.mjs', funcName: 'testPPJsonHijackS1', group: 'S1' },
    { label: "S1: WebSockets", funcPath: './tests/s1/testWebSocketsS1.mjs', funcName: 'testWebSocketsS1', group: 'S1' },
    { label: "S1: Web Workers", funcPath: './tests/s1/testWebWorkersS1.mjs', funcName: 'testWebWorkersS1', group: 'S1' },
    { label: "S1: IndexedDB", funcPath: './tests/s1/testIndexedDBS1.mjs', funcName: 'testIndexedDBS1', group: 'S1' },
    { label: "S1: DOM Stress", funcPath: './tests/s1/testDOMStressS1.mjs', funcName: 'testDOMStressS1', group: 'S1' },
    
    // S2 Tests (Exemplos de como seriam quando individualizados)
    { label: "S2: WebGL Check", funcPath: './tests/s2/testWebGLCheckS2.mjs', funcName: 'testWebGLCheckS2', group: 'S2' },
    { label: "S2: PP Avançado", funcPath: './tests/s2/testAdvancedPPS2.mjs', funcName: 'testAdvancedPPS2', group: 'S2' },
    { label: "S2: OOB Write Metadata", funcPath: './tests/s2/testOOBWriteMetadataS2.mjs', funcName: 'testOOBWriteMetadataS2', group: 'S2' },
    { label: "S2: File System Access", funcPath: './tests/s2/testFileSystemAccessS2.mjs', funcName: 'testFileSystemAccessS2', group: 'S2' },
    { label: "S2: WebGPU Check", funcPath: './tests/s2/testWebGPUCheckS2.mjs', funcName: 'testWebGPUCheckS2', group: 'S2' },

    // S3 Tests (Exemplos)
    { label: "S3: WebAssembly", funcPath: './tests/s3/testWebAssemblyS3.mjs', funcName: 'testWebAssemblyS3', group: 'S3' },
    { label: "S3: SharedArrayBuffer", funcPath: './tests/s3/testSharedArrayBufferS3.mjs', funcName: 'testSharedArrayBufferS3', group: 'S3' },
    { label: "S3: Explicar Primitivas", funcPath: './tests/s3/explainMemoryPrimitivesS3.mjs', funcName: 'explainMemoryPrimitivesS3', group: 'S3' },
];

function getLoggerForGroup(group) {
    if (group === 'S1') return logS1;
    if (group === 'S2') return logS2;
    if (group === 'S3') return logS3;
    return (message, type, funcName) => console.log(`[${type || 'info'}] ${funcName ? '['+funcName+']' : ''} ${message}`); // Fallback
}

async function safelyImportAndRunTest(testDef) {
    const logger = getLoggerForGroup(testDef.group);
    let testFunctionName = testDef.funcName; // Usar funcName para o log
    
    // Se o nome da função não estiver no testDef, tentar derivar do path
    if (!testFunctionName && testDef.funcPath) {
        const parts = testDef.funcPath.split('/');
        testFunctionName = parts[parts.length - 1].replace('.mjs', '');
    }

    logger(`--- Iniciando teste individual: ${testDef.label} ---`, 'test', testFunctionName);
    
    const allTestButtons = document.querySelectorAll(
        '#individual-tests-container button, #runAllS1Btn, #runAllS2Btn, #runAllS3Btn'
    );
    allTestButtons.forEach(btn => btn.disabled = true);

    try {
        const module = await import(testDef.funcPath);
        if (module && typeof module[testDef.funcName] === 'function') {
            await module[testDef.funcName]();
        } else {
            throw new Error(`Função ${testDef.funcName} não encontrada ou não é uma função no módulo ${testDef.funcPath}`);
        }
    } catch (e) {
        logger(`Erro EXCEPCIONAL no teste individual ${testDef.label}: ${e.message}`, 'critical', testFunctionName);
        console.error(`Erro EXCEPCIONAL no teste individual ${testDef.label} (path: ${testDef.funcPath}):`, e);
    } finally {
        logger(`--- Teste individual ${testDef.label} concluído ---`, 'test', testFunctionName);
        allTestButtons.forEach(btn => btn.disabled = false);
    }
}

function initializeIndividualTestButtons() {
    const container = getEl('individual-tests-container');
    if (!container) {
        console.error("Contêiner 'individual-tests-container' não encontrado.");
        return;
    }
    container.innerHTML = '<h2>Executar Testes Individuais</h2>'; 

    let currentGroup = null;
    ALL_INDIVIDUAL_TEST_DEFINITIONS.forEach((testDef, index) => {
        if (!testDef.funcPath || !testDef.funcName) { // Checar se o path e nome da função estão definidos
            console.warn(`Definição de teste incompleta para: ${testDef.label}. Pulando.`);
            return;
        }

        if (testDef.group !== currentGroup) {
            const groupLabel = document.createElement('span');
            groupLabel.className = 'test-group-separator';
            groupLabel.textContent = `--- Testes do Script ${testDef.group} ---`;
            container.appendChild(groupLabel);
            currentGroup = testDef.group;
        }

        const button = document.createElement('button');
        button.textContent = testDef.label;
        button.id = `runIndTest-${testDef.group}-${testDef.funcName}`; // Usar funcName para ID mais estável

        button.onclick = () => safelyImportAndRunTest(testDef);
        container.appendChild(button);
    });
}

// --- Função Principal de Inicialização ---
function initialize() {
    console.log("Suite de Vulnerabilidades (Super Modular v2) Inicializada.");

    // Botões "Run All"
    const runAllS1BtnEl = getEl('runAllS1Btn');
    if (runAllS1BtnEl) runAllS1BtnEl.onclick = runAllS1Tests;
    else console.error("Botão 'runAllS1Btn' não encontrado.");

    const runAllS2BtnEl = getEl('runAllS2Btn');
    if (runAllS2BtnEl) runAllS2BtnEl.onclick = runAllS2TestsAndUI;
    else console.error("Botão 'runAllS2Btn' não encontrado.");

    const runAllS3BtnEl = getEl('runAllS3Btn');
    if (runAllS3BtnEl) runAllS3BtnEl.onclick = runAllS3Tests;
    else console.error("Botão 'runAllS3Btn' não encontrado.");

    // Ferramentas Interativas S3 (ainda precisam ser importadas e modularizadas)
    const buildRopBtnEl = getEl('buildRopChainBtn');
    if (buildRopBtnEl) {
        buildRopBtnEl.onclick = async () => {
            try {
                const { buildRopChain } = await import('./tests/s3/ropToolS3.mjs'); // Assumindo que você moveu
                buildRopChain();
            } catch (e) { console.error("Erro ao carregar/executar buildRopChain:", e); }
        };
    } else console.error("Botão 'buildRopChainBtn' não encontrado.");

    const viewMemoryBtnEl = getEl('viewMemoryBtn');
    if (viewMemoryBtnEl) {
        viewMemoryBtnEl.onclick = async () => {
            try {
                const { viewMemory } = await import('./tests/s3/memoryViewerS3.mjs'); // Assumindo que você moveu
                viewMemory();
            } catch (e) { console.error("Erro ao carregar/executar viewMemory:", e); }
        };
    } else console.error("Botão 'viewMemoryBtn' não encontrado.");

    initializeIndividualTestButtons();

    try {
        updateOOBConfigFromUI(document);
    } catch (e) {
        console.warn("Não foi possível atualizar OOB_CONFIG a partir da UI:", e.message);
    }

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type && typeof event.data.type === 'string') {
            const loggerKey = event.data.type.replace('log', '');
            const logger = getLoggerForGroup(loggerKey);
            if (logger && event.data.args && event.data.args.length >= 1) {
                logger(
                    event.data.args[0], 
                    event.data.args[1] || 'info', 
                    event.data.args[2] || '' 
                );
            }
        }
    });

    window.addEventListener('unload', cleanupCanvasS2);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
