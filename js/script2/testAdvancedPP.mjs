// js/script2/testAdvancedPP.mjs
import { logS2, PAUSE_S2 } from './s2_utils.mjs';

export async function testAdvancedPPS2() {
    const FNAME = 'testAdvancedPPS2'; 
    logS2("--- Teste: PP Avançado (Gadgets++) ---", 'test', FNAME);
    
    const propsToPollute = [ 
        { name: 'constructor', proto: Object.prototype, protoName: 'Object', 
          gadgetCheck: (obj, pollutedValue) => (obj.constructor === pollutedValue) ? 'Object.constructor foi poluído!' : null },
        { name: '__proto__', proto: Object.prototype, protoName: 'Object',
          gadgetCheck: (obj, pollutedValue) => (Object.getPrototypeOf(obj) === pollutedValue || obj.__proto__ === pollutedValue) ? 'Object.__proto__ foi diretamente poluído (raro e perigoso)!' : null},
        { name: 'isAdmin', proto: Object.prototype, protoName: 'Object', 
          gadgetCheck: (obj, pollutedValue) => obj.isAdmin === pollutedValue ? 'Potencial bypass de isAdmin!' : null }, 
        { name: 'nodeType', proto: Object.prototype, protoName: 'Object',
          gadgetCheck: (obj, pollutedValue) => obj.nodeType === pollutedValue ? 'Object.nodeType foi poluído!' : null}, 
        { name: 'valueOf', proto: Object.prototype, protoName: 'Object',
          gadgetCheck: (obj, pollutedValue) => { try { if (obj.valueOf() === pollutedValue && typeof pollutedValue !== 'function') return "Object.valueOf foi poluído para retornar um valor constante!"; } catch(e) { if(obj.valueOf === pollutedValue) return "Object.valueOf foi sobrescrito!";} return null;} },
        { name: 'toString', proto: Object.prototype, protoName: 'Object',
          gadgetCheck: (obj, pollutedValue) => { try { if (obj.toString() === pollutedValue && typeof pollutedValue !== 'function') return "Object.toString foi poluído para retornar um valor constante!"; } catch(e) { if(obj.toString === pollutedValue) return "Object.toString foi sobrescrito!";} return null;} },
        { name: 'hasOwnProperty', proto: Object.prototype, protoName: 'Object', 
          gadgetCheck: (obj, pollutedValue) => { try { obj.hasOwnProperty('test'); return null; } catch(e) { if (obj.hasOwnProperty === pollutedValue) return `Object.hasOwnProperty foi sobrescrito e quebrou! (${e.message})`; return `Object.hasOwnProperty quebrou de outra forma: ${e.message}`;}} }, 
        
        { name: 'innerHTML', proto: Element.prototype, protoName: 'Element', createTarget: () => document.createElement('div'), 
          gadgetCheck: (obj, pollutedValue) => { try { return obj.innerHTML === pollutedValue ? 'Element.innerHTML foi afetado!' : null } catch(e) { return `Element.innerHTML inacessível ou erro: ${e.message}`;}}}, 
        { name: 'outerHTML', proto: Element.prototype, protoName: 'Element', createTarget: () => document.createElement('div'),
          gadgetCheck: (obj, pollutedValue) => { try { return obj.outerHTML === pollutedValue ? 'Element.outerHTML foi afetado!' : null } catch(e) { return `Element.outerHTML inacessível ou erro: ${e.message}`;}}}, 
        { name: 'textContent', proto: Node.prototype, protoName: 'Node', createTarget: () => document.createElement('div'),
          gadgetCheck: (obj, pollutedValue) => { try { return obj.textContent === pollutedValue ? 'Node.textContent foi afetado!' : null } catch(e) { return `Node.textContent inacessível ou erro: ${e.message}`;}}}, 
        { name: 'href', proto: HTMLAnchorElement.prototype, protoName: 'HTMLAnchorElement', createTarget: () => document.createElement('a'),
          gadgetCheck: (obj, pollutedValue) => obj.href === pollutedValue ? 'a.href foi afetado!' : (String(obj.href).endsWith(pollutedValue) ? 'a.href parece ter sido afetado (termina com o valor poluído)!' : null)}, 
        { name: 'src', proto: HTMLImageElement.prototype, protoName: 'HTMLImageElement', createTarget: () => document.createElement('img'),
          gadgetCheck: (obj, pollutedValue) => obj.src === pollutedValue ? 'img.src foi afetado!' : (String(obj.src).endsWith(pollutedValue) ? 'img.src parece ter sido afetado (termina com o valor poluído)!' : null)}, 
        { name: 'style', proto: HTMLElement.prototype, protoName: 'HTMLElement', createTarget: () => document.createElement('div'),
          gadgetCheck: (obj, pollutedValue) => obj.style === pollutedValue ? 'el.style (objeto CSSStyleDeclaration) foi sobrescrito!' : null }, 
        { name: 'onclick', proto: HTMLElement.prototype, protoName: 'HTMLElement', createTarget: () => document.createElement('button'),
          gadgetCheck: (obj, pollutedValue) => obj.onclick === pollutedValue ? 'el.onclick foi afetado!' : null }, 
        { name: 'onerror', proto: HTMLImageElement.prototype, protoName: 'HTMLImageElement', createTarget: () => document.createElement('img'),
          gadgetCheck: (obj, pollutedValue) => obj.onerror === pollutedValue ? 'img.onerror foi afetado!' : null }, 
        { name: 'onload', proto: HTMLImageElement.prototype, protoName: 'HTMLImageElement', createTarget: () => document.createElement('img'),
          gadgetCheck: (obj, pollutedValue) => obj.onload === pollutedValue ? 'img.onload foi afetado!' : null }, 
        
        { name: 'appendChild', proto: Node.prototype, protoName: 'Node', createTarget: () => document.createElement('div'), 
          gadgetCheck: (obj, pollutedValue) => { try { obj.appendChild(document.createElement('span')); return null; } catch(e){ if (obj.appendChild === pollutedValue) return `Node.appendChild foi sobrescrito e quebrou! (${e.message})`; return `Node.appendChild quebrou de outra forma: ${e.message}`;}} }, 
        { name: 'addEventListener', proto: EventTarget.prototype, protoName: 'EventTarget', createTarget: () => document.createElement('div'),
          gadgetCheck: (obj, pollutedValue) => { try { obj.addEventListener('test', ()=>{}); return null; } catch(e){ if (obj.addEventListener === pollutedValue) return `EventTarget.addEventListener foi sobrescrito e quebrou! (${e.message})`; return `EventTarget.addEventListener quebrou de outra forma: ${e.message}`;}} }, 
        
        { name: 'value', proto: HTMLInputElement.prototype, protoName: 'HTMLInputElement', createTarget: () => document.createElement('input'),
          gadgetCheck: (obj, pollutedValue) => obj.value === pollutedValue ? 'input.value foi afetado!' : null }, 
        { name: 'value', proto: HTMLTextAreaElement.prototype, protoName: 'HTMLTextAreaElement', createTarget: () => document.createElement('textarea'),
          gadgetCheck: (obj, pollutedValue) => obj.value === pollutedValue ? 'textarea.value foi afetado!' : null }, 
        
        { name: 'map', proto: Array.prototype, protoName: 'Array', createTarget: () => [],
          gadgetCheck: (obj, pollutedValue) => { try { obj.map(()=>{}); return null; } catch(e){ if (obj.map === pollutedValue) return `Array.map foi sobrescrito e quebrou! (${e.message})`; return `Array.map quebrou de outra forma: ${e.message}`;}} }, 
        { name: 'filter', proto: Array.prototype, protoName: 'Array', createTarget: () => [],
          gadgetCheck: (obj, pollutedValue) => { try { obj.filter(()=>{}); return null; } catch(e){ if (obj.filter === pollutedValue) return `Array.filter foi sobrescrito e quebrou! (${e.message})`; return `Array.filter quebrou de outra forma: ${e.message}`;}} }, 
        { name: 'forEach', proto: Array.prototype, protoName: 'Array', createTarget: () => [],
          gadgetCheck: (obj, pollutedValue) => { try { obj.forEach(()=>{}); return null; } catch(e){ if (obj.forEach === pollutedValue) return `Array.forEach foi sobrescrito e quebrou! (${e.message})`; return `Array.forEach quebrou de outra forma: ${e.message}`;}} }, 
        { name: 'join', proto: Array.prototype, protoName: 'Array', createTarget: () => [1,2],
          gadgetCheck: (obj, pollutedValue) => { try { obj.join(); return null; } catch(e){ if (obj.join === pollutedValue) return `Array.join foi sobrescrito e quebrou! (${e.message})`; return `Array.join quebrou de outra forma: ${e.message}`;}} }, 
        
        { name: 'call', proto: Function.prototype, protoName: 'Function', createTarget: () => function f(){},
          gadgetCheck: (obj, pollutedValue) => { try { obj.call(null); return null; } catch(e){ if (obj.call === pollutedValue) return `Function.call foi sobrescrito e quebrou! (${e.message})`; return `Function.call quebrou de outra forma: ${e.message}`;}} }, 
        { name: 'apply', proto: Function.prototype, protoName: 'Function', createTarget: () => function f(){},
          gadgetCheck: (obj, pollutedValue) => { try { obj.apply(null); return null; } catch(e){ if (obj.apply === pollutedValue) return `Function.apply foi sobrescrito e quebrou! (${e.message})`; return `Function.apply quebrou de outra forma: ${e.message}`;}} }, 
    ];
    
    const testValue = "PP_S2_Adv_Polluted_" + Date.now(); 
    let successCount = 0; 
    let gadgetCount = 0; 
    let gadgetMessages = [];
    
    for (const item of propsToPollute) { 
        if (!item.proto) { 
            logS2(`AVISO: Protótipo não definido para ${item.name} em testAdvancedPPS2. Pulando.`, 'warn', FNAME);
            continue; 
        } 
        const prop = item.name; 
        const targetProto = item.proto; 
        const targetProtoName = item.protoName; 
        
        let originalValue = undefined; 
        let wasDefined = false; 
        let errorAccessingOriginal = false;
        
        try { 
            if (Object.prototype.hasOwnProperty.call(targetProto, prop)) {
                wasDefined = true; 
                originalValue = targetProto[prop]; 
            }
        } catch (e) { 
            // "Illegal invocation" pode acontecer aqui para getters de protótipos DOM
            logS2(`AVISO: Erro ao verificar/obter valor original de ${targetProtoName}.${prop}: ${e.message}. Isso pode ser esperado para protótipos DOM.`, 'warn', FNAME); 
            errorAccessingOriginal = true;
            // Continuar mesmo assim, pois ainda podemos tentar poluir e verificar na instância.
        } 
        
        let pollutionAttempted = false;
        try { 
            // Não poluir 'constructor' ou '__proto__' em Object.prototype se já existir e for uma função (para constructor)
            // ou se for __proto__ (para evitar quebrar Object.getPrototypeOf)
            // A poluição de 'constructor' pode ser especialmente problemática.
            let shouldPollute = true;
            if (prop === 'constructor' && targetProto === Object.prototype && typeof originalValue === 'function' && wasDefined) {
                // logS2(`INFO: Evitando poluição direta de Object.prototype.constructor original.`, 'info', FNAME);
                // shouldPollute = false; // Decida se quer realmente pular isso
            }
            if (prop === '__proto__' && targetProto === Object.prototype) {
                 // logS2(`INFO: Evitando poluição direta de Object.prototype.__proto__.`, 'info', FNAME);
                 // shouldPollute = false;
            }


            if (shouldPollute) {
                targetProto[prop] = testValue; 
                pollutionAttempted = true;
            } else if (!pollutionAttempted && !errorAccessingOriginal) { // Se não poluímos e não houve erro ao acessar original
                 // Se decidimos não poluir, não há como verificar herança do testValue
                logS2(`INFO: Poluição de ${targetProtoName}.${prop} pulada intencionalmente.`, 'info', FNAME);
                // Limpeza (redundante se não poluiu, mas seguro)
                if (wasDefined && !errorAccessingOriginal) { targetProto[prop] = originalValue; } else if (!errorAccessingOriginal) { delete targetProto[prop];}
                await PAUSE_S2(5); // Pausa curta
                continue;
            }
            
            let obj; 
            if (item.createTarget) { 
                try { obj = item.createTarget(); } 
                catch (e) { 
                    logS2(`AVISO: Falha ao criar objeto alvo para ${targetProtoName}.${prop}: ${e.message}`, 'warn', FNAME);
                    obj = {}; 
                } 
            } else { 
                obj = {}; 
            } 
            
            let inheritedValue = undefined; 
            let errorAccessingInherited = false;
            try { 
                inheritedValue = obj[prop]; 
            } catch (e) {
                logS2(`AVISO: Erro ao acessar ${prop} no objeto de teste para ${targetProtoName} após poluição: ${e.message}`, 'warn', FNAME);
                errorAccessingInherited = true;
            }
            
            // Verifica se a poluição foi bem-sucedida na instância
            // E se a propriedade poluída é realmente o testValue, não um getter que retorna algo diferente.
            if (!errorAccessingInherited && inheritedValue === testValue) { 
                logS2(`-> VULN: Herança PP para '${targetProtoName}.${prop}' OK (valor = testValue).`, 'vuln', FNAME); 
                successCount++; 
                
                if (item.gadgetCheck) { 
                    let gadgetMsg = null;
                    try { 
                        // O gadgetCheck agora é mais robusto para lidar com o fato de que obj[prop] pode ser testValue
                        gadgetMsg = item.gadgetCheck(obj, testValue); 
                    } catch(e){
                        gadgetMsg = `Erro ao executar gadgetCheck para ${prop}: ${e.message}`;
                    } 
                    if (gadgetMsg) { 
                        logS2(`-> GADGET? ${gadgetMsg}`, 'critical', FNAME); 
                        gadgetMessages.push(`${prop}: ${gadgetMsg}`); 
                        gadgetCount++; 
                        const dangerousProps = ['innerHTML', 'outerHTML', 'src', 'href', 'onclick', 'appendChild', 'addEventListener', 'hasOwnProperty', 'map', 'filter', 'forEach', 'join', 'call', 'apply', 'constructor', '__proto__'];
                        if (dangerousProps.includes(prop)) { 
                            logS2(` ---> *** ALERTA: Potencial Gadget PP perigoso detectado para '${prop}'! ***`, 'escalation', FNAME); 
                        } 
                    } 
                } 
            } else if (pollutionAttempted) { 
                logS2(`-> FAIL/INFO: Poluição de '${targetProtoName}.${prop}' tentada. ` + 
                      (errorAccessingInherited ? `Erro ao acessar valor herdado.` : `Valor herdado: ${String(inheritedValue).substring(0,100)} (Esperado: ${testValue})`), 
                      'good', FNAME); 
            }
        } catch (e) { 
            logS2(`Erro ao poluir/testar '${targetProtoName}.${prop}': ${e.message}`, 'error', FNAME); 
        } finally { 
            // Restaura o valor original da propriedade no protótipo
            if (pollutionAttempted) { // Só tenta restaurar se tentamos poluir
                try { 
                    let cleanupOK = true; 
                    if (wasDefined && !errorAccessingOriginal) { // Só restaura se sabíamos o valor original e não houve erro ao acessá-lo
                        targetProto[prop] = originalValue; 
                        // Verificar a restauração pode ser complexo se originalValue for um objeto ou função
                        // if (targetProto[prop] !== originalValue && typeof originalValue !== 'object' && typeof originalValue !== 'function') cleanupOK = false;
                    } else if (!wasDefined && !errorAccessingOriginal) { // Se não era definido e não houve erro, deleta
                        delete targetProto[prop]; 
                        if (Object.prototype.hasOwnProperty.call(targetProto, prop)) cleanupOK = false; 
                    } else {
                        // Se houve erro ao acessar o original, a restauração é incerta.
                        // Pode ser necessário não tentar restaurar ou ter uma estratégia diferente.
                        // logS2(`INFO: Restauração de ${targetProtoName}.${prop} pulada devido a erro anterior no acesso ao original.`, 'info', FNAME);
                        cleanupOK = false; // Marca como não OK por precaução
                    }
                    if (!cleanupOK) { 
                        // logS2(`---> AVISO: Restauração de ${targetProtoName}.${prop} pode não ter sido completa. <---`, 'warn', FNAME); 
                    } 
                } catch (e) { 
                    logS2(`AVISO CRÍTICO: Erro INESPERADO ao limpar/restaurar ${targetProtoName}.${prop}: ${e.message}`, 'critical', FNAME); 
                }
            }
        } 
        await PAUSE_S2(10); 
    }
    
    logS2(`--- Teste PP Avançado Concluído (${successCount} poluições bem-sucedidas verificadas, ${gadgetCount} gadgets potenciais) ---`, 'test', FNAME); 
    if (gadgetCount > 0) { 
        logS2(`Resumo dos Gadgets Potenciais Detectados:`, 'critical', FNAME); 
        gadgetMessages.forEach(msg => logS2(`  - ${msg}`, 'critical', FNAME));
    } 
    await PAUSE_S2();
}
