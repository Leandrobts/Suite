// js/main.mjs
import { // Utilitários e Configurações Globais
    logS1, logS2, logS3 
} from './logger.mjs';
import { 
    PAUSE_FUNC // Só PAUSE_FUNC é diretamente usado por runAllTestsS1 aqui. Outros utils são usados pelos testes.
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
import { initializeCanvasS2, cleanupCanvasS2 } from './ui/canvasControllerS2.mjs';
import { testWebGLCheckS2 } from './tests/s2/testWebGLCheckS2.mjs';
import { testAdvancedPPS2 } from './tests/s2/testAdvancedPPS2.mjs';
import { testOOBWriteMetadataS2 } from './tests/s2/testOOBWriteMetadataS2.mjs';
import { testFileSystemAccessS2 } from './tests/s2/testFileSystemAccessS2.mjs';
import { testWebGPUCheckS2 } from './tests/s2/testWebGPUCheckS2.mjs';
// Adicione outros testes S2 aqui: testOOBReadEnhancedS2, testWebGLDeeperPlusS2, testOOBWriteToImageDataS2

// --- Importar testes individuais e ferramentas do S3 ---
import { testWebAssemblyInterface as testWebAssemblyS3 } from './tests/s3/testWebAssemblyS3.mjs'; // Renomeado para clareza
import { testSharedArrayBufferSupport as testSharedArrayBufferS3 } from './tests/s3/testSharedArrayBufferS3.mjs'; // Renomeado
import { explainMemoryPrimitives as explainMemoryPrimitivesS3 } from './tests/s3/explainMemoryPrimitivesS3.mjs'; // Renomeado
// Para ferramentas, você pode importá-las de arquivos dedicados ou agrupados:
// import { buildRopChain } from './tests/s3/ropToolS3.mjs';
// import { viewMemory } from './tests/s3/memoryViewerS3.mjs';
// Por enquanto, vamos assumir que estão em um arquivo s3Tools.mjs ou similar se você as separar
// Para este exemplo, vou importar as funções originais que você já tinha no script3Tests.mjs,
// que agora seriam movidas para seus próprios arquivos e exportadas.
// Simulando que elas foram movidas para js/tests/s3/
import { buildRopChain } from './tests/s3/ropToolS3.mjs'; // Assume que você criou este arquivo
import { viewMemory } from './tests/s3/memoryViewerS3.mjs';   // Assume que você criou este arquivo


const MEDIUM_PAUSE_S1 = 500; // Constantes para as funções "Run All"
const MEDIUM_PAUSE_S2 = 500;
const MEDIUM_PAUSE_S3 = 500;
const SHORT_PAUSE_S3 = 50;


// --- Funções Agregadoras "Run All" ---
async function runAllS1Tests() {
    const FNAME = 'runAllS1Tests'; // Nome da função agregadora
    setButtonDisabled('runAllS1Btn', true);
    clearOutput('output');
    resetS1LeakState(); // !!! Resetar o estado do leak ANTES de rodar os testes S1 !!!
    logS1("==== INICIANDO TODOS OS TESTES S1 (Modular Super Granular) ====", 'test', FNAME);

    // Chamar cada teste S1 individualmente em sequência
    await testCSPBypassS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBReadInfoLeakS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBUAFPatternS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testOOBOtherTypesS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testBasicPPS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testPPJsonHijackS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testWebSocketsS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testWebWorkersS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testIndexedDBS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);
    await testDOMStressS1(); await PAUSE_FUNC(MEDIUM_PAUSE_S1);

    logS1("\n==== TODOS OS TESTES S1 CONCLUÍDOS (Modular Super Granular) ====", 'test', FNAME);
    setButtonDisabled('runAllS1Btn', false);
}

async function runAllS2TestsAndUI() {
    const FNAME = 'runAllS2TestsAndUI';
    setButtonDisabled('runAllS2Btn', true);
    clearOutput('output-canvas');
    logS2("==== INICIANDO TESTES S2 E UI DO CANVAS (Modular Super Granular) ====", 'test', FNAME);
    
    // Lista de testes automáticos do S2 para passar ao inicializador do canvas
    const s2AutoTests = [
        testWebGLCheckS2,
        testAdvancedPPS2,
        testOOBWriteMetadataS2, // Este agora tem lógica
        testFileSystemAccessS2,
        testWebGPUCheckS2,
        // Adicione outros testes S2 automáticos aqui quando estiverem prontos
        // testOOBReadEnhancedS2,
        // testWebGLDeeperPlusS2,
        // testOOBWriteToImageDataS2
    ];
    
    initializeCanvasS2(true, s2AutoTests); // true para rodar testes automáticos

    // Nota: initializeCanvasS2 agora roda os testes automáticos de forma assíncrona (não bloqueante).
    // O log de conclusão aqui será para a inicialização da UI.
    logS2("UI do Canvas S2 inicializada. Testes automáticos podem estar em execução.", 'info', FNAME);
    setButtonDisabled('runAllS2Btn', false); // Reabilitar o botão após iniciar
}


async function runAllS3Tests() {
    const FNAME = 'runAllS3Tests';
    setButtonDisabled('runAllS3Btn', true);
    clearOutput('output-advanced');
    logS3("==== INICIANDO TESTES AUTOMÁTICOS S3 (Modular Super Granular) ====", 'test', FNAME);

    await testWebAssemblyS3(); await PAUSE_FUNC(MEDIUM_PAUSE_S3);
    await testSharedArrayBufferS3(); await PAUSE_FUNC(MEDIUM_PAUSE_S3);
    explainMemoryPrimitivesS3(); await PAUSE_FUNC(SHORT_PAUSE_S3);

    logS3("\n==== TESTES AUTOMÁTICOS S3 CONCLUÍDOS (Modular Super Granular) ====", 'test', FNAME);
    setButtonDisabled('runAllS3Btn', false);
}


// --- Definição e Criação dos Botões de Teste Individuais ---
const ALL_INDIVIDUAL_TEST_DEFINITIONS = [
    // S1
    { label: "S1: XSS Básico", func: testCSPBypassS1, group: 'S1' },
    { label: "S1: OOB R/W (Leak)", func: testOOBReadInfoLeakS1, group: 'S1' },
    { label: "S1: OOB UAF Pattern", func: testOOBUAFPatternS1, group: 'S1' },
    { label: "S1: OOB Outros Tipos", func: testOOBOtherTypesS1, group: 'S1' },
    { label: "S1: PP Básica", func: testBasicPPS1, group: 'S1' },
    { label: "S1: PP JSON Hijack", func: testPPJsonHijackS1, group: 'S1' },
    { label: "S1: WebSockets", func: testWebSocketsS1, group: 'S1' },
    { label: "S1: Web Workers", func: testWebWorkersS1, group: 'S1' },
    { label: "S1: IndexedDB", func: testIndexedDBS1, group: 'S1' },
    { label: "S1: DOM Stress", func: testDOMStressS1, group: 'S1' },
    // S2
    { label: "S2: WebGL Check", func: testWebGLCheckS2, group: 'S2' },
    { label: "S2: PP Avançado", func: testAdvancedPPS2, group: 'S2' },
    { label: "S2: OOB Write Metadata", func: testOOBWriteMetadataS2, group: 'S2' },
    { label: "S2: File System Access", func: testFileSystemAccessS2, group: 'S2' },
    { label: "S2: WebGPU Check", func: testWebGPUCheckS2, group: 'S2' },
    // Adicione os outros testes S2 aqui quando estiverem em arquivos individuais
    // S3
    { label: "S3: WebAssembly", func: testWebAssemblyS3, group: 'S3' },
    { label: "S3: SharedArrayBuffer", func: testSharedArrayBufferS3, group: 'S3' },
    { label: "S3: Explicar Primitivas", func: explainMemoryPrimitivesS3, group: 'S3' },
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
    container.innerHTML = '<h2>Executar Testes Individuais</h2>'; // Limpar e adicionar título

    let currentGroup = null;
    ALL_INDIVIDUAL_TEST_DEFINITIONS.forEach((testDef, index) => {
        if (!testDef.func) {
            console.warn(`Função de teste não definida para: ${testDef.label}`);
            return; // Pular se a função não estiver definida (ex: testes S2 ainda não portados)
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
        button.id = `runIndTest-${testDef.group}-${index}`;

        button.onclick = async () => {
            const logger = getLoggerForGroup(testDef.group);
            const testNameForLog = testDef.func.name || testDef.label.split(': ')[1].replace(/\s/g, '');
            
            logger(`--- Iniciando teste individual: ${testDef.label} ---`, 'test', testNameForLog);
            
            // Desabilitar todos os botões de teste (individuais e "run all")
            const allTestButtons = document.querySelectorAll(
                '#individual-tests-container button, #runAllS1Btn, #runAllS2Btn, #runAllS3Btn'
            );
            allTestButtons.forEach(btn => btn.disabled = true);

            try {
                await testDef.func();
            } catch (e) {
                logger(`Erro EXCEPCIONAL no teste individual ${testDef.label}: ${e.message}`, 'critical', testNameForLog);
                console.error(`Erro EXCEPCIONAL no teste individual ${testDef.label}:`, e);
            } finally {
                logger(`--- Teste individual ${testDef.label} concluído ---`, 'test', testNameForLog);
                allTestButtons.forEach(btn => btn.disabled = false); // Reabilitar todos
            }
        };
        container.appendChild(button);
    });
}

// --- Função Principal de Inicialização ---
function initialize() {
    console.log("Suite de Vulnerabilidades (Super Modular) Inicializada.");

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
        console.warn("Não foi possível atualizar OOB_CONFIG a partir da UI:", e.message);
    }

    // Listener para XSS postMessage
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type && typeof event.data.type === 'string') {
            const loggerKey = event.data.type.replace('log', ''); // "logS1" -> "S1"
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

    // Limpeza do S2 no unload da página
    window.addEventListener('unload', cleanupCanvasS2);
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
