// js/script2/testWebGLCheck.mjs
import { logS2, PAUSE_S2 } from './s2_utils.mjs';
import { getInteractiveCanvasS2 } from '../dom_elements.mjs';
import { setCanvasContextS2 } from '../state.mjs'; // To store gl context if needed by other S2 modules

export async function testWebGLCheckS2() {
    const FNAME = 'testWebGLCheckS2';
    logS2("--- Teste: Verificação WebGL ---", 'test', FNAME);
    
    const canvasElement = getInteractiveCanvasS2();
    if (!canvasElement) {
        logS2("Elemento canvas não encontrado para WebGL check.", "error", FNAME);
        return { glContext: null, isWebGL2: false };
    }

    let glContext = null;
    let isWebGL2 = false;

    try {
        glContext = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
        if (glContext) {
            const glVersion = glContext.getParameter(glContext.VERSION);
            logS2(`WebGL OK! V:${String(glVersion).substring(0,30)}`, 'good', FNAME);
            try {
                let gl2 = canvasElement.getContext('webgl2');
                if (gl2) {
                    const gl2Version = gl2.getParameter(gl2.VERSION);
                    logS2(`WebGL2 OK! V:${String(gl2Version).substring(0,30)}`, 'good', FNAME);
                    isWebGL2 = true;
                    glContext = gl2; // Prioritize WebGL2
                } else {
                    logS2("WebGL2 não disponível.", 'good', FNAME);
                }
            } catch (e2) {
                logS2("WebGL2 não disponível (erro check).", 'good', FNAME);
            }
        } else {
            logS2('WebGL N/A.', 'good', FNAME);
        }
    } catch (e) {
        logS2(`Erro ao verificar WebGL: ${e.message}`, 'error', FNAME);
        console.error(e);
        glContext = null;
    }
    
    setCanvasContextS2(glContext); // Store for potential use by other S2 modules

    logS2(`--- Teste Verificação WebGL Concluído (Ativo: ${!!glContext}, WebGL2: ${isWebGL2}) ---`, 'test', FNAME);
    await PAUSE_S2();
    return { glContext, isWebGL2 };
}
