// js/tests/s1/testOOBReadInfoLeakS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC, toHex } from '../../utils.mjs';
import { setLeakedValueS1, getLeakedValueS1 } from '../../state.mjs';

const SHORT_PAUSE_S1 = 50;

// Funções auxiliares
const isPotentialPointer64S1 = (high, low) => {
    if (high === null || low === null || typeof high !== 'number' || typeof low !== 'number') return false;
    if (high === 0 && low === 0) return false;
    if (high === 0xFFFFFFFF && low === 0xFFFFFFFF) return false;
    if (high === 0xAAAAAAAA && low === 0xAAAAAAAA) return false;
    if (high === 0xAAAAAAEE && low === 0xAAAAAAAA) return false; 
    if (high === 0xAAAAAAAA && low === 0xAAAAAAEE) return false; 
    if (high === 0 && low < 0x100000) return false;
    return true;
};
const isPotentialData32S1 = (val) => {
    if (val === null || typeof val !== 'number') return false;
    val = val >>> 0;
    if (val === 0 || val === 0xFFFFFFFF || val === 0xAAAAAAAA || val === 0xAAAAAAEE) return false;
    if (val < 0x1000) return false;
    return true;
};

export async function testOOBReadInfoLeakS1() {
    const FNAME = 'testOOBReadInfoLeakS1';
    logS1("--- Iniciando Teste 2: OOB Write/Read (Leak) ---", 'test', FNAME);
    
    const bufferSize = 32; const writeValue = 0xEE; const oobWriteOffset = bufferSize;
    const readRangeStart = -64; const readRangeEnd = bufferSize + 64;
    const allocationSize = bufferSize + 256;
    const baseOffsetInBuffer = 128;

    let writeSuccess = false; let potentialLeakFoundCount = 0;
    let localLeakedValue = null; 

    try {
        const buffer = new ArrayBuffer(allocationSize);
        const dataView = new DataView(buffer);
        for (let i = 0; i < buffer.byteLength; i++) { dataView.setUint8(i, 0xAA); }
        const writeTargetAddress = baseOffsetInBuffer + oobWriteOffset;
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        try {
            if (writeTargetAddress < allocationSize) {
                 dataView.setUint8(writeTargetAddress, writeValue);
                 logS1(`VULN: Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) OK! Val=${toHex(writeValue, 8)}`, 'vuln', FNAME);
                 logS1(`---> *** ALERTA: Primitivo Relevante (OOB Write Simples) ***`, 'escalation', FNAME);
                 writeSuccess = true;
            } else {
                logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) estaria fora do ArrayBuffer alocado. Teste inválido.`, 'error', FNAME);
            }
        } catch (e) {
            logS1(`Escrita OOB U8 @${oobWriteOffset} (addr ${writeTargetAddress}) FALHOU/Bloqueada: ${e.message}`, 'good', FNAME);
            logS1(`--- Teste 2 Concluído (Escrita OOB Falhou) ---`, 'test', FNAME);
            setLeakedValueS1(null); 
            return false;
        }
        await PAUSE_FUNC(SHORT_PAUSE_S1);

        if (writeSuccess) {
            for (let readOffset = readRangeStart; readOffset < readRangeEnd; readOffset += 4) {
                const readTargetAddress = baseOffsetInBuffer + readOffset;
                const relOffsetStr = `@${readOffset} (addr ${readTargetAddress})`;

                if (localLeakedValue === null && readTargetAddress >= 0 && (readTargetAddress + 8) <= allocationSize) { 
                    try {
                        const low = dataView.getUint32(readTargetAddress, true);
                        const high = dataView.getUint32(readTargetAddress + 4, true);
                        if (isPotentialPointer64S1(high, low)) {
                            const vStr = `H=${toHex(high)} L=${toHex(low)}`;
                            logS1(` -> PTR? U64 ${relOffsetStr}: ${vStr}`, 'ptr', FNAME);
                            potentialLeakFoundCount++;
                            localLeakedValue = { high, low, type: 'U64', offset: readOffset, addr: readTargetAddress };
                            logS1(` -> VALOR U64 ARMAZENADO (localmente): ${vStr} ${relOffsetStr}.`, 'vuln', FNAME);
                            logS1(` ---> *** ALERTA: Primitivo Relevante (OOB Read Pointer Leak) ***`, 'escalation', FNAME);
                            logS1(` ---> INSIGHT: O valor vazado ${vStr} é um candidato a ponteiro...`, 'info', FNAME);
                        }
                    } catch (e) { /* Ignora */ }
                }
                 if (localLeakedValue === null && readTargetAddress >= 0 && (readTargetAddress + 4) <= allocationSize) { 
                     try {
                        const val32 = dataView.getUint32(readTargetAddress, true);
                        if (isPotentialData32S1(val32)) {
                            logS1(` -> Leak U32? ${relOffsetStr}: ${toHex(val32)}`, 'leak', FNAME);
                            potentialLeakFoundCount++;
                            localLeakedValue = { high: 0, low: val32, type: 'U32', offset: readOffset, addr: readTargetAddress };
                            logS1(` -> VALOR U32 ARMAZENADO (localmente): ${toHex(val32)} ${relOffsetStr}.`, 'vuln', FNAME);
                            logS1(` ---> *** ALERTA: Potencial Vazamento Info OOB Read U32 ***`, 'escalation', FNAME);
                        }
                        if (readOffset === oobWriteOffset && val32 === (writeValue | (0xAA << 8) | (0xAA << 16) | (0xAA << 24))) {
                             logS1(` -> Leu valor OOB escrito (${toHex(val32)}) ${relOffsetStr}! Confirma R/W.`, 'vuln', FNAME);
                        }
                    } catch (e) { /* Ignora */ }
                }
                if (readOffset % 32 === 0) await PAUSE_FUNC(1);
            }
        }
    } catch (e) {
        logS1(`Erro fatal no Teste 2: ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        setLeakedValueS1(localLeakedValue); 
        const finalLeakedValue = getLeakedValueS1(); // Confirmar o que foi setado
        const leakStatus = finalLeakedValue ? `1 valor ${finalLeakedValue.type} @${finalLeakedValue.offset} ARMAZENADO GLOBALMENTE` : 'nenhum valor armazenado globalmente';
        logS1(`--- Teste 2 Concluído (${potentialLeakFoundCount} leaks potenciais?, ${leakStatus}) ---`, 'test', FNAME);
    }
    return writeSuccess;
}
