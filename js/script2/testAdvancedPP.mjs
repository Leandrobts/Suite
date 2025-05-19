// js/script2/testAdvancedPP.mjs
import { logS2, PAUSE_S2, SHORT_PAUSE_S2 } from './s2_utils.mjs';
// Não são esperadas importações de state.mjs ou dom_elements.mjs aqui, pois o teste
// cria seus próprios elementos e objetos para teste de poluição de protótipo.

export async function testAdvancedPPS2() {
    const FNAME = 'testAdvancedPPS2'; 
    logS2("--- Teste: PP Avançado (Gadgets++) ---", 'test', FNAME);
    
    // Lista de propriedades e protótipos a serem testados para poluição.
    // Inclui verificações de 'gadget' para ver se a poluição tem efeitos colaterais perigosos.
    const propsToPollute = [ 
        { name: 'constructor', proto: Object.prototype, protoName: 'Object' }, 
        { name: '__proto__', proto: Object.prototype, protoName: 'Object' }, // Poluir __proto__ diretamente é geralmente bloqueado
        { name: 'isAdmin', proto: Object.prototype, protoName: 'Object', gadgetCheck: (obj, v) => obj.isAdmin === v ? 'Potencial bypass de isAdmin!' : null }, 
        { name: 'nodeType', proto: Object.prototype, protoName: 'Object' }, // Pode afetar bibliotecas que verificam nodeType
        { name: 'valueOf', proto: Object.prototype, protoName: 'Object', gadgetCheck: (obj,v) => { try {({})[Symbol.toPrimitive] = ()=>v; if (({})+"" === v) return "valueOf/toPrimitive quebrou!";} catch(e){return null;} return null;} },
        { name: 'toString', proto: Object.prototype, protoName: 'Object', gadgetCheck: (obj,v) => { try {if (({}).toString() === v) return "Object.toString quebrou!";} catch(e){return null;} return null;} },
        { name: 'hasOwnProperty', proto: Object.prototype, protoName: 'Object', gadgetCheck: (obj, v) => { try{({}).hasOwnProperty('a'); return null;} catch(e){ return `Object.hasOwnProperty quebrou! ${e.message}`;} } }, 
        
        // Poluição de protótipos de elementos DOM
        { name: 'innerHTML', proto: Element.prototype, protoName: 'Element', createTarget: () => document.createElement('div'), gadgetCheck: (obj,v) => obj.innerHTML === v ? 'PP afetou Element.innerHTML!' : null}, 
        { name: 'outerHTML', proto: Element.prototype, protoName: 'Element', createTarget: () => document.createElement('div'), gadgetCheck: (obj,v) => obj.outerHTML === v ? 'PP afetou Element.outerHTML!' : null }, 
        { name: 'textContent', proto: Node.prototype, protoName: 'Node', createTarget: () => document.createElement('div'), gadgetCheck: (obj,v) => obj.textContent === v ? 'PP afetou Node.textContent!' : null }, 
        { name: 'href', proto: HTMLAnchorElement.prototype, protoName: 'HTMLAnchorElement', gadgetCheck: (obj, v) => obj.href === v ? 'PP afetou a.href!' : null, createTarget: () => document.createElement('a')}, 
        { name: 'src', proto: HTMLImageElement.prototype, protoName: 'HTMLImageElement', gadgetCheck: (obj, v) => obj.src === v ? 'PP afetou img.src!' : null, createTarget: () => document.createElement('img') }, 
        { name: 'style', proto: HTMLElement.prototype, protoName: 'HTMLElement', gadgetCheck: (obj, v) => obj.style === v ? 'PP afetou el.style (objeto StylePropertyMap)!' : null, createTarget: () => document.createElement('div') }, 
        { name: 'onclick', proto: HTMLElement.prototype, protoName: 'HTMLElement', gadgetCheck: (obj, v) => obj.onclick === v ? 'PP afetou handler el.onclick!' : null, createTarget: () => document.createElement('button') }, 
        { name: 'onerror', proto: HTMLImageElement.prototype, protoName: 'HTMLImageElement', gadgetCheck: (obj, v) => obj.onerror === v ? 'PP afetou handler img.onerror!' : null, createTarget: () => document.createElement('img') }, 
        { name: 'onload', proto: HTMLImageElement.prototype, protoName: 'HTMLImageElement', gadgetCheck: (obj, v) => obj.onload === v ? 'PP afetou handler img.onload!' : null, createTarget: () => document.createElement('img') }, 
        { name: 'appendChild', proto: Node.prototype, protoName: 'Node', createTarget: () => document.createElement('div'), gadgetCheck: (obj, v) => { try { obj.appendChild(document.createElement('span')); return null; } catch(e){ return `Node.appendChild quebrou! ${e.message}`;} } }, 
        { name: 'addEventListener', proto: EventTarget.prototype, protoName: 'EventTarget', createTarget: () => document.createElement('div'), gadgetCheck: (obj, v) => { try { obj.addEventListener('test', ()=>{}); return null; } catch(e){ return `EventTarget.addEventListener quebrou! ${e.message}`;} } }, 
        
        // Poluição de protótipos de elementos de formulário
        { name: 'value', proto: HTMLInputElement.prototype, protoName: 'HTMLInputElement', createTarget: () => document.createElement('input'), gadgetCheck: (obj,v) => obj.value === v ? 'PP afetou input.value!' : null }, 
        { name: 'value', proto: HTMLTextAreaElement.prototype, protoName: 'HTMLTextAreaElement', createTarget: () => document.createElement('textarea'), gadgetCheck: (obj,v) => obj.value === v ? 'PP afetou textarea.value!' : null }, 
        
        // Poluição de protótipos de Array
        { name: 'map', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[].map(()=>{}); return null;} catch(e){ return `Array.map quebrou! ${e.message}`;} }, createTarget: () => [] }, 
        { name: 'filter', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[].filter(()=>{}); return null;} catch(e){ return `Array.filter quebrou! ${e.message}`;} }, createTarget: () => [] }, 
        { name: 'forEach', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[].forEach(()=>{}); return null;} catch(e){ return `Array.forEach quebrou! ${e.message}`;} }, createTarget: () => [] }, 
        { name: 'join', proto: Array.prototype, protoName: 'Array', gadgetCheck: (obj, v) => { try{[1,2].join(); return null;} catch(e){ return `Array.join quebrou! ${e.message}`;} }, createTarget: () => [] }, 
        
        // Poluição de protótipos de Function
        { name: 'call', proto: Function.prototype, protoName: 'Function', gadgetCheck: (obj, v) => { try{function f(){}; f.call(); return null;} catch(e){ return `Function.call quebrou! ${e.message}`;} }, createTarget: () => function(){} }, 
        { name: 'apply', proto: Function.prototype, protoName: 'Function', gadgetCheck: (obj, v) => { try{function f(){}; f.apply(); return null;} catch(e){ return `Function.apply quebrou! ${e.message}`;} }, createTarget: () => function(){} }, 
    ];
    
    const testValue = "PP_Adv_Polluted_" + Date.now(); 
    let successCount = 0; 
    let gadgetCount = 0; 
    let gadgetMessages = [];
    
    for (const item of propsToPollute) { 
        if (!item.proto) { 
            logS2(`AVISO: Protótipo não definido para ${item.name}. Pulando.`, 'warn', FNAME);
            continue; 
        } 
        const prop = item.name; 
        const targetProto = item.proto; 
        const targetProtoName = item.protoName; 
        let inherited = false; 
        let gadgetMsg = null; 
        let errorMsg = null; 
        let originalValue = undefined; 
        let wasDefined = false; 
        
        try { 
            // Verifica se a propriedade já existe e guarda o valor original
            if (Object.prototype.hasOwnProperty.call(targetProto, prop)) {
                wasDefined = true; 
                originalValue = targetProto[prop]; 
            }
        } catch (e) { 
            logS2(`AVISO: Erro ao verificar/obter valor original de ${targetProtoName}.${prop}: ${e.message}`, 'warn', FNAME); 
            continue; // Pula este teste se não puder acessar o original de forma segura
        } 
        
        try { 
            targetProto[prop] = testValue; // Tenta poluir
            
            let obj; 
            if (item.createTarget) { 
                try { obj = item.createTarget(); } catch (e) { 
                    logS2(`AVISO: Falha ao criar objeto alvo para ${targetProtoName}.${prop}: ${e.message}`, 'warn', FNAME);
                    obj = {}; // Fallback para um objeto simples
                } 
            } else { 
                obj = {}; 
            } 
            
            let inheritedValue = undefined; 
            try { 
                inheritedValue = obj[prop]; // Verifica se o objeto herda o valor poluído
            } catch (e) {
                // Algumas propriedades podem lançar erro ao serem acessadas se poluídas de forma inadequada
                logS2(`AVISO: Erro ao acessar ${prop} no objeto de teste para ${targetProtoName}: ${e.message}`, 'warn', FNAME);
            }
            
            if (inheritedValue === testValue) { 
                logS2(`-> VULN: Herança PP para '${targetProtoName}.${prop}' OK.`, 'vuln', FNAME); 
                inherited = true; 
                successCount++; 
                
                if (item.gadgetCheck) { 
                    try { 
                        gadgetMsg = item.gadgetCheck(obj, testValue); 
                    } catch(e){
                        gadgetMsg = `Erro ao executar gadgetCheck para ${prop}: ${e.message}`;
                    } 
                    if (gadgetMsg) { 
                        logS2(`-> GADGET? ${gadgetMsg}`, 'critical', FNAME); 
                        gadgetMessages.push(prop + ": " + gadgetMsg); 
                        gadgetCount++; 
                        // Lista de propriedades consideradas mais perigosas se afetadas por PP
                        const dangerousProps = ['innerHTML', 'outerHTML', 'src', 'href', 'onclick', 'onerror', 'onload', 'value', 'postMessage', 'send', 'call', 'apply', 'map', 'filter', 'forEach', 'appendChild', 'addEventListener', 'hasOwnProperty', 'join', 'constructor', '__proto__'];
                        if (dangerousProps.includes(prop)) { 
                            logS2(` ---> *** ALERTA: Potencial Gadget PP perigoso detectado para '${prop}'! ***`, 'escalation', FNAME); 
                        } 
                    } 
                } 
            } else { 
                // Caso especial para __proto__: a poluição direta é complexa e muitas vezes não funciona como esperado
                // para mudar a cadeia de protótipos de objetos existentes de forma simples.
                if (prop === '__proto__') { 
                    logS2(`-> INFO: Tentativa de poluir '${targetProtoName}.${prop}'. Herança direta pode não ser observável desta forma ou foi bloqueada.`, 'info', FNAME); 
                } else {
                    logS2(`-> FAIL: Herança PP para '${targetProtoName}.${prop}' não detectada ou valor diferente (Esperado: ${testValue}, Recebido: ${inheritedValue}).`, 'good', FNAME);
                }
            } 
        } catch (e) { 
            logS2(`Erro ao poluir/testar '${targetProtoName}.${prop}': ${e.message}`, 'error', FNAME); 
            errorMsg = e.message; 
        } finally { 
            // Restaura o valor original da propriedade no protótipo
            try { 
                let cleanupOK = true; 
                if (wasDefined) { 
                    targetProto[prop] = originalValue; 
                    try { if (targetProto[prop] !== originalValue && typeof originalValue !== 'object') cleanupOK = false; } catch(e){ cleanupOK = false; } 
                } else { 
                    delete targetProto[prop]; 
                    if (Object.prototype.hasOwnProperty.call(targetProto, prop)) cleanupOK = false; 
                } 
                if (!cleanupOK) { 
                    logS2(`---> CRITICAL: FALHA ao limpar/restaurar ${targetProtoName}.${prop}! Estado pode estar inconsistente. <---`, 'critical', FNAME); 
                } 
            } catch (e) { 
                logS2(`AVISO CRÍTICO: Erro INESPERADO ao limpar/restaurar ${targetProtoName}.${prop}: ${e.message}`, 'critical', FNAME); 
            } 
        } 
        await PAUSE_S2(15); // Pausa curta entre testes de propriedade
    }
    
    logS2(`--- Teste PP Avançado Concluído (${successCount} propriedades herdaram o valor poluído, ${gadgetCount} gadgets potenciais encontrados) ---`, 'test', FNAME); 
    if (gadgetCount > 0) { 
        logS2(`Gadgets detectados: ${gadgetMessages.join('; ')}`, 'critical', FNAME); 
    } 
    await PAUSE_S2();
}
