// js/tests/s1/testDOMStressS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC } from '../../utils.mjs';

export async function testDOMStressS1() {
    const FNAME = 'testDOMStressS1';
    logS1("--- Iniciando Teste 10: DOM Stress ---", 'test', FNAME);
    const container = document.body;
    const elementCount = 200; const cycles = 5;
    let errors = 0;
    logS1(`Iniciando ${cycles} ciclos de stress com ${elementCount} elementos...`, 'info', FNAME);
    try {
        for (let c = 0; c < cycles; c++) {
            logS1(`Ciclo ${c + 1}/${cycles}...`, 'info', FNAME);
            const elements = [];
            for (let i = 0; i < elementCount; i++) {
                try {
                    const el = document.createElement('div');
                    el.textContent = `StressS1_Module-${c}-${i}`;
                    el.style.position = 'absolute'; 
                    el.style.left = `${(i * 5) % 300}px`;
                    el.style.top = `-${10 + (c*2)}px`; // Posicionar fora da tela para não poluir visualmente
                    el.style.color = `rgb(${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)},${Math.floor(Math.random()*255)})`;
                    container.appendChild(el);
                    elements.push(el);
                } catch (e) {
                    errors++;
                    logS1(`Erro ao criar/adicionar el ${i} no ciclo ${c+1}: ${e.message}`, 'warn', FNAME);
                }
            }
            await PAUSE_FUNC(50); 
            elements.forEach(el => {
                try {
                    if (el.parentNode === container) { 
                        container.removeChild(el);
                    }
                } catch(e) { errors++; }
            });
            await PAUSE_FUNC(10); 
        }
        logS1("Ciclos de stress concluídos.", 'good', FNAME);
    } catch (e) {
        logS1(`Erro GERAL durante DOM Stress: ${e.message}`, 'error', FNAME);
        errors++;
        console.error("DOM Stress Error S1 (Module):", e);
    } finally {
        logS1(`--- Teste 10 Concluído (Erros reportados: ${errors}) ---`, 'test', FNAME);
    }
}
