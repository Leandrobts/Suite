// js/script1/runAllTestsS1.mjs
import { logS1, PAUSE_S1, MEDIUM_PAUSE_S1 } from './s1_utils.mjs';
import { getOutputDivS1, getRunBtnS1 } from '../dom_elements.mjs';

// Import individual test functions
import { testCSPBypassS1 } from './testCSPBypass.mjs';
import { testOOBReadInfoLeakEnhancedStoreS1 } from './testOOBReadInfoLeak.mjs';
// ... import other S1 tests here:
// import { testOOBUAFPatternS1 } from './testOOBUAFPattern.mjs'; 
// import { testOOBOtherTypesS1 } from './testOOBOtherTypes.mjs';
// import { testBasicPPS1 } from './testBasicPP.mjs';
// import { testPPJsonHijackS1 } from './testPPJsonHijack.mjs';
// import { testWebSocketsS1 } from './testWebSockets.mjs';
// import { testWebWorkersS1 } from './testWebWorkers.mjs';
// import { testIndexedDBS1 } from './testIndexedDB.mjs';
// import { testDOMStressS1 } from './testDOMStress.mjs';


export async function runAllTestsS1() {
    const FNAME = 'runAllTestsS1';
    const runBtn = getRunBtnS1();
    const outputDiv = getOutputDivS1();

    if (runBtn) runBtn.disabled = true;
    if (outputDiv) outputDiv.innerHTML = '';
    
    logS1("==== INICIANDO Script 1 (Modular - Exemplos) ====", 'test', FNAME);
    
    await testCSPBypassS1(); 
    await PAUSE_S1(MEDIUM_PAUSE_S1);
    
    await testOOBReadInfoLeakEnhancedStoreS1(); 
    await PAUSE_S1(MEDIUM_PAUSE_S1);

    // Call other imported S1 tests here in sequence
    // logS1("AVISO: Outros testes do Script 1 não implementados nesta demo modular.", "warn", FNAME);
    // await testOOBUAFPatternS1(); await PAUSE_S1(MEDIUM_PAUSE_S1);
    // ...

    logS1("\n==== Script 1 CONCLUÍDO (Modular - Exemplos) ====", 'test', FNAME);
    if (runBtn) runBtn.disabled = false;
}
