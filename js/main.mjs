// js/main.mjs
import { runAllTestsS1 } from './script1Tests.mjs';
import { runCanvasTest } from './script2Tests.mjs';
import { runAllAdvancedTestsS3, buildRopChain, viewMemory } from './script3Tests.mjs';
import { updateOOBConfigFromUI } from './config.mjs';
import { logS1 } from './logger.mjs'; // Para o listener de XSS

function initialize() {
    console.log("Suite de Vulnerabilidades Modular Inicializada.");

    // Anexar handlers aos botões principais
    const runBtnS1 = document.getElementById('runBtnS1');
    if (runBtnS1) {
        runBtnS1.onclick = runAllTestsS1;
    } else {
        console.error("Botão 'runBtnS1' não encontrado.");
    }

    const runCanvasBtn = document.getElementById('runCanvasBtn');
    if (runCanvasBtn) {
        runCanvasBtn.onclick = runCanvasTest;
    } else {
        console.error("Botão 'runCanvasBtn' não encontrado.");
    }

    const runAdvancedBtn = document.getElementById('runAdvancedBtn');
    if (runAdvancedBtn) {
        runAdvancedBtn.onclick = runAllAdvancedTestsS3;
    } else {
        console.error("Botão 'runAdvancedBtn' não encontrado.");
    }

    // Anexar handlers para as ferramentas do Script 3
    const buildRopBtn = document.getElementById('buildRopChainBtn');
    if (buildRopBtn) {
        buildRopBtn.onclick = buildRopChain;
    } else {
        console.error("Botão 'buildRopChainBtn' não encontrado.");
    }

    const viewMemoryBtn = document.getElementById('viewMemoryBtn');
    if (viewMemoryBtn) {
        viewMemoryBtn.onclick = viewMemory;
    } else {
        console.error("Botão 'viewMemoryBtn' não encontrado.");
    }

    // Exemplo de como chamar updateOOBConfigFromUI se você adicionar os inputs no HTML
    // Esta função espera que os elementos 'oobAllocSize', 'baseOffset', 'initialBufSize' existam.
    // Se não existirem, ela não fará nada prejudicial, mas é bom estar ciente.
    // Poderia ser chamada antes de testes que dependem de OOB_CONFIG, ou uma vez aqui.
    try {
        updateOOBConfigFromUI(document); // Passando 'document' como argumento
    } catch (e) {
        console.warn("Não foi possível atualizar OOB_CONFIG a partir da UI (elementos podem estar faltando):", e.message);
    }


    // Listener para mensagens de payloads XSS (se eles usarem parent.postMessage)
    window.addEventListener('message', (event) => {
        // Adicionar uma verificação de origem (event.origin) se o iframe for de uma origem diferente
        // if (event.origin !== 'expected_origin_if_any') return;

        if (event.data && event.data.type) {
            switch (event.data.type) {
                case 'logS1':
                    if (event.data.args && event.data.args.length >= 1) {
                        logS1(
                            event.data.args[0], // message
                            event.data.args[1] || 'info', // type
                            event.data.args[2] || '' // funcName
                        );
                    }
                    break;
                // Adicionar cases para logS2, logS3 se necessário
                default:
                    // console.debug("Mensagem postada recebida, tipo não tratado:", event.data.type);
                    break;
            }
        }
    });
}

// Esperar o DOM estar pronto para inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize(); // DOM já pronto
}
