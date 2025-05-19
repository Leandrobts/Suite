// js/config.mjs

// ... (outras exportações como JSC_OFFSETS, WEBKIT_LIBRARY_INFO devem estar aqui) ...

export let OOB_CONFIG = {ALLOCATION_SIZE: 32768, BASE_OFFSET_IN_DV: 128, INITIAL_BUFFER_SIZE: 32};

// GARANTA QUE ESTA FUNÇÃO ESTEJA DEFINIDA E EXPORTADA ASSIM:
export function updateOOBConfigFromUI(docInstance) { // docInstance será o 'document' passado por core_exploit.mjs
    if (!docInstance) {
        console.warn("updateOOBConfigFromUI chamada sem instância de documento.");
        return;
    }
    // Os IDs dos elementos abaixo ('oobAllocSize', 'baseOffset', 'initialBufSize')
    // precisam existir no seu HTML para que esta função possa ler os valores da UI.
    // Se não existirem, getElementById retornará null, e nada será atualizado,
    // mas não causará o erro de "does not provide an export".
    const oobAllocSizeEl = docInstance.getElementById('oobAllocSize');
    const baseOffsetEl = docInstance.getElementById('baseOffset');
    const initialBufSizeEl = docInstance.getElementById('initialBufSize');

    if (oobAllocSizeEl && oobAllocSizeEl.value !== undefined) {
        const val = parseInt(oobAllocSizeEl.value, 10);
        if (!isNaN(val) && val > 0) {
            OOB_CONFIG.ALLOCATION_SIZE = val;
        }
    }
    if (baseOffsetEl && baseOffsetEl.value !== undefined) {
        const val = parseInt(baseOffsetEl.value, 10);
        if (!isNaN(val) && val >= 0) { // Base offset pode ser 0
            OOB_CONFIG.BASE_OFFSET_IN_DV = val;
        }
    }
    if (initialBufSizeEl && initialBufSizeEl.value !== undefined) {
        const val = parseInt(initialBufSizeEl.value, 10);
        if (!isNaN(val) && val > 0) {
            OOB_CONFIG.INITIAL_BUFFER_SIZE = val;
        }
    }
    // Você pode adicionar um log aqui para confirmar que OOB_CONFIG foi atualizado, se desejar.
    // console.log('[config.mjs] OOB_CONFIG atualizado:', OOB_CONFIG);
}

// ... (o restante do seu config.mjs) ...
