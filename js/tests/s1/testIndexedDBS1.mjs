// js/tests/s1/testIndexedDBS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC } from '../../utils.mjs';

const SHORT_PAUSE_S1 = 50;

export async function testIndexedDBS1() {
    const FNAME = 'testIndexedDBS1';
    logS1("--- Iniciando Teste 9: IndexedDB ---", 'test', FNAME);
    const dbName = "TestDB_S1_Module_" + Date.now(); // Nome único para evitar colisões
    const storeName = "TestStoreS1Module";
    let db = null; let errorMsg = null;
    let addOK = false; let getOK = false; let deleteOK = false; let addComplexOK = false;
    let deleteDbTimeoutId = null;

    if (typeof indexedDB === 'undefined') {
        logS1("API IndexedDB NÃO disponível neste ambiente.", 'error', FNAME);
        errorMsg = "indexedDB is undefined";
        logS1(`--- Teste 9 Concluído (API NÃO DISPONÍVEL, Erro: ${!!errorMsg}) ---`, 'test', FNAME);
        return;
    }

    try {
        logS1(`Tentando deletar DB antigo (se existir): ${dbName}...`, 'info', FNAME);
        await new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(dbName);
            
            deleteDbTimeoutId = setTimeout(() => {
                logS1(`(Async Timeout Check) Timeout ao tentar deletar DB: ${dbName}. Continuando.`, 'warn', `deleteDBTimeoutCheck`);
                resolve(); 
            }, 5000); 

            deleteRequest.onsuccess = () => {
                clearTimeout(deleteDbTimeoutId);
                logS1(`DB ${dbName} deletado ou não existia.`, 'good', FNAME);
                resolve();
            };
            deleteRequest.onerror = (e) => {
                clearTimeout(deleteDbTimeoutId);
                logS1(`Erro ao deletar DB ${dbName}: ${e.target.error}`, 'warn', FNAME);
                resolve(); 
            };
            deleteRequest.onblocked = () => {
                clearTimeout(deleteDbTimeoutId);
                logS1(`Deleção do DB ${dbName} bloqueada.`, 'warn', FNAME);
                resolve(); 
            };
        });
    } catch(eDel) {
      logS1(`Erro GERAL na fase de deleção prévia do DB ${dbName}: ${eDel.message}`, 'warn', FNAME);
    }
    deleteDbTimeoutId = null;

    await PAUSE_FUNC(SHORT_PAUSE_S1);

    try {
        logS1(`Abrindo/Criando IndexedDB: ${dbName}...`, 'info', FNAME);
        db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1); // Versão 1
            request.onupgradeneeded = (event) => {
                logS1("Evento onupgradeneeded disparado.", 'info', FNAME);
                try {
                    const dbInstance = event.target.result;
                    if (!dbInstance.objectStoreNames.contains(storeName)) {
                        logS1(`Criando object store: ${storeName}`, 'info', FNAME);
                        dbInstance.createObjectStore(storeName, { keyPath: "id" });
                    }
                } catch (e) {
                    logS1(`Erro durante onupgradeneeded: ${e.message}`, 'error', FNAME);
                    errorMsg = `Upgrade error: ${e.message}`;
                    reject(e);
                }
            };
            request.onsuccess = (event) => { logS1("IndexedDB aberto com sucesso.", 'good', FNAME); resolve(event.target.result); };
            request.onerror = (event) => {
                logS1(`Erro ao abrir IndexedDB: ${event.target.error}`, 'error', FNAME);
                errorMsg = `Open error: ${event.target.error}`;
                reject(event.target.error);
            };
            setTimeout(() => reject(new Error(`Timeout abrindo DB ${dbName}`)), 5000);
        });

        if (db) {
            const simpleId = "simple_" + Date.now();
            const addData = { id: simpleId, name: "TestDataS1Module", value: Math.random() };
            logS1(`Testando adicionar registro simples (ID: ${simpleId})...`, 'info', FNAME);
            await new Promise((resolve, reject) => {
                const t = db.transaction([storeName], "readwrite"); 
                t.onabort = () => reject(new Error(`Transação abortada (Add): ${t.error?.message || 'desconhecido'}`)); 
                t.onerror = () => reject(t.error || new Error('Erro na transação (Add)'));
                const s = t.objectStore(storeName); const r = s.add(addData);
                r.onsuccess = () => { addOK = true; resolve(simpleId); }; 
                r.onerror = () => reject(r.error || new Error('Erro request.add'));
            });
            logS1(`Adicionar registro simples ${addOK ? 'OK' : 'FALHOU'}.`, addOK ? 'good' : 'error', FNAME);

            if (addOK) {
                logS1(`Testando ler registro simples (ID: ${simpleId})...`, 'info', FNAME);
                const getData = await new Promise((resolve, reject) => {
                    const t = db.transaction([storeName], "readonly"); /* ... handlers ... */
                    t.onabort = () => reject(new Error(`Transação abortada (Get): ${t.error?.message || 'desconhecido'}`)); 
                    t.onerror = () => reject(t.error || new Error('Erro na transação (Get)'));
                    const s = t.objectStore(storeName); const r = s.get(simpleId);
                    r.onsuccess = () => { getOK = (r.result != null); resolve(r.result); }; 
                    r.onerror = () => reject(r.error || new Error('Erro request.get'));
                });
                logS1(`Ler registro simples ${getOK ? 'OK' : 'FALHOU'}. Data: ${getOK ? JSON.stringify(getData) : 'N/A'}`, getOK ? 'good' : 'error', FNAME);

                if (getOK) {
                    logS1(`Testando deletar registro simples (ID: ${simpleId})...`, 'info', FNAME);
                    await new Promise((resolve, reject) => {
                         const t = db.transaction([storeName], "readwrite"); /* ... handlers ... */
                         t.onabort = () => reject(new Error(`Transação abortada (Del): ${t.error?.message || 'desconhecido'}`)); 
                         t.onerror = () => reject(t.error || new Error('Erro na transação (Del)'));
                         const s = t.objectStore(storeName); const r = s.delete(simpleId);
                         r.onsuccess = () => { deleteOK = true; resolve(); }; 
                         r.onerror = () => reject(r.error || new Error('Erro request.delete'));
                    });
                    logS1(`Deletar registro simples ${deleteOK ? 'OK' : 'FALHOU'}.`, deleteOK ? 'good' : 'error', FNAME);
                }
            }

            logS1("Testando adicionar Blob e ArrayBuffer...", 'info', FNAME);
            const blobData = new Blob(['Test Blob Data S1 Module - ' + Date.now()], {type: 'text/plain'});
            const bufferData = new Uint8Array([10, 20, 30, 40, Date.now() % 256]).buffer;
            try {
                await new Promise((resolve, reject) => {
                    const t = db.transaction([storeName], "readwrite"); 
                    t.oncomplete = resolve; // Esperar transação completar
                    t.onabort = () => reject(new Error(`Transação abortada (Add Complex): ${t.error?.message || 'desconhecido'}`)); 
                    t.onerror = () => reject(t.error || new Error('Erro na transação (Add Complex)'));
                    const s = t.objectStore(storeName);
                    s.put({ id: 'blob_test_s1_module', data: blobData }); // put pode dar erro, mas o erro da transação pegaria
                    s.put({ id: 'buffer_test_s1_module', data: bufferData });
                });
                addComplexOK = true;
                logS1("Adicionar/Put Blob e ArrayBuffer parece OK.", 'good', FNAME);
            } catch(eAddComplex) {
                logS1(`Erro ao adicionar/put Blob/ArrayBuffer: ${eAddComplex?.message || String(eAddComplex)}`, 'error', FNAME);
                errorMsg = errorMsg || `Add complex failed: ${eAddComplex?.message || String(eAddComplex)}`;
            }
        }
    } catch (e) {
        logS1(`Erro GERAL no teste IndexedDB (${dbName}): ${e?.message || String(e)}`, 'error', FNAME);
        if (!errorMsg) errorMsg = e?.message || String(e);
        console.error(`IndexedDB Error S1 (${dbName}):`, e);
    } finally {
        logS1("Fechando conexão IndexedDB (se aberta)...", 'info', FNAME);
        try { if (db) db.close(); } catch (e) { /* silencioso */ }
        db = null;
        logS1(`--- Teste 9 Concluído (Add Simples: ${addOK}, Get: ${getOK}, Del: ${deleteOK}, Add Complex: ${addComplexOK}, Erro: ${!!errorMsg}) ---`, 'test', FNAME);
    }
}
