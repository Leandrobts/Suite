// js/tests/s1/testWebWorkersS1.mjs
import { logS1 } from '../../logger.mjs';
// PAUSE_FUNC não é usado aqui

export async function testWebWorkersS1() {
    const FNAME = 'testWebWorkersS1';
    logS1("--- Iniciando Teste 8: Web Workers ---", 'test', FNAME);
    let worker = null;
    let workerRepliedCorrectly = false; 
    let initialPPMessageProcessed = false;
    let workerError = false;
    let ppDetectedWorkerMain = false;
    let ppDetectedInWorkerScope = false;
    const ppPropWorker = '__worker_polluted_s1_module__';
    Object.prototype[ppPropWorker] = 'Worker Polluted S1 Module!';

    const workerCode = `
        const ppPropName = '${ppPropWorker}';
        const expectedPPValue = 'Worker Polluted S1 Module!';
        let ppOnInit = false;
        try {
            if (self[ppPropName] === expectedPPValue) {
                ppOnInit = true;
            }
        } catch(e){}
        self.postMessage({ type: 'init_status', ppWorkerScopeOnInit: ppOnInit, payload: 'Worker initialized.' });

        self.onmessage = function(e) {
            let response = 'Worker received from main: ' + e.data;
            let ppInOnMessage = false;
            try {
                if (self[ppPropName] === expectedPPValue) {
                    response += ' [PP Detected In Worker onmessage!]';
                    ppInOnMessage = true;
                }
            } catch(err) {}
            self.postMessage({ type: 'message_reply', payload: response, ppWorkerScopeOnMessage: ppInOnMessage });
        };
    `;

    const workerPromise = new Promise((resolve, reject) => {
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);
            worker = new Worker(blobUrl);

            try { 
                if (worker && worker[ppPropWorker] === Object.prototype[ppPropWorker]) {
                    logS1(`VULN: PP afetou instância Worker main thread ('${ppPropWorker}')!`, 'vuln', FNAME);
                    ppDetectedWorkerMain = true;
                }
            } catch(e){ logS1(`Erro ao checar PP em Worker (main thread): ${e.message}`, 'warn', FNAME); }

            let initMessageReceived = false;
            let replyMessageReceived = false;

            worker.onmessage = (event) => {
                if (event.data && event.data.type) {
                    if (event.data.type === 'init_status') {
                        initMessageReceived = true;
                        initialPPMessageProcessed = true; // Marcar que processamos esta mensagem
                        logS1(`Msg Init do Worker: "${event.data.payload}", PP detectada no Init: ${event.data.ppWorkerScopeOnInit}`, 'good', FNAME);
                        if (event.data.ppWorkerScopeOnInit) {
                            ppDetectedInWorkerScope = true;
                        }
                    } else if (event.data.type === 'message_reply') {
                        replyMessageReceived = true;
                        logS1(`Msg Resposta do Worker: "${event.data.payload}", PP detectada em onmessage: ${event.data.ppWorkerScopeOnMessage}`, 'good', FNAME);
                        if (event.data.payload.startsWith("Worker received from main:")) {
                             workerRepliedCorrectly = true; // A mensagem principal foi processada
                        }
                        if (event.data.ppWorkerScopeOnMessage) {
                            ppDetectedInWorkerScope = true; 
                        }
                    }
                    // Resolver quando ambas as mensagens esperadas forem recebidas
                    if (initMessageReceived && replyMessageReceived) {
                        resolve();
                    }
                } else {
                    logS1(`Mensagem inesperada do Worker: ${JSON.stringify(event.data)}`, 'warn', FNAME);
                }
            };

            worker.onerror = (event) => {
                logS1(`Erro no Worker: ${event.message || 'Erro desconhecido'} em ${event.filename}:${event.lineno}`, 'error', FNAME);
                workerError = true;
                event.preventDefault();
                reject(event.error || new Error(event.message || "Worker error event"));
            };

            worker.postMessage("Hello Worker S1 Module " + Date.now());

            setTimeout(() => {
                if (!(initMessageReceived && replyMessageReceived) && !workerError) {
                    workerError = true;
                    logS1("Timeout no Web Worker (esperando todas as mensagens).", 'warn', FNAME);
                    reject(new Error("Worker timeout"));
                }
            }, 7000); 

            URL.revokeObjectURL(blobUrl);

        } catch (e) {
            logS1(`Erro CRÍTICO criar/comunicar Worker: ${e.message}`, 'critical', FNAME);
            workerError = true;
            console.error(e);
            reject(e);
        }
    });

    try {
        await workerPromise;
    } catch(e) {
        if (!workerError) logS1(`Promessa Web Worker rejeitada (não por handler): ${e.message}`, 'warn', FNAME);
    } finally {
        try { if (worker) worker.terminate(); } catch(e) {}
        worker = null;
        delete Object.prototype[ppPropWorker];
        logS1(`--- Teste 8 Concluído (InitProcessado: ${initialPPMessageProcessed}, RespostaOK: ${workerRepliedCorrectly}, Erro: ${workerError}, PP Main: ${ppDetectedWorkerMain}, PP WorkerScope: ${ppDetectedInWorkerScope}) ---`, 'test', FNAME);
    }
}
