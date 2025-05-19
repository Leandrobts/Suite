// js/config.mjs

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
        STRUCTURE_ID_OFFSET: 0x00,          // Assumindo que Structure herda de JSCell.
        FLAGS_OFFSET: 0x04,                 // Idem.
        CLASS_INFO_OFFSET: "0x08",          // Confirmado por JSC Structure.txt (construtor): mov [rdi_this_Structure_ptr + 8], rbx_classInfo_ptr
        PROTOTYPE_OFFSET: "0x1C",           // Nova estimativa de JSC Structure.txt (construtor): mov [rdi_this_Structure_ptr + 1Ch], r12d_prototype_JSValue
                                            // O anterior 0x10 era de emptyStructureForPrototypeFromBaseStructure, este de Structure() parece mais direto. VERIFIQUE!
        GLOBAL_OBJECT_OFFSET: "0x20",       // Confirmado por JSC Structure.txt (construtor): mov [rdi_this_Structure_ptr + 20h], r15_globalObject_ptr
    }
};

// Informações da biblioteca WebKit (ou NKWebKit)
export const WEBKIT_LIBRARY_INFO = {
    LIBRARY_NAME: "libSceNKWebkit.sprx",
    // SEGMENTS: [...]

    // Estes são os OFFSETS RELATIVOS estimados.
    // !! VERIFIQUE ESTA SUPOSIÇÃO E OS VALORES NO IDA PRO COM BASE 0x0 !!
    KNOWN_OFFSETS: {
        VTable_Possible_Offsets: [
            { name: "JSC::Uint32Array::VTABLE", offset: "0x3AE5300" },
            // Adicione mais VTables de Symbol2.txt e outros arquivos
        ],
        STRINGS: {
            // "SymbolSearchString": "0xOFFSET_RELATIVO_DE_[Symbol.search]", // Ainda não encontrado
        },
        // Entradas da GOT (Global Offset Table) ou similar
        // O valor aqui é o offset para o ponteiro, não para a função em si.
        // Em ROP, você leria o valor deste endereço para obter o ponteiro real para a função importada.
        GOT_ENTRIES: {
             "__imp_mprotect": "0x3CBD820", // De imp_mprotect.txt (entrada da GOT para mprotect)
        }
    },

    FUNCTION_OFFSETS: { // OFFSETS RELATIVOS estimados
        // Funções críticas para exploit
        "mprotect_stub": "0x1A08",       // De mprotect.txt (é um JMP para __imp_mprotect)

        // Funções do WebKit/JSC
        "WTF::StringImpl::destroy": "0x10AA800",
        "bmalloc::Scavenger::schedule": "0x02EBDB0",
        "WebCore::JSDOMGlobalObject::visitChildren": "0x06CEB60",
        "JSC::JSGlobalObject::visitChildren": "0x1A5F740",
        "WTF::fastMalloc": "0x1271810",
        "WTF::fastFree": "0x230C7D0",
        "JSC::JSFunction::create": "0x58A1D0",
        "JSC::JSObject::put": "0x0BD68B0",
        "JSC::JSObject::putByIndex": "0x1EB3B00",
        "JSValueIsSymbol": "0x126D940",
        "JSC::ArrayBuffer::create_from_arraybuffercontents": "0x10E5320", // De "JSC ArrayBuffer.txt" (create from ArrayBufferContents&&)
        "JSC::ArrayBuffer::tryCreate_from_size": "0x170A6B0",
        "JSC::ArrayBuffer::data": "0x170A870",
        "JSC::StructureCache::emptyStructureForPrototypeFromBaseStructure": "0x0CCF870",
        "JSC::Structure::create_constructor": "0x1638A50", // De "JSC Structure.txt" (JSC::Structure::Structure(...))

        "memset_stub_in_webkit": "0x238",
    }
};

// Configuração para a primitiva Out-Of-Bounds (OOB)
export let OOB_CONFIG = {ALLOCATION_SIZE: 32768, BASE_OFFSET_IN_DV: 128, INITIAL_BUFFER_SIZE: 32};
export function updateOOBConfigFromUI(document) { // Pass document as an argument
    const oobAllocSizeEl = document.getElementById('oobAllocSize');
    const baseOffsetEl = document.getElementById('baseOffset');
    const initialBufSizeEl = document.getElementById('initialBufSize');

    if (oobAllocSizeEl) {
        const val = parseInt(oobAllocSizeEl.value, 10);
        if (!isNaN(val) && val > 0) OOB_CONFIG.ALLOCATION_SIZE = val;
    }
    if (baseOffsetEl) {
        const val = parseInt(baseOffsetEl.value, 10);
        if (!isNaN(val) && val >= 0) OOB_CONFIG.BASE_OFFSET_IN_DV = val;
    }
    if (initialBufSizeEl) {
        const val = parseInt(initialBufSizeEl.value, 10);
        if (!isNaN(val) && val > 0) OOB_CONFIG.INITIAL_BUFFER_SIZE = val;
    }
}
