// js/script3/rop_builder.mjs
import { logS3 } from './s3_utils.mjs';
import { getRopGadgetsInput, getRopChainInput } from '../dom_elements.mjs';
import { AdvancedInt64 } from '../utils.mjs';

export function buildRopChain() { // Renomeado para corresponder ao HTML original
    const FNAME = "buildRopChain";
    logS3("--- Construtor de Cadeia ROP (Conceitual) ---", "tool", FNAME);
    
    const gadgetsInputEl = getRopGadgetsInput();
    const chainInputEl = getRopChainInput();

    if (!gadgetsInputEl || !chainInputEl) {
        logS3("Elementos de input ROP não encontrados.", "error", FNAME);
        return;
    }
    const gadgetsInput = gadgetsInputEl.value.trim();
    const chainInput = chainInputEl.value.trim();

    if (!gadgetsInput || !chainInput) {
        logS3("Entrada de gadgets ou cadeia ROP está vazia.", "warn", FNAME);
        return;
    }

    const gadgetMap = new Map();
    try {
        gadgetsInput.split('\n').forEach(line => {
            if (line.trim()) {
                const parts = line.split('=');
                if (parts.length === 2) {
                    const addr = new AdvancedInt64(parts[0].trim());
                    gadgetMap.set(parts[1].trim(), addr);
                }
            }
        });
        logS3(`Gadgets carregados: ${gadgetMap.size}`, "info", FNAME);
        gadgetMap.forEach((addr, name) => logS3(`  ${name} : ${addr.toString(true)}`, "info"));

    } catch (e) {
        logS3(`Erro ao processar gadgets: ${e.message}`, "error", FNAME);
        return;
    }

    const ropChain = [];
    const chainSteps = chainInput.split('\n');
    let validChain = true; // Não usado no original, mas bom para ter

    logS3("Construindo cadeia ROP:", "info", FNAME);
    for (const step of chainSteps) {
        const trimmedStep = step.trim();
        if (!trimmedStep) continue;

        if (gadgetMap.has(trimmedStep)) { 
            const gadgetAddr = gadgetMap.get(trimmedStep);
            ropChain.push(gadgetAddr);
            logS3(`  [GADGET] ${trimmedStep} -> ${gadgetAddr.toString(true)}`, "info", FNAME);
        } else { 
            try {
                const value = trimmedStep.toLowerCase().startsWith("0x") ? new AdvancedInt64(trimmedStep) : new AdvancedInt64(parseInt(trimmedStep));
                ropChain.push(value);
                logS3(`  [VALOR]  ${trimmedStep} -> ${value.toString(true)}`, "info", FNAME);
            } catch (e) {
                logS3(`AVISO: '${trimmedStep}' não é um gadget conhecido nem um valor numérico válido. Tratando como string.`, "warn", FNAME);
                ropChain.push(trimmedStep); 
            }
        }
    }

    if (ropChain.length > 0) {
        logS3("Cadeia ROP construída (endereços/valores):", "good", FNAME);
        ropChain.forEach((item, index) => {
            logS3(`    ${index}: ${(item instanceof AdvancedInt64) ? item.toString(true) : item}`, "info");
        });
        logS3("Nota: Esta é uma representação. A execução real requereria controle do ponteiro de stack (RSP) e um 'ret' inicial.", "info", FNAME);
    } else {
        logS3("Nenhuma cadeia ROP construída.", "warn", FNAME);
    }
}
