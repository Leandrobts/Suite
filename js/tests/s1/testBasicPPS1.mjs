// js/tests/s1/testBasicPPS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC } from '../../utils.mjs';

const SHORT_PAUSE_S1 = 50;

export async function testBasicPPS1() {
    const FNAME = 'testBasicPPS1';
    logS1("--- Iniciando Teste 5: PP (Básica) ---", 'test', FNAME);
    const prop = '__pp_basic_s1_module__'; 
    const val = 'Polluted_S1_Module!';
    let ok = false;
    let testObj = null;
    try {
        Object.prototype[prop] = val;
        await PAUSE_FUNC(SHORT_PAUSE_S1); 
        testObj = {};
        if (testObj[prop] === val) {
            logS1(`VULN: PP Básica OK! Objeto herdou a propriedade poluída '${prop}'.`, 'vuln', FNAME);
            ok = true;
        } else {
            logS1(`PP Básica falhou ou não detectada para '${prop}'.`, 'good', FNAME);
        }
    } catch (e) {
        logS1(`Erro durante teste PP Básico para '${prop}': ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        try {
            delete Object.prototype[prop]; 
        } catch(e){ logS1(`Erro ao limpar Object.prototype.${prop}: ${e.message}`, 'error', FNAME); }
    }
    logS1(`--- Teste 5 Concluído (PP Básica ${ok ? 'OK' : 'Falhou'}) ---`, 'test', FNAME);
    return ok;
}
