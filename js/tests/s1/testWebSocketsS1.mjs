// js/tests/s1/testWebSocketsS1.mjs
import { logS1 } from '../../logger.mjs';
// PAUSE_FUNC não é explicitamente usado aqui, mas pode ser útil para timeouts mais controlados se necessário.

export async function testWebSocketsS1() {
    const FNAME = 'testWebSocketsS1';
    logS1("--- Iniciando Teste 7: WebSockets ---", 'test', FNAME);
    const wsUrl = "wss://websocket-echo.com/"; 
    let ws = null;
    let connected = false;
    let messageReceived = false;
    let errorOccurred = false;
    const ppProp = '__ws_polluted_s1_module__';
    Object.prototype[ppProp] = 'WS Polluted S1 Module!';
    let ppDetected = false;

    const connectionPromise = new Promise((resolve, reject) => {
        try {
            ws = new WebSocket(wsUrl);

            try { 
                if (ws && ws[ppProp] === Object.prototype[ppProp]) { // Comparar com o valor setado
                    logS1(`VULN: PP afetou instância WebSocket ('${ppProp}')!`, 'vuln', FNAME);
                    ppDetected = true;
                }
            } catch(e){ logS1(`Erro ao checar PP em WebSocket: ${e.message}`, 'warn', FNAME); }

            ws.onopen = () => {
                logS1("WebSocket Conectado!", 'good', FNAME);
                connected = true;
                try {
                    const testMsg = "Hello WebSocket Test S1 Module " + Date.now();
                    ws.send(testMsg);
                    try { ws.send(new Blob(["blob data s1 module"])); } catch(e) { logS1(`Erro send Blob: ${e.message}`, 'warn', FNAME); }
                    try { ws.send(new ArrayBuffer(16)); } catch(e) { logS1(`Erro send ArrayBuffer: ${e.message}`, 'warn', FNAME); }
                } catch (e) {
                    logS1(`Erro ao enviar mensagem WebSocket: ${e.message}`, 'error', FNAME);
                    errorOccurred = true;
                    reject(e); // Rejeitar a promessa se o send falhar criticamente
                }
            };

            ws.onmessage = (event) => {
                const recMsg = String(event.data);
                logS1(`Mensagem WebSocket recebida: ${recMsg.substring(0, 100)}${recMsg.length > 100 ? '...' : ''}`, 'good', FNAME);
                if (recMsg.startsWith("Hello WebSocket Test S1 Module")) {
                    messageReceived = true;
                }
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close(1000, "Test Completed S1 Module");
                }
                resolve(); // Resolver quando a mensagem esperada for recebida e o socket fechado
            };

            ws.onerror = (event) => {
                logS1(`Erro no WebSocket: ${event.type || 'Erro desconhecido'}`, 'error', FNAME);
                errorOccurred = true;
                reject(new Error("WebSocket onerror triggered"));
            };

            ws.onclose = (event) => {
                logS1(`WebSocket Fechado. Code: ${event.code}, Reason: "${event.reason}", Clean: ${event.wasClean}`, event.wasClean ? 'good' : 'warn', FNAME);
                // A promessa já deve ter sido resolvida em onmessage ou rejeitada em onerror/timeout
                // Se chegou aqui sem resolver/rejeitar, pode ser um fechamento inesperado.
                if (!messageReceived && !errorOccurred) { // Se fechou sem sucesso e sem erro explícito
                   // reject(new Error(`WS fechado inesperadamente: Code ${event.code}`));
                }
                resolve(); // Resolve para garantir que o teste termine
            };

            setTimeout(() => {
                if (!connected && !messageReceived && !errorOccurred) { // Apenas timeout se nada aconteceu
                    logS1("Timeout no WebSocket (conexão ou mensagem).", 'warn', FNAME);
                    try { if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1001, "Timeout S1 Module"); } catch(e){}
                    reject(new Error("WebSocket timeout"));
                } else if (connected && !messageReceived && !errorOccurred) { // Conectado mas sem mensagem
                     logS1("Timeout no WebSocket (esperando mensagem).", 'warn', FNAME);
                     try { if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1001, "Timeout S1 Msg Module"); } catch(e){}
                     reject(new Error("WebSocket message timeout"));
                }
                // Se já resolveu ou rejeitou, o timeout não faz nada
            }, 10000); 

        } catch (e) {
            logS1(`Erro CRÍTICO ao criar WebSocket: ${e.message}`, 'critical', FNAME);
            errorOccurred = true;
            console.error(e);
            reject(e);
        }
    });

    try {
        await connectionPromise;
    } catch(e) {
        if (!errorOccurred) logS1(`Promessa WebSocket rejeitada (não por handler): ${e.message}`, 'warn', FNAME);
    } finally {
        try {
            if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                ws.close(1000, "Cleanup S1 Module");
            }
        } catch (e) { /* Silencioso */ }
        ws = null;
        delete Object.prototype[ppProp]; 
        logS1(`--- Teste 7 Concluído (Conectado: ${connected}, Msg OK: ${messageReceived}, Erro: ${errorOccurred}, PP Detect: ${ppDetected}) ---`, 'test', FNAME);
    }
}
