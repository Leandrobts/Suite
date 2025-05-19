// js/tests/s1/testPPJsonHijackS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC, toHex } from '../../utils.mjs';
import { getLeakedValueS1 } from '../../state.mjs'; // Importa o getter

const SHORT_PAUSE_S1 = 50;

export async function testPPJsonHijackS1() {
    const FNAME = 'testPPJsonHijackS1';
    logS1("--- Iniciando Teste 6: PP Hijack (JSON.stringify) ---", 'test', FNAME);
    const originalJSONStringify = JSON.stringify;
    let hijackExecuted = false;
    let returnValueVerified = false;
    let leakReadSuccess = false;

    try {
        JSON.stringify = function hijackedJSONStringify(value, replacer, space) {
            hijackExecuted = true;
            logS1("===> VULN: JSON.stringify SEQUESTRADO! <===", 'vuln', FNAME);

            const currentLeakedValue = getLeakedValueS1(); // <<< USANDO O ESTADO GLOBAL
            let leakedStr = "NULO ou Indefinido (do estado global)";
            if (currentLeakedValue) {
                leakedStr = currentLeakedValue.type === 'U64' ?
                    `U64 H=${toHex(currentLeakedValue.high)} L=${toHex(currentLeakedValue.low)}@${currentLeakedValue.offset}` :
                    `U32 ${toHex(currentLeakedValue.low)}@${currentLeakedValue.offset}`;
                leakReadSuccess = true;
                logS1(` ---> INFO: Interação Hijack + OOB Read Leak OK. Leu: ${leakedStr}`, 'escalation', FNAME);
            } else {
                logS1(` -> Nenhum valor OOB encontrado no estado global para exibir no hijack.`, 'warn', FNAME);
            }
            
            const hijackReturnValue = { "hijacked": true, "leak_read_success_flag": leakReadSuccess, "data_seen_by_hijack": value };
            return originalJSONStringify(hijackReturnValue); // Stringify o objeto de hijack com o original
        };
        
        await PAUSE_FUNC(SHORT_PAUSE_S1);
        const testObject = { a: 1, b: 'test_pp_json_payload' };
        const resultString = JSON.stringify(testObject); 
        
        if (hijackExecuted) {
            try {
                const parsedResult = JSON.parse(resultString); // Se o hijack retornou JSON válido
                if (parsedResult && parsedResult.hijacked === true) {
                    logS1("VULN: Retorno da função JSON.stringify sequestrada verificado!", 'vuln', FNAME);
                    returnValueVerified = true;
                    if (parsedResult.leak_read_success_flag) {
                        logS1(" -> E o leak foi lido com sucesso durante o hijack.", 'good', FNAME);
                    }
                    if (parsedResult.data_seen_by_hijack && parsedResult.data_seen_by_hijack.b === 'test_pp_json_payload') {
                        logS1(" -> Dados originais corretamente passados para a função hijackada.", 'good', FNAME);
                    }
                } else {
                     logS1("AVISO: JSON.stringify sequestrado, mas o retorno não tem a flag 'hijacked:true'.", 'warn', FNAME);
                }
            } catch(e) {
                logS1(`AVISO: JSON.stringify sequestrado, mas o retorno não é um JSON válido: "${resultString}". Erro: ${e.message}`, 'warn', FNAME);
            }
        } else {
            logS1("JSON.stringify não foi sequestrado.", 'good', FNAME);
        }

    } catch (e) {
        logS1(`Erro fatal durante Teste 6: ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        // Restaurar JSON.stringify original
        if (JSON.stringify !== originalJSONStringify) {
            JSON.stringify = originalJSONStringify;
            if (JSON.stringify === originalJSONStringify) {
                logS1("JSON.stringify restaurado.", 'good', 'Cleanup');
            } else {
                logS1("ERRO CRÍTICO: FALHA ao restaurar JSON.stringify!", 'critical', 'Cleanup');
            }
        }
    }
    logS1(`--- Teste 6 Concluído (Hijack: ${hijackExecuted}, Retorno Verif.: ${returnValueVerified}, Leitura Leak: ${leakReadSuccess}) ---`, 'test', FNAME);
    return hijackExecuted && returnValueVerified; // leakReadSuccess é mais uma observação
}
