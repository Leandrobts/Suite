// js/tests/s1/testCSPBypassS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC } from '../../utils.mjs';
import { getEl } from '../../domUtils.mjs';

const SHORT_PAUSE_S1 = 50; // Pode ser centralizado em um config de constantes se preferir

export async function testCSPBypassS1() {
    const FNAME = 'testCSPBypassS1';
    logS1("--- Iniciando Teste 1: XSS Básico (Script 1) ---", 'test', FNAME);
    const xssTargetDiv = getEl('xss-target-div');

    // Teste com data: URI
    try {
        const payloadJS = `try { parent.postMessage({ type: 'logS1', args: ["[Payload Data:] Alerta data: URI executado!", "vuln", "XSS Payload"] }, '*'); alert('XSS S1 via Data URI!'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["[Payload Data:] Alerta data: URI bloqueado: " + e.message, "good", "XSS Payload"] }, '*'); }`;
        const encodedPayload = btoa(payloadJS);
        const scriptTag = document.createElement('script');
        scriptTag.src = 'data:text/javascript;base64,' + encodedPayload;
        scriptTag.onerror = (e) => { logS1(`ERRO: Falha carregar script data: URI! Event: ${e.type}`, 'error', FNAME); };
        document.body.appendChild(scriptTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2);
        if(scriptTag.parentNode) document.body.removeChild(scriptTag);
    } catch (e) { logS1(`Erro ao criar/adicionar script data: URI: ${e.message}`, 'error', FNAME); }
    
    await PAUSE_FUNC(SHORT_PAUSE_S1);

    // Teste com img onerror
    try {
        const imgTag = document.createElement('img');
        imgTag.src = 'invalid_img_' + Date.now(); // Forçar erro
        const onerrorPayload = ` try { const target = document.getElementById('xss-target-div'); if (target) { target.innerHTML += '<br><span class="log-vuln">XSS S1 DOM via ONERROR Executado!</span>'; parent.postMessage({ type: 'logS1', args: ["XSS DOM via onerror OK!", "vuln", "ONERROR Payload"] }, '*'); } else { parent.postMessage({ type: 'logS1', args: ["Alvo XSS DOM não encontrado.", "error", "ONERROR Payload"] }, '*'); } alert('XSS_S1_DOM_ONERROR'); } catch(e) { parent.postMessage({ type: 'logS1', args: ["Erro payload onerror: " + e.message, "warn", "ONERROR Payload"] }, '*'); } `;
        imgTag.setAttribute('onerror', onerrorPayload);
        document.body.appendChild(imgTag);
        await PAUSE_FUNC(SHORT_PAUSE_S1 * 2); 
        if (imgTag.parentNode) document.body.removeChild(imgTag);
    } catch (e) { logS1(`Erro ao criar/adicionar img onerror: ${e.message}`, 'error', FNAME); }

    await PAUSE_FUNC(SHORT_PAUSE_S1);
    
    // Teste com javascript: href (requer clique manual)
    try {
        const link = document.createElement('a');
        link.href = "javascript:try{parent.postMessage({ type: 'logS1', args: ['[Payload JS Href:] Executado!', 'vuln', 'XSS Payload JS Href']},'*'); alert('XSS S1 via JS Href!');}catch(e){parent.postMessage({ type: 'logS1', args: ['[Payload JS Href:] Bloqueado: '+e.message,'good','XSS Payload JS Href']},'*');}";
        link.textContent = "[Test Link JS Href - Clique Manual]";
        link.style.display = 'block'; link.style.color = 'cyan';
        if (xssTargetDiv) xssTargetDiv.appendChild(link); // Adicionar ao div alvo
        logS1("Adicionado link javascript: href para teste manual.", 'info', FNAME);
    } catch(e) { logS1(`Erro ao criar link js: href: ${e.message}`, 'error', FNAME); }
    
    logS1("--- Teste 1 Concluído ---", 'test', FNAME);
}
