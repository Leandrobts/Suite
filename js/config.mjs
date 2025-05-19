// js/config.mjs // (Assuming you might place it in a js/ directory for consistency)

// Offsets para estruturas do JavaScriptCore (JSC) no ambiente alvo.
// !! VOCÊ DEVE VERIFICAR E REFINAR ESTES OFFSETS CUIDADOSAMENTE NO SEU IDA PRO !!
// Os offsets internos de estruturas são relativos ao ponteiro do objeto.
export const JSC_OFFSETS = {
    JSVALUE_TO_ARRAYBUFFER_OBJECT_POINTER_OFFSET: 0x10,

    ArrayBuffer: {
        CONTENTS_POINTER_OFFSET: 0x10,
        SIZE_IN_BYTES_OFFSET: 0x18,
        // M_DATA_POINTER_OFFSET: 0x0, // Offset de m_data DENTRO de ArrayBufferContents.
        SHARING_MODE_OFFSET: 0x28,    // Especulativo
        IS_RESIZABLE_FLAGS_OFFSET: 0x30 // Especulativo
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
        // ... other offsets
        "memset_stub_in_webkit": "0x238",
    }
};

export let OOB_CONFIG = {ALLOCATION_SIZE: 32768, BASE_OFFSET_IN_DV: 128, INITIAL_BUFFER_SIZE: 32};

// This function would need access to 'document' which it doesn't have directly in a module
// unless 'document' is passed to it.
// For UI interaction, it's better to handle this in main.mjs or a UI-specific module.
/*
export function updateOOBConfigFromUI(document) { 
    const oobAllocSizeEl = document.getElementById('oobAllocSize');
    // ...
}
*/
// You can import JSC_OFFSETS, WEBKIT_LIBRARY_INFO, OOB_CONFIG from this 'config.mjs' 
// into any other .mjs file that needs them using:
// import { JSC_OFFSETS, WEBKIT_LIBRARY_INFO } from './path/to/config.mjs';
