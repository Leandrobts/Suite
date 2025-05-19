// js/config.mjs

// Offsets para estruturas do JavaScriptCore (JSC) no ambiente alvo.
export const JSC_OFFSETS = { // <--- GARANTA QUE 'export' ESTEJA AQUI
    JSVALUE_TO_ARRAYBUFFER_OBJECT_POINTER_OFFSET: 0x10,
    ArrayBuffer: {
        CONTENTS_POINTER_OFFSET: 0x10,
        SIZE_IN_BYTES_OFFSET: 0x18,
        SHARING_MODE_OFFSET: 0x28,
        IS_RESIZABLE_FLAGS_OFFSET: 0x30
    },
    ArrayBufferView: {
        STRUCTURE_ID_OFFSET: 0x00,
        FLAGS_OFFSET: 0x04,
        ASSOCIATED_ARRAYBUFFER_OFFSET: 0x08,
        M_VECTOR_OFFSET: 0x10,
        M_LENGTH_OFFSET: 0x18,
        M_MODE_OFFSET: 0x1C
    },
    JSCell: {
        STRUCTURE_ID_OFFSET: 0x00,
        FLAGS_OFFSET: 0x04
    },
    JSFunction: {
        STRUCTURE_ID_OFFSET: 0x00,
        FLAGS_OFFSET: 0x04,
        M_EXECUTABLE_OFFSET: "0x20",
        M_SCOPE_OFFSET: "0x28",
    },
    Structure: {
        STRUCTURE_ID_OFFSET: 0x00,
        FLAGS_OFFSET: 0x04,
        CLASS_INFO_OFFSET: "0x08",
        PROTOTYPE_OFFSET: "0x1C",
        GLOBAL_OBJECT_OFFSET: "0x20",
    }
};

// Informações da biblioteca WebKit (ou NKWebKit) - SE VOCÊ IMPORTAR ISTO EM ALGUM LUGAR
export const WEBKIT_LIBRARY_INFO = {
    LIBRARY_NAME: "libSceNKWebkit.sprx",
    KNOWN_OFFSETS: {
        VTable_Possible_Offsets: [
            { name: "JSC::Uint32Array::VTABLE", offset: "0x3AE5300" },
        ],
        STRINGS: {},
        GOT_ENTRIES: {
             "__imp_mprotect": "0x3CBD820",
        }
    },
    FUNCTION_OFFSETS: {
        "mprotect_stub": "0x1A08",
        "WTF::StringImpl::destroy": "0x10AA800",
        // ... (outros offsets de função como no seu original)
        "memset_stub_in_webkit": "0x238",
    }
};

// Configuração para a primitiva Out-Of-Bounds (OOB)
export let OOB_CONFIG = {ALLOCATION_SIZE: 32768, BASE_OFFSET_IN_DV: 128, INITIAL_BUFFER_SIZE: 32};

// Função para atualizar OOB_CONFIG a partir da UI (se os elementos HTML existirem)
export function updateOOBConfigFromUI(docInstance) {
    if (!docInstance) {
        // console.warn("[config.mjs] updateOOBConfigFromUI chamada sem instância de documento.");
        return;
    }
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
        if (!isNaN(val) && val >= 0) {
            OOB_CONFIG.BASE_OFFSET_IN_DV = val;
        }
    }
    if (initialBufSizeEl && initialBufSizeEl.value !== undefined) {
        const val = parseInt(initialBufSizeEl.value, 10);
        if (!isNaN(val) && val > 0) {
            OOB_CONFIG.INITIAL_BUFFER_SIZE = val;
        }
    }
}
