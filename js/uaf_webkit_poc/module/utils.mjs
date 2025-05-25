// js/uaf_webkit_poc/module/utils.mjs
/* Copyright (C) 2023 anonymous
   ... (licença AGPL completa como no seu arquivo original) ...
*/
import { Int } from './int64.mjs';

export function die(msg) {
    alert(msg);
    // Esta linha intencionalmente causa um erro para parar a execução.
    // Considere usar `throw new Error(msg);` para um erro mais limpo.
    undefinedFunction(); 
}

export function debug_log(msg) {
    try {
        let textNode = document.createTextNode(msg);
        let node = document.createElement("p");
        node.appendChild(textNode);
        // Adiciona um estilo simples para diferenciar dos outros logs
        node.style.color = "#00FF00"; // Verde para logs do UAF
        node.style.fontFamily = "monospace";
        node.style.borderTop = "1px dashed #33FF33";
        node.style.paddingTop = "5px";
        node.style.marginTop = "5px";

        document.body.appendChild(node);
        // Não adicionar <br> aqui, o <p> já é um bloco.
    } catch (e) {
        console.error("Erro em debug_log (UAF PoC):", e, "Mensagem original:", msg);
    }
}

export function clear_log() {
    // Esta função como está limparia TODO o body, o que não é ideal para a sua suíte.
    // Se for usada, precisaria ser adaptada para um container específico.
    // Por ora, o debug_log apenas anexa.
    // document.body.innerHTML = null; 
    console.warn("clear_log (UAF PoC) não está configurado para limpar seletivamente. Evite usar ou adapte.");
}

export function str2array(str, length, offset) {
    if (offset === undefined) {
        offset = 0;
    }
    let a = new Array(length);
    for (let i = 0; i < length; i++) {
        a[i] = str.charCodeAt(i + offset);
    }
    return a;
}

// alignment must be 32 bits and is a power of 2
export function align(a, alignment) {
    if (!(a instanceof Int)) {
        a = new Int(a);
    }
    const mask = -alignment & 0xffffffff;
    let type = a.constructor;
    let low = a.low() & mask;
    return new type(low, a.high());
}

export async function send(url, buffer, file_name, onload=() => {}) {
    const file = new File(
        [buffer],
        file_name,
        {type:'application/octet-stream'}
    );
    const form = new FormData();
    form.append('upload', file);

    debug_log(`Enviando dados para ${url}...`);
    try {
        const response = await fetch(url, {method: 'POST', body: form});
        if (!response.ok) {
            throw Error(`Network response was not OK, status: ${response.status}`);
        }
        if (onload && typeof onload === 'function') {
            onload();
        }
        debug_log('Dados enviados com sucesso.');
    } catch (e) {
        debug_log(`Erro ao enviar dados: ${e.message}`);
        console.error("Erro em send (UAF PoC):", e);
    }
}
