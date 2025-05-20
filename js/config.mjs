// js/config.mjs

// Firmware: PS4 12.02
// OFFSETS VALIDADOS/REFINADOS COM BASE NA ANÁLISE DE DISASSEMBLY (ArrayBuffer.txt, JSON.txt, m_type...)
export const JSC_OFFSETS = {
    JSCell: {
        STRUCTURE_ID_OFFSET: 0x00,       // Offset do StructureID (uint32_t) dentro da JSCell. (Valide se é direto ou via Structure*)
        FLAGS_OFFSET: 0x04,            // Offset das Flags (uint32_t) dentro da JSCell. (Valide)
        STRUCTURE_POINTER_OFFSET: 0x8,   // Offset do ponteiro para a Structure (Structure*) dentro da JSCell. (Valide)
    },

    Structure: {
        // Offsets DENTRO do objeto JSC::Structure.
        // Estes precisam de validação profunda com seus binários.
        // TYPE_INFO_TYPE_OFFSET: 0x0A, // Exemplo do disassembly de JSC::Structure constructor [rdi+0Ah] = type. VALIDAR!
        // Outros campos importantes: ClassInfo*, prototype, etc.
    },

    JSObject: {
        BUTTERFLY_OFFSET: 0x10, // CANDIDATO comum. VALIDAR! (Ponteiro para propriedades/elementos)
    },

    ArrayBuffer: {
        // Offsets relativos ao início do objeto JSArrayBuffer.

        // Ponteiro para a estrutura interna ArrayBufferContents* (m_impl)
        // Confirmado por múltiplos disassemblies como [ArrayBufferBase+0x10]
        CONTENTS_IMPL_POINTER_OFFSET: 0x10,

        // Offset do *tamanho* (byteLength) do buffer, relativo ao início do JSArrayBuffer.
        // Análise de JSObjectGetArrayBufferByteLength indica:
        //   m_impl = JSArrayBufferBase[0x10]
        //   size = m_impl[0x20]
        // Portanto, size = JSArrayBufferBase[0x10 + 0x20] = JSArrayBufferBase[0x30]
        SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: 0x30, // ATUALIZADO!

        // Offset do *ponteiro para os dados brutos* (dataPointer), relativo ao início do JSArrayBuffer.
        // Análise de JSObjectGetArrayBufferBytesPtr indica:
        //   m_impl = JSArrayBufferBase[0x10]
        //   dataPtr = m_impl[0x10]
        // Portanto, dataPtr = JSArrayBufferBase[0x10 + 0x10] = JSArrayBufferBase[0x20]
        DATA_POINTER_OFFSET_FROM_JSARRAYBUFFER_START: 0x20,  // NOVO/ATUALIZADO!

        // SharingMode, isResizable, etc., provavelmente estão dentro de ArrayBufferContents
        // ou na TypeInfo da Structure.
    },

    ArrayBufferView: { // Como DataView, Uint8Array, etc.
        STRUCTURE_ID_OFFSET: 0x00,
        FLAGS_OFFSET: 0x04,
        ASSOCIATED_ARRAYBUFFER_OFFSET: 0x08, // Ponteiro para o JSArrayBuffer.
        M_VECTOR_OFFSET: 0x10,               // Ponteiro para os dados (geralmente o dataPointer do ArrayBuffer associado + byteOffset da view).
        M_LENGTH_OFFSET: 0x18,               // Comprimento da view (em elementos, não bytes, para TypedArrays).
        M_MODE_OFFSET: 0x1C
    },

    JSFunction: {
        M_EXECUTABLE_OFFSET: "0x20",
        M_SCOPE_OFFSET: "0x28",
    },

    SymbolObject: {
        PRIVATE_SYMBOL_POINTER_OFFSET: 0x10,
    }
};

// PREENCHA ESTES COM VALORES HEXADECIMAIS REAIS DOS SEUS BINÁRIOS!
export const KNOWN_STRUCTURE_IDS = {
    TYPE_ARRAY_BUFFER: "0xFILL_ME_IN_ARRAYBUFFER_ID",
    TYPE_JS_FUNCTION: "0xFILL_ME_IN_JSFUNCTION_ID",
    TYPE_JS_OBJECT_GENERIC: "0xFILL_ME_IN_JSOBJECT_ID",
    TYPE_JS_STRING: "0xFILL_ME_IN_JSSTRING_ID",
    // ... adicione mais conforme necessário
    TYPE_FAKE_TARGET_FOR_CONFUSION: "0xFILL_ME_IN_SOME_OTHER_ID",
};

export const WEBKIT_LIBRARY_INFO = { /* ... (mantenha o resto como estava) ... */ };
export let OOB_CONFIG = {ALLOCATION_SIZE: 32768, BASE_OFFSET_IN_DV: 128, INITIAL_BUFFER_SIZE: 32};
export function updateOOBConfigFromUI(docInstance) { /* ... (mantenha como estava) ... */ }
