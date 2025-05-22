// js/config.mjs

// Firmware: PS4 12.02 (inferido)
// !! VOCÊ DEVE VALIDAR E REFINAR ESTES OFFSETS CUIDADOSAMENTE NO SEU DISASSEMBLER !!
export const JSC_OFFSETS = {
    JSCell: {
        // Baseado na análise de `byteLength.txt` (JSObjectGetArrayBufferByteLength)
        // onde `[rsi+5]` é comparado e depois `[rsi+18h]` é usado para ArrayBuffers,
        // e no seu config anterior:
        STRUCTURE_ID_OFFSET: 0x0, // Assumindo ID numérico nos primeiros 4 bytes da célula
                                   // ou ponteiro para Structure nos primeiros 8 bytes.
                                   // Se for ponteiro para Structure, o ID estará DENTRO da Structure.
        // FLAGS_OFFSET: 0x4, // Se ID for uint32_t
        STRUCTURE_POINTER_OFFSET: 0x8, // Alternativa: se os primeiros 8 bytes são vtable, e 0x8 é Structure*

        // Outros campos comuns (ajuste conforme necessário):
        BUTTERFLY_POINTER_OFFSET: 0x8, // Ou 0x10 dependendo da arquitetura e flags da célula
    },
    ArrayBuffer: {
        // Ponteiro para ArrayBufferContents (m_impl)
        // O disassembly de `byteLength.txt` sugere que `[rsi+18h]` (rsi = JSCell*) é usado para obter o tamanho
        // para ArrayBuffers (não Views). Este pode ser o byteLength diretamente, ou m_impl.
        // Seu config anterior tinha 0x10 para CONTENTS_IMPL_POINTER_OFFSET e 0x18 para BYTE_LENGTH_OFFSET_FROM_CELL
        // Vamos manter a ideia de um m_impl que contém o tamanho e o ponteiro de dados.
        CONTENTS_IMPL_POINTER_OFFSET: 0x10, // Offset do ponteiro para ArrayBufferContents a partir do JSCell* do ArrayBuffer
        
        // Se o byteLength estivesse diretamente na célula do ArrayBuffer (menos comum para ABs modernos):
        // BYTE_LENGTH_OFFSET_FROM_CELL: 0x18,
    },
    ArrayBufferContents: { // Estrutura apontada por ArrayBuffer.m_impl
        // Dentro desta estrutura, os offsets são relativos ao início de ArrayBufferContents
        DATA_POINTER_OFFSET: 0x0, // Offset do ponteiro de dados (m_vector / m_data)
        SIZE_OFFSET: 0x8,         // Offset do tamanho (m_size / m_byteLength)
        // Pode haver outros campos como capacity, allocator pointer, etc.
    },
    ArrayBufferView: { // Para TypedArrays, DataView
        VECTOR_POINTER_OFFSET: 0x10, // m_vector (dados) em JSArrayBufferView (TypedArray, DataView)
        LENGTH_OFFSET: 0x18,       // m_length (elementos) em JSArrayBufferView
        MODE_OFFSET: 0x1C,         // m_mode (WastefulSharing, FastTLS) em JSArrayBufferView
        BUFFER_POINTER_OFFSET: 0x20, // Ponteiro para o JSCell do ArrayBuffer subjacente
    },
    JSObject: { // Offsets gerais para JSObject
        BUTTERFLY_OFFSET_FROM_CELL: 0x10, // Ou 0x8, dependendo da arquitetura/config
    },
    // Adicione outros offsets que você descobrir para outras estruturas JSC
    // ...
    WebKitLibraries: {
        MODULE_LIBSCEWEBIT: "libSceNKWebKit.sprx",
        // GOT (Global Offset Table) entries:
        MPROTECT_GOT_LIBSCEWEBIT: "0x3CBD820", // De imp_mprotect.txt (ajuste se o ASLR da lib for diferente)

        // Function offsets within libSceNKWebKit (se souber, para ROP/JOP)
        // Estes são exemplos e precisam ser encontrados para sua versão específica:
        "JSC::JSValue::isString": "0x1256720",
        "JSC::JSValue::isSymbol": "0x126D940",
        "JSC::JSArray::getOwnPropertySlot": "0x2322630",
        "JSC::JSGlobalObject::visitChildren_JSCell": "0x1A5F740", // De JSGlobalObject visitChildren.txt
        "JSC::JSCallee::JSCallee_constructor": "0x2038D50",

        // Gadgets ROP/JOP que você encontrar:
        "gadget_lea_rax_rdi_plus_20_ret": "0x58B860",
        // Adicione mais gadgets aqui
    }
};

// IDs de Estrutura Conhecidos (Numéricos)
// PREENCHA ESTES VALORES COM OS IDs REAIS DA SUA VERSÃO DO JSC!
// Você pode tentar descobri-los com um script de diagnóstico (como o readStructureIDs.mjs que você tinha).
export const KNOWN_STRUCTURE_IDS = {
    // Exemplo: Se o ID numérico para um ArrayBuffer for 1234
    ArrayBuffer: null, // SUBSTITUA 'null' PELO ID NUMÉRICO REAL
    // Uint8Array: null,
    // DataView: null,
    // JSObject: null,
    // JSFunction: null,
    // etc.
};


// Configuração para testes Out-of-Bounds (OOB)
// Estes podem ser ajustados pela UI se a função updateOOBConfigFromUI for chamada.
export let OOB_CONFIG = {
    ALLOCATION_SIZE: 32768,     // Tamanho do oob_array_buffer_real
    BASE_OFFSET_IN_DV: 128,     // Offset base dentro do DataView para começar as leituras/escritas OOB
    INITIAL_BUFFER_SIZE: 32     // Tamanho inicial do buffer usado para acionar a vulnerabilidade OOB (se aplicável)
};

// Função para atualizar OOB_CONFIG a partir da UI (se você tiver inputs para isso)
export function updateOOBConfigFromUI(docInstance) {
    if (!docInstance) return;
    const oobAllocSizeEl = docInstance.getElementById('oobAllocSize'); // Precisa de input com id="oobAllocSize"
    const baseOffsetEl = docInstance.getElementById('baseOffset');   // Precisa de input com id="baseOffset"
    const initialBufSizeEl = docInstance.getElementById('initialBufSize'); // Precisa de input com id="initialBufSize"

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
