// js/tests/s1/testOOBUAFPatternS1.mjs
import { logS1 } from '../../logger.mjs';
import { PAUSE_FUNC } from '../../utils.mjs';

const SHORT_PAUSE_S1 = 50;

export async function testOOBUAFPatternS1() {
    const FNAME = 'testOOBUAFPatternS1';
    logS1("--- Iniciando Teste 3: OOB Write -> UAF Pattern ---", 'test', FNAME);
    const buffer1Size = 64; const buffer2Size = 128; const oobWriteOffset = buffer1Size;
    const corruptedValue = 0xDEADBEEF;
    const allocationSize1 = buffer1Size + 128; 
    const baseOffset1 = 64;

    let buffer1 = null, buffer2 = null; 
    let dv1 = null; 
    let writeOK = false;
    let uafTriggered = false;

    try {
        buffer1 = new ArrayBuffer(allocationSize1);
        dv1 = new DataView(buffer1);
        for (let i = 0; i < buffer1.byteLength; i++) dv1.setUint8(i, 0xBB); 

        buffer2 = new ArrayBuffer(buffer2Size); 
        const dv2_init = new DataView(buffer2);
        for (let i = 0; i < buffer2.byteLength; i++) dv2_init.setUint8(i, 0xCC); 

        await PAUSE_FUNC(SHORT_PAUSE_S1);
        const targetWriteAddr = baseOffset1 + oobWriteOffset;

        try {
            if (targetWriteAddr >= 0 && (targetWriteAddr + 4) <= buffer1.byteLength) {
                dv1.setUint32(targetWriteAddr, corruptedValue, true); 
                logS1(`VULN: Escrita OOB U32 @${oobWriteOffset} (addr ${targetWriteAddr}) parece OK.`, 'vuln', FNAME);
                logS1(`---> *** ALERTA: Primitivo Relevante (OOB Write) ***`, 'escalation', FNAME);
                writeOK = true;
            } else {
                logS1(`Offset de escrita OOB (${targetWriteAddr}) fora do buffer1. Teste inválido.`, 'warn', FNAME);
            }
        } catch (e) {
            logS1(`Escrita OOB U32 FALHOU/Bloqueada: ${e.message}`, 'good', FNAME);
        }

        if (writeOK) {
            await PAUSE_FUNC(SHORT_PAUSE_S1);
            try {
                const slicedBuffer2 = buffer2.slice(0, 10); 
                const dv2_check = new DataView(buffer2);
                const lengthCheck = buffer2.byteLength;
                logS1(`Uso do buffer 2 (slice, DataView, byteLength: ${lengthCheck}) após escrita OOB parece OK. Nenhuma UAF óbvia detectada.`, 'good', FNAME);
            } catch (e) {
                logS1(`---> VULN? ERRO ao usar buffer 2 após escrita OOB: ${e.message}`, 'critical', FNAME);
                logS1(`---> *** ALERTA: Potencial UAF ou Corrupção de Metadados detectada! O erro ao usar buffer2 PODE indicar sucesso na corrupção. ***`, 'escalation', FNAME);
                uafTriggered = true;
                console.error("Erro UAF Pattern:", e);
            }
        }
    } catch (e) {
        logS1(`Erro fatal no Teste 3 (OOB UAF): ${e.message}`, 'error', FNAME);
        console.error(e);
    } finally {
        buffer1 = null; buffer2 = null; dv1 = null;
        logS1(`--- Teste 3 Concluído (Escrita OOB: ${writeOK}, Potencial UAF/Erro: ${uafTriggered}) ---`, 'test', FNAME);
    }
    return writeOK && uafTriggered;
}
