// js/config.mjs

// Firmware: PS4 12.02 (inferido)
// !! VOCÊ DEVE VALIDAR E REFINAR ESTES OFFSETS CUIDADOSAMENTE NO SEU DISASSEMBLER !!
export const JSC_OFFSETS = {
    JSCell: {
        STRUCTURE_POINTER_OFFSET: "0x8", // CANDIDATO: Ponteiro para a estrutura Structure
        STRUCTURE_ID_OFFSET: "0x00", 
        FLAGS_OFFSET: "0x04"       
    },

    Structure: {
        GLOBAL_OBJECT_OFFSET: "0x00",        
        PROTOTYPE_OFFSET: "0x08",            
        TYPE_INFO_FLAGS_OFFSET: "0x10",      
        INDEXING_TYPE_AND_MISC_OFFSET: "0x18", 
        CLASS_INFO_OFFSET: "0x1C",           
        VIRTUAL_PUT_OFFSET: "0x18",          
    },

    JSObject: {
        BUTTERFLY_OFFSET: "0x10", 
    },

    ArrayBuffer: {
        // Ponteiro para a estrutura interna ArrayBufferContents (ou m_impl)
        // Relativo ao início do objeto JSArrayBuffer.
        CONTENTS_IMPL_POINTER_OFFSET: "0x10", // VALIDE ESTE OFFSET!

        // Offset do campo de tamanho DENTRO do próprio objeto JSArrayBuffer
        // (pode ser o tamanho alocado ou o tamanho visível pelo JS, valide qual é qual)
        SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: "0x18", // VALIDE ESTE OFFSET!

        // Offsets especulativos (verifique se são relevantes para sua versão do JSC)
        SHARING_MODE_OFFSET: "0x28",
        IS_RESIZABLE_FLAGS_OFFSET: "0x30"
    },

    // Nova seção para a estrutura interna ArrayBufferContents
    // Offsets relativos ao início da estrutura ArrayBufferContents
    ArrayBufferContents: {
        // Offset do campo de tamanho (m_byteLength) DENTRO de ArrayBufferContents
        SIZE_IN_BYTES_OFFSET: "0x08", // VALIDE ESTE OFFSET! É COMUM SER 0x8 OU 0x04.
        // DATA_POINTER_OFFSET: "0x00" // Offset do ponteiro de dados (m_data) DENTRO de ArrayBufferContents (VALIDE!) - Não usado diretamente neste teste.
    },

    ArrayBufferView: { 
        STRUCTURE_ID_OFFSET: "0x00",           
        FLAGS_OFFSET: "0x04",                  
        ASSOCIATED_ARRAYBUFFER_OFFSET: "0x08", 
        M_VECTOR_OFFSET: "0x10",               
        M_LENGTH_OFFSET: "0x18",               
        M_MODE_OFFSET: "0x1C"                  
    },

    JSFunction: {
        M_EXECUTABLE_OFFSET: "0x20", 
        M_SCOPE_OFFSET: "0x28",      
    },

    SymbolObject: {
        PRIVATE_SYMBOL_POINTER_OFFSET: "0x10", 
    }
};

// VALORES NUMÉRICOS REAIS (HEX) PRECISAM SER EXTRAÍDOS DA SUA ANÁLISE!
export const KNOWN_STRUCTURE_IDS = {
    TYPE_ARRAY_BUFFER: "0xFILL_ME_IN_ARRAYBUFFER_ID",
    // ... outros IDs ...
};

// ... resto do seu WEBKIT_LIBRARY_INFO ...
export const WEBKIT_LIBRARY_INFO = {
    MODULE_NAME: "libSceNKWebkit.sprx", 
    KNOWN_OFFSETS: {},
    GOT_ENTRIES: {
         "mprotect": "0x3CBD820", 
    },
    FUNCTION_OFFSETS: { 
        "JSC::JSFunction::create": "0x58A1D0",
        // ... adicione todos os seus offsets de função aqui ...
        "gadget_lea_rax_rdi_plus_20_ret": "0x58B860",
    }
};


export let OOB_CONFIG = {ALLOCATION_SIZE: 32768, BASE_OFFSET_IN_DV: 128, INITIAL_BUFFER_SIZE: 32};

export function updateOOBConfigFromUI(docInstance) {
    if (!docInstance) return;
    const oobAllocSizeEl = docInstance.getElementById('oobAllocSize');
    const baseOffsetEl = docInstance.getElementById('baseOffset');
    const initialBufSizeEl = docInstance.getElementById('initialBufSize');

    if (oobAllocSizeEl && oobAllocSizeEl.value !== undefined) {
        const val = parseInt(oobAllocSizeEl.value, 10);
        if (!isNaN(val) && val > 0) OOB_CONFIG.ALLOCATION_SIZE = val;
    }
    if (baseOffsetEl && baseOffsetEl.value !== undefined) {
        const val = parseInt(baseOffsetEl.value, 10);
        if (!isNaN(val) && val >= 0) OOB_CONFIG.BASE_OFFSET_IN_DV = val;
    }
    if (initialBufSizeEl && initialBufSizeEl.value !== undefined) {
        const val = parseInt(initialBufSizeEl.value, 10);
        if (!isNaN(val) && val > 0) OOB_CONFIG.INITIAL_BUFFER_SIZE = val;
    }
}
